/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
  BLUF_SYSTEM_PROMPT,
  NEWS_PARSING_SYSTEM_PROMPT,
  WEATHER_SYSTEM_PROMPT,
} from './src/utils/aiPrompts';
import { isServiceAlertTweet, isWithinLast24Hours } from './src/utils/catsFilters';
import { isCMSAlertTweet } from './src/utils/cmsFilters';

// In-memory TTL cache for dev plugins (mirrors KV caching in production)
interface DevCacheEntry {
  data: string;
  expiresAt: number;
}
const devCache = new Map<string, DevCacheEntry>();

function devCacheGet(key: string): string | null {
  const entry = devCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    devCache.delete(key);
    return null;
  }
  return entry.data;
}

function devCachePut(key: string, data: string, ttlMs: number): void {
  devCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Charlotte, NC coordinates and ~30 mile radius
const CHARLOTTE_LAT = 35.2271;
const CHARLOTTE_LNG = -80.8431;
const LAT_RADIUS = 0.44;
const LNG_RADIUS = 0.53;

interface DukeOutageListItem {
  sourceEventNumber: string;
  deviceLatitudeLocation: number;
  deviceLongitudeLocation: number;
}

interface DukeOutageDetail {
  sourceEventNumber: string;
  deviceLatitudeLocation: number;
  deviceLongitudeLocation: number;
  customersAffectedNumber?: number | string;
  customersAffectedSum?: number;
  estimatedRestorationTime?: string;
  crewStatTxt?: string;
  operationCenterName?: string;
  causeDescription?: string;
  outageCause?: string;
  convexHull?: { lat: number; lng: number }[] | null;
}

function isWithinCharlotteRadius(lat: number, lng: number): boolean {
  return Math.abs(lat - CHARLOTTE_LAT) <= LAT_RADIUS && Math.abs(lng - CHARLOTTE_LNG) <= LNG_RADIUS;
}

// Dev-only plugin to handle Duke outage enrichment
function dukeOutagePlugin(env: Record<string, string>): Plugin {
  return {
    name: 'duke-outage-enrichment',
    configureServer(server) {
      server.middlewares.use('/proxy/duke/outage-maps/v1/outages', async (req, res, next) => {
        // Only handle the list endpoint, not detail requests
        if (req.url?.includes('sourceEventNumber')) {
          return next();
        }

        const dukeAuth = env.DUKE_OUTAGE_AUTH;
        if (!dukeAuth) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Duke Energy API configuration missing' }));
          return;
        }

        const headers: Record<string, string> = {
          Accept: 'application/json',
          Authorization: dukeAuth,
        };

        try {
          // Step 1: Fetch list of all outages
          const listUrl =
            'https://prod.apigee.duke-energy.app/outage-maps/v1/outages?jurisdiction=DEC';
          const listResponse = await fetch(listUrl, { method: 'GET', headers });

          if (!listResponse.ok) {
            res.statusCode = listResponse.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to fetch outage list' }));
            return;
          }

          const listJson = (await listResponse.json()) as
            | { data?: DukeOutageListItem[] }
            | DukeOutageListItem[];
          // API may return { data: [...] } or raw array
          const listData = Array.isArray(listJson) ? listJson : listJson.data || [];

          // Step 2: Filter to outages within ~30 miles of Charlotte
          const nearbyOutages = listData.filter(outage =>
            isWithinCharlotteRadius(outage.deviceLatitudeLocation, outage.deviceLongitudeLocation)
          );

          if (nearbyOutages.length === 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ data: [], errorMessages: [] }));
            return;
          }

          // Step 3: Fetch details for each nearby outage in parallel
          const detailPromises = nearbyOutages.map(async outage => {
            try {
              const detailUrl = `https://prod.apigee.duke-energy.app/outage-maps/v1/outages/outage?jurisdiction=DEC&sourceEventNumber=${outage.sourceEventNumber}`;
              const detailResponse = await fetch(detailUrl, { method: 'GET', headers });

              if (!detailResponse.ok) {
                return outage;
              }

              const detailJson = (await detailResponse.json()) as { data: DukeOutageDetail };
              return detailJson.data;
            } catch {
              return outage;
            }
          });

          const enrichedOutages = await Promise.all(detailPromises);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: enrichedOutages, errorMessages: [] }));
        } catch (error) {
          console.error('[duke-outage-enrichment] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Failed to fetch Duke Energy outages',
              message: error instanceof Error ? error.message : String(error),
            })
          );
        }
      });
    },
  };
}

const OPENWEBNINJA_HOST = 'real-time-news-data.p.rapidapi.com';
const MAX_ARTICLES_TO_SEND = 100;

interface RawArticleForParse {
  title: string;
  snippet: string;
  published_datetime_utc: string;
  source_name: string;
  link: string;
  article_id?: string;
}

function buildNewsParseUserPrompt(articles: RawArticleForParse[]): string {
  const slice = articles.slice(0, MAX_ARTICLES_TO_SEND);
  return JSON.stringify(
    slice.map(a => ({
      title: a.title,
      snippet: a.snippet,
      published_datetime_utc: a.published_datetime_utc,
      source_name: a.source_name,
      link: a.link,
      article_id: a.article_id ?? a.link,
    }))
  );
}

function parseJsonArrayFromNews(text: string): unknown[] {
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(stripped) as unknown;
  if (!Array.isArray(parsed)) throw new Error('AI did not return a JSON array');
  return parsed;
}

// Dev-only plugin: news fetch + AI parse pipeline (at most ~2x/day from client).
// On cache miss, the request runs RapidAPI fetch + LLM parse and can take 1-2 minutes.
function newsCharlotteParsedPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'news-charlotte-parsed',
    configureServer(server) {
      server.middlewares.use('/api/news-charlotte-parsed', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // In-memory cache (12h TTL, mirrors KV in production)
        const cached = devCacheGet('news:parsed');
        if (cached) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'private, max-age=43200');
          res.end(cached);
          return;
        }

        const rapidApiKey = env.RAPIDAPI_KEY;
        const provider = env.AI_PROVIDER || 'openai';
        const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

        if (!rapidApiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'RapidAPI key not configured' }));
          return;
        }
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `${provider.toUpperCase()} API key not configured` }));
          return;
        }

        try {
          const params = new URLSearchParams({
            query: 'charlotte north carolina',
            time_published: '1d',
            limit: '200',
          });
          const newsFetchOpts = {
            method: 'GET' as const,
            headers: {
              'x-rapidapi-key': rapidApiKey,
              'x-rapidapi-host': OPENWEBNINJA_HOST,
              Accept: 'application/json',
            },
          };

          let newsResponse: Response;
          try {
            newsResponse = await fetch(
              `https://${OPENWEBNINJA_HOST}/search?${params}`,
              newsFetchOpts
            );
            if (newsResponse.status === 429) {
              await new Promise(r => setTimeout(r, 2000));
              newsResponse = await fetch(
                `https://${OPENWEBNINJA_HOST}/search?${params}`,
                newsFetchOpts
              );
            }
          } catch (fetchErr) {
            const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            console.error('[news-charlotte-parsed] RapidAPI fetch failed:', fetchErr);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'Failed to fetch news',
                message: `RapidAPI request failed: ${msg}. Check network and RapidAPI availability.`,
              })
            );
            return;
          }

          if (!newsResponse.ok) {
            const detail = await newsResponse.text();
            const isRateLimit = newsResponse.status === 429;
            res.statusCode = isRateLimit ? 503 : newsResponse.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: isRateLimit ? 'News API rate limit exceeded' : 'Failed to fetch news',
                detail: detail.slice(0, 200),
                ...(isRateLimit && {
                  retryAfter: 'Try again in a few minutes or check your RapidAPI quota.',
                }),
              })
            );
            return;
          }

          let newsJson: { data?: RawArticleForParse[] };
          try {
            newsJson = (await newsResponse.json()) as { data?: RawArticleForParse[] };
          } catch (parseErr) {
            console.error('[news-charlotte-parsed] RapidAPI response not JSON:', parseErr);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'Failed to fetch news',
                message: 'News API returned invalid JSON. Try again or use a smaller limit.',
              })
            );
            return;
          }

          const articles = newsJson.data ?? [];

          if (articles.length === 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'private, max-age=43200');
            res.end(JSON.stringify({ data: [], generatedAt: new Date().toISOString() }));
            return;
          }

          const userPrompt = buildNewsParseUserPrompt(articles);

          let rawOutput: string;
          try {
            if (provider === 'anthropic') {
              const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': apiKey,
                  'Content-Type': 'application/json',
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: 'claude-3-5-haiku-latest',
                  max_tokens: 4096,
                  system: NEWS_PARSING_SYSTEM_PROMPT,
                  messages: [{ role: 'user', content: userPrompt }],
                }),
              });
              if (!response.ok) {
                const err = await response.text();
                if (response.status === 429) {
                  res.statusCode = 503;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      error: 'AI API rate limit exceeded',
                      detail: err.slice(0, 200),
                      retryAfter: 'Try again in a few minutes.',
                    })
                  );
                  return;
                }
                throw new Error(`Anthropic API error: ${response.status} - ${err}`);
              }
              const data = (await response.json()) as { content?: Array<{ text?: string }> };
              rawOutput = data.content?.[0]?.text?.trim() ?? '[]';
            } else {
              const response = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  instructions: NEWS_PARSING_SYSTEM_PROMPT,
                  input: userPrompt,
                  max_output_tokens: 4096,
                  temperature: 0.2,
                  store: false,
                }),
              });
              if (!response.ok) {
                const err = await response.text();
                if (response.status === 429) {
                  res.statusCode = 503;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      error: 'AI API rate limit exceeded',
                      detail: err.slice(0, 200),
                      retryAfter: 'Try again in a few minutes.',
                    })
                  );
                  return;
                }
                throw new Error(`OpenAI API error: ${response.status} - ${err}`);
              }
              const data = (await response.json()) as {
                output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
              };
              const messageOutput = data.output?.find(
                (item: { type: string }) => item.type === 'message'
              );
              const textContent = messageOutput?.content?.find(
                (c: { type: string }) => c.type === 'output_text'
              );
              rawOutput = textContent?.text?.trim() ?? '[]';
            }
          } catch (aiErr) {
            const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
            console.error('[news-charlotte-parsed] AI API request failed:', aiErr);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'Failed to parse news',
                message: `${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} request failed: ${msg}. Check network and API key.`,
              })
            );
            return;
          }

          const data = parseJsonArrayFromNews(rawOutput);
          const responseBody = JSON.stringify({ data, generatedAt: new Date().toISOString() });

          devCachePut('news:parsed', responseBody, 12 * 60 * 60 * 1000);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'private, max-age=43200');
          res.end(responseBody);
        } catch (error) {
          console.error('[news-charlotte-parsed] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Failed to parse news',
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
      });
    },
  };
}

// Dev-only plugin: GET /api/cats-twitter (RapidAPI) so Vite dev returns JSON instead of index.html
const TWITTER241_HOST = 'twitter241.p.rapidapi.com';
const CATS_TWITTER_USER_ID = '868028628';
const CATS_TWITTER_CACHE_TTL_MS = 21600 * 1000; // 6h, match production

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseTwitter241Tweets(
  body: any
): Array<{ id: string; text: string; createdAt: string; author?: { id: string }; type?: string }> {
  const instructions: any[] = body?.result?.timeline?.instructions ?? [];
  const tweets: Array<{
    id: string;
    text: string;
    createdAt: string;
    author?: { id: string };
    type?: string;
  }> = [];

  for (const instruction of instructions) {
    for (const entry of instruction.entries ?? []) {
      const content = entry?.content;
      if (!content || content.__typename !== 'TimelineTimelineItem') continue;
      const itemContent = content.itemContent;
      if (!itemContent || itemContent.__typename !== 'TimelineTweet') continue;
      if (itemContent.promotedMetadata) continue;
      const tweetResult = itemContent.tweet_results?.result;
      if (!tweetResult) continue;
      const result =
        tweetResult.__typename === 'TweetWithVisibilityResults' ? tweetResult.tweet : tweetResult;
      const legacy = result?.legacy;
      if (!legacy) continue;
      const id = result.rest_id ?? legacy.id_str;
      const text = legacy.full_text;
      const createdAt = legacy.created_at;
      const authorId = legacy.user_id_str ?? result.core?.user_results?.result?.rest_id;
      if (!id || !text || !createdAt) continue;
      tweets.push({
        id,
        text,
        createdAt,
        author: authorId ? { id: authorId } : undefined,
        type: legacy.is_quote_status ? 'quote' : 'tweet',
      });
    }
  }
  return tweets;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function catsTwitterPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'cats-twitter',
    configureServer(server) {
      server.middlewares.use('/api/cats-twitter', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const cached = devCacheGet('cats-twitter');
        if (cached) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', `private, max-age=${43200}`);
          res.end(cached);
          return;
        }

        const apiKey = env.RAPIDAPI_KEY;
        if (!apiKey) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: [] }));
          return;
        }

        try {
          const url = `https://${TWITTER241_HOST}/user-tweets?user=${CATS_TWITTER_USER_ID}&count=20`;
          const response = await fetch(url, {
            headers: {
              'x-rapidapi-host': TWITTER241_HOST,
              'x-rapidapi-key': apiKey,
            },
          });
          if (!response.ok) {
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Twitter API ${response.status}`, data: [] }));
            return;
          }
          const body = await response.json();
          const allTweets = parseTwitter241Tweets(body);
          const catsTweets = allTweets.filter(
            t =>
              t.author?.id === CATS_TWITTER_USER_ID &&
              (t.type === 'tweet' || t.type === 'quote') &&
              isServiceAlertTweet(t.text) &&
              isWithinLast24Hours(t.createdAt)
          );
          const responseBody = JSON.stringify({ data: catsTweets });
          devCachePut('cats-twitter', responseBody, CATS_TWITTER_CACHE_TTL_MS);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', `private, max-age=${43200}`);
          res.end(responseBody);
        } catch (error) {
          console.error('[cats-twitter] Error:', error);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: [] }));
        }
      });
    },
  };
}

const CMS_TWITTER_USER_ID = '199341683';
const CMS_TWITTER_CACHE_TTL_MS = 21600000; // 6h, match production

function cmsTwitterPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'cms-twitter',
    configureServer(server) {
      server.middlewares.use('/api/cms-twitter', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const cached = devCacheGet('cms-twitter');
        if (cached) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', `private, max-age=${43200}`);
          res.end(cached);
          return;
        }

        const apiKey = env.RAPIDAPI_KEY;
        if (!apiKey) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: [] }));
          return;
        }

        try {
          const url = `https://${TWITTER241_HOST}/user-tweets?user=${CMS_TWITTER_USER_ID}&count=20`;
          const response = await fetch(url, {
            headers: {
              'x-rapidapi-host': TWITTER241_HOST,
              'x-rapidapi-key': apiKey,
            },
          });
          if (!response.ok) {
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Twitter API ${response.status}`, data: [] }));
            return;
          }
          const body = await response.json();
          const allTweets = parseTwitter241Tweets(body);
          const cmsTweets = allTweets.filter(
            t =>
              t.author?.id === CMS_TWITTER_USER_ID &&
              (t.type === 'tweet' || t.type === 'quote') &&
              isCMSAlertTweet(t.text) &&
              isWithinLast24Hours(t.createdAt)
          );
          const responseBody = JSON.stringify({ data: cmsTweets });
          devCachePut('cms-twitter', responseBody, CMS_TWITTER_CACHE_TTL_MS);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', `private, max-age=${43200}`);
          res.end(responseBody);
        } catch (error) {
          console.error('[cms-twitter] Error:', error);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: [] }));
        }
      });
    },
  };
}

// Dev-only plugin to handle AI summarization without Wrangler/Pages Functions
function aiSummarizationPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'ai-summarization',
    configureServer(server) {
      server.middlewares.use('/api/summarize-alerts', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const provider = env.AI_PROVIDER || 'openai';
        const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `${provider.toUpperCase()} API key not configured` }));
          return;
        }

        // Read request body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        let requestData: {
          alerts: Array<{ severity: string; source: string; title: string; summary: string }>;
          hash: string;
        };
        try {
          requestData = JSON.parse(body);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        // In-memory cache (15min TTL, keyed by hash, mirrors KV in production)
        if (requestData.hash) {
          const cached = devCacheGet(`summary:${requestData.hash}`);
          if (cached) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'private, max-age=900');
            res.end(cached);
            return;
          }
        }

        const alerts = requestData.alerts || [];
        const userPrompt =
          alerts.length === 0
            ? 'No active alerts.'
            : `Current alerts (${alerts.length} total):\n${alerts
                .map(
                  (a, i) =>
                    `${i + 1}. [${a.severity.toUpperCase()}] ${a.source.toUpperCase()}: ${a.title} - ${a.summary}`
                )
                .join('\n')}`;

        try {
          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: BLUF_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: 150,
              temperature: 0.3,
            }),
          });

          if (!openAIResponse.ok) {
            const errorText = await openAIResponse.text();
            throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
          }

          const openAIData = await openAIResponse.json();
          const summary =
            openAIData.choices?.[0]?.message?.content?.trim() || 'Unable to generate summary.';

          const responseBody = JSON.stringify({
            summary,
            hash: requestData.hash,
            generatedAt: new Date().toISOString(),
          });

          if (requestData.hash) {
            devCachePut(`summary:${requestData.hash}`, responseBody, 15 * 60 * 1000);
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(responseBody);
        } catch (error) {
          console.error('[ai-summarization] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Failed to generate summary',
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
      });
    },
  };
}

// Dev-only plugin for weather summary (mirrors functions/api/summarize-weather.ts)
function aiWeatherSummaryPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'ai-weather-summary',
    configureServer(server) {
      server.middlewares.use('/api/summarize-weather', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'OPENAI API key not configured' }));
          return;
        }

        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        type HourSlot = {
          time: string;
          temperature_2m: number;
          precipitation_probability: number;
          wind_speed_10m: number;
        };
        type AirQualitySlot = { time: string; european_aqi: number };
        let requestData: {
          current: {
            time?: string;
            temperature_2m: number;
            apparent_temperature: number;
            relative_humidity_2m: number;
            wind_speed_10m: number;
            wind_direction_10m: number;
            weather_code: number;
          };
          hourly: HourSlot[];
          past_12h?: HourSlot[];
          hash: string;
          air_quality_next_12h?: AirQualitySlot[];
          air_quality_past_12h?: AirQualitySlot[];
        };
        try {
          requestData = JSON.parse(body);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        if (requestData.hash) {
          const cached = devCacheGet(`weather-summary:${requestData.hash}`);
          if (cached) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'private, max-age=900');
            res.end(cached);
            return;
          }
        }

        const { current, hourly, past_12h } = requestData;
        const hourlySlice = (hourly || []).slice(0, 12);
        const pastSlice = (past_12h || []).slice(0, 12);
        const firstTemp = current.temperature_2m;
        const lastTemp =
          hourlySlice.length > 0
            ? hourlySlice[hourlySlice.length - 1].temperature_2m
            : current.temperature_2m;
        const first = Math.round(firstTemp);
        const last = Math.round(lastTemp);
        const temperaturePhrase =
          last > first
            ? `Temperatures rising from ${first} to ${last} F`
            : last < first
              ? `Temperatures falling from ${first} to ${last} F`
              : `Temperatures steady around ${first} F`;

        const summarizeBlock = (slots: HourSlot[]) => {
          if (slots.length === 0) return 'no data';
          const temps = slots.map(s => s.temperature_2m);
          const precip = slots.map(s => s.precipitation_probability);
          const wind = slots.map(s => s.wind_speed_10m);
          const tempMin = Math.round(Math.min(...temps));
          const tempMax = Math.round(Math.max(...temps));
          const precipMax = Math.round(Math.max(...precip));
          const windAvg = Math.round(wind.reduce((a, b) => a + b, 0) / wind.length);
          return `temp ${tempMin}-${tempMax} F, precip up to ${precipMax}%, wind ~${windAvg} mph`;
        };

        const currentBlock = `Current conditions (now): ${Math.round(current.temperature_2m)} F (feels ${Math.round(current.apparent_temperature)} F), humidity ${current.relative_humidity_2m}%, wind ${Math.round(current.wind_speed_10m)} mph.`;
        const next12Summary = summarizeBlock(hourlySlice);
        const past12Summary = summarizeBlock(pastSlice);
        let userPrompt = `Temperature trend (for context): ${temperaturePhrase}\n\n${currentBlock}\n\nNext 12 hours (forecast): ${next12Summary}\n\nPrior 12 hours (for comparison): ${past12Summary}`;

        const aqNext = requestData.air_quality_next_12h ?? [];
        const aqPast = requestData.air_quality_past_12h ?? [];
        if (aqNext.length > 0 || aqPast.length > 0) {
          const summarizeAqi = (slots: AirQualitySlot[]) => {
            if (slots.length === 0) return 'no data';
            const values = slots.map(s => s.european_aqi);
            const min = Math.round(Math.min(...values));
            const max = Math.round(Math.max(...values));
            return `European AQI ${min}-${max}`;
          };
          userPrompt += `\n\nAir quality (European AQI): Next 12h: ${summarizeAqi(aqNext)}. Prior 12h: ${summarizeAqi(aqPast)}. Mention air quality ONLY when AQI exceeds 100 (see system prompt).`;
        }

        try {
          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: WEATHER_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: 350,
              temperature: 0.3,
            }),
          });

          if (!openAIResponse.ok) {
            const errorText = await openAIResponse.text();
            throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
          }

          const openAIData = await openAIResponse.json();
          const summary =
            openAIData.choices?.[0]?.message?.content?.trim() || 'Unable to generate summary.';

          const responseBody = JSON.stringify({
            summary,
            hash: requestData.hash,
            generatedAt: new Date().toISOString(),
          });

          if (requestData.hash) {
            devCachePut(`weather-summary:${requestData.hash}`, responseBody, 15 * 60 * 1000);
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(responseBody);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Unknown error');
          const cause = err.cause instanceof Error ? err.cause.message : String(err.cause ?? '');
          console.error('[ai-weather-summary] Error:', err.message, cause || '');
          const message =
            err.message === 'fetch failed' && cause
              ? `fetch failed: ${cause}`
              : err.message === 'fetch failed'
                ? 'Network error calling OpenAI. Check OPENAI_API_KEY and connectivity.'
                : err.message;
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Failed to generate summary',
              message,
            })
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load env vars (including non-VITE_ prefixed ones for proxy config)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      newsCharlotteParsedPlugin(env),
      catsTwitterPlugin(env),
      cmsTwitterPlugin(env),
      aiSummarizationPlugin(env),
      aiWeatherSummaryPlugin(env),
      dukeOutagePlugin(env),
    ],
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test/setup.ts'],
    },
    server: {
      proxy: {
        // Order matters - more specific paths first
        '/proxy/opensky-auth': {
          target: 'https://auth.opensky-network.org',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/opensky-auth/, ''),
          configure: proxy => {
            // Inject OAuth credentials server-side - never expose in client bundle
            proxy.on('proxyReq', (proxyReq, req) => {
              const clientId = env.OPENSKY_CLIENT_ID;
              const clientSecret = env.OPENSKY_CLIENT_SECRET;

              if (clientId && clientSecret && req.method === 'POST') {
                // Build the OAuth2 client_credentials request body
                const body = new URLSearchParams({
                  grant_type: 'client_credentials',
                  client_id: clientId,
                  client_secret: clientSecret,
                }).toString();

                // Set proper headers for form submission
                proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(body));

                // Write the body with credentials
                proxyReq.write(body);
              }
            });
          },
        },
        '/proxy/opensky': {
          target: 'https://opensky-network.org',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/opensky/, ''),
        },
        '/proxy/faa': {
          target: 'https://nasstatus.faa.gov',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/faa/, ''),
        },
        '/proxy/duke': {
          target: 'https://prod.apigee.duke-energy.app',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/duke/, ''),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              if (env.DUKE_OUTAGE_AUTH) {
                proxyReq.setHeader('Authorization', env.DUKE_OUTAGE_AUTH);
              }
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
        '/proxy/cats': {
          target: 'https://transit.land',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/cats/, ''),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              if (env.TRANSIT_LAND_API_KEY) {
                proxyReq.setHeader('apikey', env.TRANSIT_LAND_API_KEY);
              }
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
        '/proxy/finnhub': {
          target: 'https://finnhub.io',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/finnhub/, ''),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              if (env.FINNHUB_API_KEY) {
                proxyReq.setHeader('X-Finnhub-Token', env.FINNHUB_API_KEY);
              }
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
        // HERE Traffic API proxy
        '/proxy/here': {
          target: 'https://data.traffic.hereapi.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/here/, ''),
          configure: proxy => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Inject API key as query parameter. Use rewritten path (/v7/flow)
              // since url.pathname still contains /proxy/here prefix.
              if (env.HERE_API_KEY && req.url) {
                const url = new URL(req.url, 'http://localhost');
                url.searchParams.set('apiKey', env.HERE_API_KEY);
                const path = url.pathname.replace(/^\/proxy\/here/, '') || '/v7/flow';
                proxyReq.path = path + url.search;
              }
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
      },
    },
  };
});

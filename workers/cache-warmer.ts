/**
 * Cloudflare Worker: News Cache Warmer
 *
 * WRITE path: Cron -> fetch RSS feeds -> LLM parse -> write KV
 * The Pages Function (read path) serves cached data instantly.
 *
 * Deploy: npx wrangler deploy --config workers/wrangler.toml
 */

/// <reference types="@cloudflare/workers-types" />

import { XMLParser } from 'fast-xml-parser';
import { callOpenAIResponses } from '../functions/_lib/openaiResponses';
import newsParsingPrompt from '../src/prompts/newsParsing.json';
import { sortNewsEvents } from '../src/utils/newsApi';

const NEWS_PARSING_SYSTEM_PROMPT: string = newsParsingPrompt.systemPrompt;
const MAX_ARTICLES_TO_SEND: number = newsParsingPrompt.maxArticlesToSend;
const RSS_FEEDS: Array<{ url: string; name: string }> = newsParsingPrompt.feeds;
const CACHE_KEY = 'news:parsed';

export interface Env {
  CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  AI_PROVIDER?: string;
  CACHE_WARMING_SECRET?: string;
  SITE_URL?: string;
}

/** Normalized shape for LLM prompt (matches prompt field names) */
interface RawArticle {
  title: string;
  snippet: string;
  published_datetime_utc: string;
  source_name: string;
  link: string;
  article_id?: string;
}

interface ParsedNewsEvent {
  event_key: string;
  category: string;
  urgency: number;
  text: string;
  sources: Array<{
    link: string;
    source_name: string;
    published_datetime_utc: string;
    title: string;
    article_id: string;
  }>;
}

const rssParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Always return arrays for item/entry so single-item feeds parse consistently
  isArray: name => name === 'item' || name === 'entry',
  // Preserve CDATA content as plain text (default behaviour in v5)
  processEntities: true,
  trimValues: true,
});

/** Coerce a parsed XML value to a plain string, handling text nodes and objects */
function xmlStr(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val !== null) {
    // fast-xml-parser mixed content: { '#text': '...' }
    const t = (val as Record<string, unknown>)['#text'];
    if (typeof t === 'string') return t;
  }
  return '';
}

/**
 * Resolve <link> from an RSS item/entry.
 * RSS 2.0: plain string. Atom: object with @_href, or array of link objects.
 */
function xmlLink(val: unknown, fallback: string): string {
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val)) {
    // Atom multi-link: prefer rel="alternate", then first entry
    const alt = (val as Record<string, unknown>[]).find(
      l => !l['@_rel'] || l['@_rel'] === 'alternate'
    );
    const href = alt?.['@_href'];
    if (typeof href === 'string') return href.trim();
  }
  if (typeof val === 'object' && val !== null) {
    const href = (val as Record<string, unknown>)['@_href'];
    if (typeof href === 'string') return href.trim();
  }
  return fallback;
}

/** Strip residual HTML tags and normalise whitespace for clean LLM input */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse an RSS 2.0 or Atom XML string into RawArticle array */
function parseRssFeed(xml: string, sourceName: string): RawArticle[] {
  const doc = rssParser.parse(xml) as Record<string, unknown>;

  // RSS 2.0: doc.rss.channel.item  |  Atom: doc.feed.entry
  const rssChannel = (doc['rss'] as Record<string, unknown> | undefined)?.['channel'] as
    | Record<string, unknown>
    | undefined;
  const items = (rssChannel?.['item'] ?? []) as unknown[];
  const entries = ((doc['feed'] as Record<string, unknown> | undefined)?.['entry'] ??
    []) as unknown[];

  return [...items, ...entries].flatMap(raw => {
    if (typeof raw !== 'object' || raw === null) return [];
    const r = raw as Record<string, unknown>;

    const title = stripHtml(xmlStr(r['title']));
    const link = xmlLink(r['link'], xmlStr(r['guid']));
    const snippet = stripHtml(
      xmlStr(r['description']) || xmlStr(r['summary']) || xmlStr(r['content'])
    );
    const pubDate = xmlStr(r['pubDate']) || xmlStr(r['published']) || xmlStr(r['updated']);

    if (!title || !link) return [];

    let publishedAt: string;
    try {
      publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    } catch {
      publishedAt = new Date().toISOString();
    }

    return [
      {
        title,
        snippet,
        published_datetime_utc: publishedAt,
        source_name: sourceName,
        link,
        article_id: link,
      },
    ];
  });
}

/** Fetch all RSS feeds concurrently; log and skip any that fail */
async function fetchAllFeeds(feeds: Array<{ url: string; name: string }>): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    feeds.map(async feed => {
      const res = await fetch(feed.url, {
        headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${feed.url}`);
      const xml = await res.text();
      return parseRssFeed(xml, feed.name);
    })
  );

  const allArticles: RawArticle[] = [];
  const seenLinks = new Set<string>();

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      for (const article of result.value) {
        if (!seenLinks.has(article.link)) {
          seenLinks.add(article.link);
          allArticles.push(article);
        }
      }
    } else {
      console.warn(`Feed "${feeds[i].name}" failed:`, result.reason);
    }
  }

  // Newest first before handing to LLM
  allArticles.sort(
    (a, b) =>
      new Date(b.published_datetime_utc).getTime() - new Date(a.published_datetime_utc).getTime()
  );

  return allArticles;
}

function buildUserPrompt(articles: RawArticle[]): string {
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

function parseJsonArray(text: string): ParsedNewsEvent[] {
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(stripped) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('AI did not return a JSON array');
  }
  return parsed as ParsedNewsEvent[];
}

/**
 * Fetch articles from RSS feeds, send to LLM, write parsed result to KV.
 */
async function warmNewsCache(
  env: Env
): Promise<{ success: boolean; eventCount: number; articlesFound: number }> {
  const provider = env.AI_PROVIDER || 'openai';
  const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(`${provider.toUpperCase()} API key not configured`);

  // 1. Fetch RSS feeds and filter to last 24 hours
  const allArticles = await fetchAllFeeds(RSS_FEEDS);
  const cutoffMs = Date.now() - 72 * 60 * 60 * 1000;
  const articles = allArticles.filter(
    a => new Date(a.published_datetime_utc).getTime() >= cutoffMs
  );

  if (articles.length === 0) {
    const body = JSON.stringify({ data: [], generatedAt: new Date().toISOString() });
    await env.CACHE.put(CACHE_KEY, body, { expirationTtl: 7200 });
    return { success: true, eventCount: 0, articlesFound: 0 };
  }

  // 2. Send to LLM for filtering and parsing
  const userPrompt = buildUserPrompt(articles);
  let rawOutput: string;

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
      throw new Error(`Anthropic API error: ${response.status} - ${err.slice(0, 200)}`);
    }
    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    rawOutput = data.content?.[0]?.text?.trim() ?? '[]';
  } else {
    rawOutput = await callOpenAIResponses({
      apiKey,
      model: 'gpt-4o-mini',
      instructions: NEWS_PARSING_SYSTEM_PROMPT,
      input: userPrompt,
      maxOutputTokens: 4096,
      temperature: 0.2,
    });
  }

  // 3. Parse LLM response
  const parsed = parseJsonArray(rawOutput);

  // 4. Deduplicate by event_key (safety net — LLM occasionally emits repeated entries)
  const seenKeys = new Set<string>();
  const data = parsed.filter(event => {
    if (seenKeys.has(event.event_key)) return false;
    seenKeys.add(event.event_key);
    return true;
  });

  // 5. Enrich sources with RSS snippets (joined by URL, not passed through LLM)
  const snippetByUrl = new Map<string, string>();
  for (const article of articles) {
    if (article.snippet) {
      const truncated = article.snippet.slice(0, 500);
      snippetByUrl.set(article.link, truncated);
      if (article.article_id && article.article_id !== article.link) {
        snippetByUrl.set(article.article_id, truncated);
      }
    }
  }
  const enrichedData = sortNewsEvents(
    data.map(event => ({
      ...event,
      sources: event.sources.map(src => ({
        ...src,
        snippet: snippetByUrl.get(src.link) ?? snippetByUrl.get(src.article_id) ?? '',
      })),
    }))
  );

  // 5. Write to KV (2h TTL; cron runs hourly for overlap resilience)
  const responseBody = JSON.stringify({
    data: enrichedData,
    generatedAt: new Date().toISOString(),
  });
  await env.CACHE.put(CACHE_KEY, responseBody, { expirationTtl: 7200 });

  return { success: true, eventCount: data.length, articlesFound: articles.length };
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.info('Cache warming cron triggered at', new Date(event.scheduledTime).toISOString());
    try {
      const result = await warmNewsCache(env);
      console.info(
        `Cache warm complete: ${result.eventCount} events from ${result.articlesFound} articles`
      );
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/') {
      return new Response(
        JSON.stringify({ status: 'ok', service: 'charlotte-monitor-cache-warmer' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Manual trigger (requires secret)
    if (url.pathname === '/warm') {
      const secret =
        url.searchParams.get('secret') || request.headers.get('x-cache-warming-secret');
      if (!env.CACHE_WARMING_SECRET || secret !== env.CACHE_WARMING_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      try {
        const result = await warmNewsCache(env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Not found', { status: 404 });
  },
};

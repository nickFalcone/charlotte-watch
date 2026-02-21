/**
 * Cloudflare Worker: News Cache Warmer
 *
 * WRITE path: Cron -> fetch articles -> LLM parse -> write KV
 * The Pages Function (read path) serves cached data instantly.
 *
 * Deploy: npx wrangler deploy --config workers/wrangler.toml
 */

/// <reference types="@cloudflare/workers-types" />

import { callOpenAIResponses } from '../functions/_lib/openaiResponses';
import newsParsingPrompt from '../src/prompts/newsParsing.json';

const NEWS_PARSING_SYSTEM_PROMPT: string = newsParsingPrompt.systemPrompt;
const NEWS_API_HOST = 'google-trend-news.p.rapidapi.com';
const CACHE_KEY = 'news:parsed';
const MAX_ARTICLES_TO_SEND = 100;

export interface Env {
  CACHE: KVNamespace;
  RAPIDAPI_KEY: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  AI_PROVIDER?: string;
  CACHE_WARMING_SECRET?: string;
  SITE_URL?: string;
}

/** Shape returned by google-trend-news API */
interface GoogleTrendArticle {
  title: string;
  description: string;
  date: string;
  url: string;
  source: { name: string; url: string; favicon?: string };
  authors?: string[];
  keywords?: string[];
  thumbnail?: string;
}

/** Normalized shape for LLM prompt (matches existing prompt field names) */
interface RawArticle {
  title: string;
  snippet: string;
  published_datetime_utc: string;
  source_name: string;
  link: string;
  article_id?: string;
}

function normalizeArticle(a: GoogleTrendArticle): RawArticle {
  return {
    title: a.title,
    snippet: a.description,
    published_datetime_utc: a.date,
    source_name: a.source?.name ?? '',
    link: a.url,
    article_id: a.url,
  };
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
 * Fetch articles, send to LLM, write parsed result to KV.
 */
async function warmNewsCache(
  env: Env
): Promise<{ success: boolean; eventCount: number; articlesFound: number }> {
  const rapidApiKey = env.RAPIDAPI_KEY;
  const provider = env.AI_PROVIDER || 'openai';
  const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

  if (!rapidApiKey) throw new Error('RAPIDAPI_KEY not configured');
  if (!apiKey) throw new Error(`${provider.toUpperCase()} API key not configured`);

  // 1. Fetch articles from Google Trend News (RapidAPI)
  const params = new URLSearchParams({
    q: 'Charlotte, NC',
    country: 'us',
    language: 'en',
  });
  const fetchOptions = {
    method: 'GET' as const,
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': NEWS_API_HOST,
      Accept: 'application/json',
    },
  };

  let newsResponse = await fetch(`https://${NEWS_API_HOST}/news?${params}`, fetchOptions);
  if (newsResponse.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    newsResponse = await fetch(`https://${NEWS_API_HOST}/news?${params}`, fetchOptions);
  }
  if (!newsResponse.ok) {
    const detail = await newsResponse.text();
    throw new Error(`RapidAPI error: ${newsResponse.status} - ${detail.slice(0, 200)}`);
  }

  const newsJson = (await newsResponse.json()) as {
    data?: { articles?: GoogleTrendArticle[] };
  };
  const articles = (newsJson.data?.articles ?? []).map(normalizeArticle);

  if (articles.length === 0) {
    const body = JSON.stringify({ data: [], generatedAt: new Date().toISOString() });
    await env.CACHE.put(CACHE_KEY, body, { expirationTtl: 7200 });
    return { success: true, eventCount: 0, articlesFound: 0 };
  }

  // 2. Send to LLM for parsing
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

  // 3. Parse response
  const data = parseJsonArray(rawOutput);

  // 4. Write to KV (2h TTL, cron runs hourly so overlap for resilience)
  const responseBody = JSON.stringify({
    data,
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

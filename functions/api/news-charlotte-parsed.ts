import type { Env } from '../_lib/env';
import { callOpenAIResponses } from '../_lib/openaiResponses';
import newsParsingPrompt from '../../src/prompts/newsParsing.json';

const NEWS_PARSING_SYSTEM_PROMPT: string = newsParsingPrompt.systemPrompt;
const OPENWEBNINJA_HOST = 'real-time-news-data.p.rapidapi.com';

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

const MAX_ARTICLES_TO_SEND = 100;

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

export const onRequestGet: PagesFunction<Env> = async context => {
  // Check KV cache first (12h TTL shared across all clients)
  const CACHE_KEY = 'news:parsed';
  try {
    const cached = await context.env.CACHE.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=43200',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  const rapidApiKey = context.env.RAPIDAPI_KEY;
  const provider = context.env.AI_PROVIDER || 'openai';
  const apiKey =
    provider === 'anthropic' ? context.env.ANTHROPIC_API_KEY : context.env.OPENAI_API_KEY;

  if (!rapidApiKey) {
    return new Response(JSON.stringify({ error: 'RapidAPI key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: `${provider.toUpperCase()} API key not configured` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const params = new URLSearchParams({
      query: 'charlotte north carolina',
      time_published: '1d',
    });
    const newsFetchOptions = {
      method: 'GET' as const,
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': OPENWEBNINJA_HOST,
        Accept: 'application/json',
      },
    };
    let newsResponse = await fetch(
      `https://${OPENWEBNINJA_HOST}/search?${params}`,
      newsFetchOptions
    );
    if (newsResponse.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      newsResponse = await fetch(`https://${OPENWEBNINJA_HOST}/search?${params}`, newsFetchOptions);
    }

    if (!newsResponse.ok) {
      const detail = await newsResponse.text();
      const isRateLimit = newsResponse.status === 429;
      return new Response(
        JSON.stringify({
          error: isRateLimit ? 'News API rate limit exceeded' : 'Failed to fetch news',
          detail: detail.slice(0, 200),
          ...(isRateLimit && {
            retryAfter: 'Try again in a few minutes or check your RapidAPI quota.',
          }),
        }),
        {
          status: isRateLimit ? 503 : newsResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const newsJson = (await newsResponse.json()) as { data?: RawArticle[] };
    const articles: RawArticle[] = newsJson.data ?? [];

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({
          data: [],
          generatedAt: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, max-age=43200',
          },
        }
      );
    }

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
        if (response.status === 429) {
          return new Response(
            JSON.stringify({
              error: 'AI API rate limit exceeded',
              detail: err.slice(0, 200),
              retryAfter: 'Try again in a few minutes.',
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Anthropic API error: ${response.status} - ${err}`);
      }
      const data = (await response.json()) as { content?: Array<{ text?: string }> };
      rawOutput = data.content?.[0]?.text?.trim() ?? '[]';
    } else {
      try {
        rawOutput = await callOpenAIResponses({
          apiKey,
          model: 'gpt-4o-mini',
          instructions: NEWS_PARSING_SYSTEM_PROMPT,
          input: userPrompt,
          maxOutputTokens: 4096,
          temperature: 0.2,
        });
      } catch (openAIError) {
        const msg = openAIError instanceof Error ? openAIError.message : String(openAIError);
        if (msg.includes('429')) {
          return new Response(
            JSON.stringify({
              error: 'AI API rate limit exceeded',
              detail: msg.slice(0, 200),
              retryAfter: 'Try again in a few minutes.',
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw openAIError;
      }
    }

    const data = parseJsonArray(rawOutput);

    const responseBody = JSON.stringify({
      data,
      generatedAt: new Date().toISOString(),
    });

    // Store in KV cache (12h TTL); failures are non-fatal
    try {
      await context.env.CACHE.put(CACHE_KEY, responseBody, { expirationTtl: 43200 });
    } catch (e) {
      console.error('KV cache write error:', e);
    }

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=43200',
      },
    });
  } catch (error) {
    console.error('news-charlotte-parsed error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to parse news',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

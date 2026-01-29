import type { Env } from '../_lib/env';
import { callOpenAIResponses } from '../_lib/openaiResponses';
import blufPrompt from '../../src/prompts/blufSummary.json';

const BLUF_SYSTEM_PROMPT: string = blufPrompt.systemPrompt;

interface AlertInput {
  title: string;
  summary: string;
  severity: string;
  source: string;
  category: string;
}

interface SummarizeRequest {
  alerts: AlertInput[];
  hash: string;
}

interface SummarizeResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

const MAX_ALERTS = 50;

function buildUserPrompt(alerts: AlertInput[]): string {
  if (alerts.length === 0) {
    return 'No active alerts.';
  }

  const alertLines = alerts.map((alert, i) => {
    return `${i + 1}. [${alert.severity.toUpperCase()}] ${alert.source.toUpperCase()}: ${alert.title} - ${alert.summary}`;
  });

  return `Current alerts (${alerts.length} total):\n${alertLines.join('\n')}`;
}

async function callAnthropic(alerts: AlertInput[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 150,
      system: BLUF_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(alerts) }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  interface AnthropicResponse {
    content: Array<{ text?: string }>;
  }

  const data: AnthropicResponse = await response.json();
  return data.content[0]?.text?.trim() || 'Unable to generate summary.';
}

export const onRequestPost: PagesFunction<Env> = async context => {
  // Determine which AI provider to use
  const provider = context.env.AI_PROVIDER || 'openai';
  const apiKey =
    provider === 'anthropic' ? context.env.ANTHROPIC_API_KEY : context.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: `${provider.toUpperCase()} API key not configured` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Parse request body
  let request: SummarizeRequest;
  try {
    request = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate request
  if (!request.alerts || !Array.isArray(request.alerts)) {
    return new Response(JSON.stringify({ error: 'alerts array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!request.hash || typeof request.hash !== 'string') {
    return new Response(JSON.stringify({ error: 'hash string is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check KV cache (15min TTL, keyed by alert set hash)
  const cacheKey = `summary:${request.hash}`;
  try {
    const cached = await context.env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=900',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  // Limit alerts to prevent abuse
  const alerts = request.alerts.slice(0, MAX_ALERTS);

  try {
    let summary: string;

    if (provider === 'anthropic') {
      summary = await callAnthropic(alerts, apiKey);
    } else {
      // Use OpenAI Responses API
      summary = await callOpenAIResponses({
        apiKey,
        model: 'gpt-4o-mini',
        instructions: BLUF_SYSTEM_PROMPT,
        input: buildUserPrompt(alerts),
        maxOutputTokens: 150,
        temperature: 0.3,
      });
    }

    const response: SummarizeResponse = {
      summary,
      hash: request.hash,
      generatedAt: new Date().toISOString(),
    };

    const responseBody = JSON.stringify(response);

    // Store in KV cache (15min TTL); failures are non-fatal
    try {
      await context.env.CACHE.put(cacheKey, responseBody, { expirationTtl: 900 });
    } catch (e) {
      console.error('KV cache write error:', e);
    }

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=900',
      },
    });
  } catch (error) {
    console.error('AI summarization error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

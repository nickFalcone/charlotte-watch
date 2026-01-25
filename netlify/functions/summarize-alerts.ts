import type { Handler, HandlerEvent } from '@netlify/functions';
import { BLUF_SYSTEM_PROMPT } from '../../src/utils/aiPrompts';

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

function buildUserPrompt(alerts: AlertInput[]): string {
  if (alerts.length === 0) {
    return 'No active alerts.';
  }

  const alertLines = alerts.map((alert, i) => {
    return `${i + 1}. [${alert.severity.toUpperCase()}] ${alert.source.toUpperCase()}: ${alert.title} - ${alert.summary}`;
  });

  return `Current alerts (${alerts.length} total):\n${alertLines.join('\n')}`;
}

async function callOpenAI(alerts: AlertInput[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: BLUF_SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(alerts) },
      ],
      max_tokens: 150,
      temperature: 0.3, // Lower temperature for more consistent output
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || 'Unable to generate summary.';
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

  const data = await response.json();
  return data.content[0]?.text?.trim() || 'Unable to generate summary.';
}

const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Determine which AI provider to use
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey =
    provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `${provider.toUpperCase()} API key not configured` }),
    };
  }

  // Parse request body
  let request: SummarizeRequest;
  try {
    request = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  // Validate request
  if (!request.alerts || !Array.isArray(request.alerts)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'alerts array is required' }),
    };
  }

  if (!request.hash || typeof request.hash !== 'string') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'hash string is required' }),
    };
  }

  // Limit alerts to prevent abuse
  const MAX_ALERTS = 50;
  const alerts = request.alerts.slice(0, MAX_ALERTS);

  try {
    const summary =
      provider === 'anthropic'
        ? await callAnthropic(alerts, apiKey)
        : await callOpenAI(alerts, apiKey);

    const response: SummarizeResponse = {
      summary,
      hash: request.hash,
      generatedAt: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=900', // 15 min cache
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('AI summarization error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };

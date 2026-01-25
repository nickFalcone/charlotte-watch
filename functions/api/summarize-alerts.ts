import type { Env } from '../_lib/env';
import { callOpenAIResponses } from '../_lib/openaiResponses';

/**
 * AI prompt for alert summarization.
 * Duplicated from src/utils/aiPrompts.ts for edge runtime compatibility.
 */
const BLUF_SYSTEM_PROMPT = `You are a Charlotte, NC area alert summarizer. Write a 1-3 sentence summary in strict BLUF (Bottom Line Up Front) format.

CRITICAL RULES:
- Lead with the most critical/impactful information first
- Use ACTIVE, DEFINITIVE language - no hedging words (avoid: "may", "could", "potentially", "possible")
- State facts directly: "Ice storm WILL cause hazardous roads" not "may impact travel"
- Prioritize: severe weather > road closures/accidents > real-time congestion > major power outages > transit disruptions > planned road construction
- Provide CLEAR, ACTIONABLE guidance when appropriate (e.g., "Avoid non-essential travel" not "exercise caution")
- Be specific about Charlotte metro locations and timing
- Use plain language - no jargon
- Maximum 3 sentences, be ruthlessly concise
- If no significant alerts: "No significant alerts affecting Charlotte."
- Focus on life-safety and commute impact

TRAFFIC CONGESTION DATA:
- When you see alerts with source "here-flow", these are REAL-TIME traffic conditions
- Include congestion info when jam factor is high (heavy/severe traffic)
- Simply say "Heavy traffic on [road]" - do NOT include percentage slowdowns
- NEVER say "due to congestion" - it's redundant with "heavy traffic"
- OMIT "in both directions" or "both ways" - just name the road
- Prioritize interstate congestion (I-77, I-485, I-85) over surface street congestion

CMPD INCIDENTS:
- ALWAYS include injury accidents (ACCIDENT-PERSONAL INJURY) - these are high priority
- Include property damage accidents if they affect major roads or cause delays
- Format: "Injury accident at [location]" or "Accident at [location]"
- Combine with traffic data when relevant: "Accident at Monroe Rd causing heavy traffic"

NCDOT INCIDENTS:
- Consolidate multiple construction alerts into ONE concise sentence
- Focus on WHEN (night, weekend) and WHERE (road names), not mile markers
- Only mention construction that affects major commute routes
- Omit minor shoulder work or low-impact maintenance

DUKE ENERGY OUTAGES:
- MANDATORY: If ANY Duke Energy outage data is present, you MUST include it in the summary
- Combine all outages into a TOTAL customer count—do NOT list individual incidents
- If "operationCenterName" or "Location" is provided, include it: "73 customers without power in Kannapolis"
- If NO location is provided, do NOT guess or infer—just state the number: "73 Duke Energy customers without power"
- Assume outages are unplanned; only note if outageCause is "planned" (e.g., "planned maintenance")
- Power outages are ALWAYS newsworthy—do NOT omit them to save space

ROAD NAMING:
- Interstates: Use short form (I-77, I-485, I-85)
- US routes: EACH route gets its own local name—do NOT combine different routes
  - US-74 east of Uptown = Independence Blvd
  - US-74 west of Uptown = Wilkinson Blvd
  - US-29 = N Tryon St / S Tryon St
  - US-521 = Johnston Rd
- NC routes: Include the local name when well-known (NC-16/Providence Rd)
- WRONG: "US-29/US-74/Wilkinson Blvd" (these are separate roads!)
- RIGHT: "US-74/Wilkinson Blvd and US-29/N Tryon St"

Examples of GOOD phrasing:
✓ "Ice Storm Warning through Monday 1 PM—expect hazardous roads and power outages. Avoid non-essential travel."
✓ "I-485 and I-77 lane closures WILL cause delays during evening commute."
✓ "Multiple injury accidents on major routes—expect significant traffic backups."
✓ "Heavy traffic on I-77 and I-485 outer loop. Allow extra time for commute."
✓ "Accident on I-77 causing heavy traffic through Uptown. Use I-485 as alternate."
✓ "Heavy traffic on US-74/Independence Blvd and US-29/N Tryon St during rush hour."
✓ "Injury accident at Airport Dr near CLT. Property damage accident at Monroe Rd."
✓ "Overnight lane closures on US-74/Wilkinson Blvd and I-485 near Exit 9."
✓ "73 Duke Energy customers without power in Kannapolis."
✓ "1,200 customers without power due to planned maintenance."
✓ "150 Duke Energy customers without power." (when no location data provided)

Examples of BAD phrasing (DO NOT USE):
✗ "May potentially impact travel" (hedging, weak)
✗ "Residents should exercise caution" (vague, generic)
✗ "Could cause delays" (uncertain when facts are known)
✗ "Traffic conditions are variable" (useless, no actionable info)
✗ "I-77 is 45% slower than normal" (don't include percentages, just say heavy traffic)
✗ "Heavy traffic on US-29" (missing local name—should be "US-29/N Tryon St")
✗ "Heavy traffic due to congestion" (redundant—"heavy traffic" already implies congestion)
✗ "Heavy traffic; expect significant delays" (redundant—delays are implied by heavy traffic)
✗ "Heavy traffic on I-77 in both directions" (omit "in both directions"—just say "Heavy traffic on I-77")
✗ "US-29/US-74/Wilkinson Blvd" (wrong—these are different roads, list separately)
✗ "Construction on I-485 Mile Marker 10 to 11. Construction also on US 74." (mile markers meaningless to users; multiple sentences; missing US route local name)
✗ "Several power outages reported, including 50 customers in one area and 23 in another" (combine into total: "73 customers without power")
✗ "Power outages affecting some customers" (vague—give the number)
✗ "73 Duke Energy customers without power in south Charlotte" (do NOT invent locations—only use operationCenterName if provided)
✗ "US-29/US-74/Wilkinson Blvd" or "US-29/Wilkinson Blvd" (WRONG—US-29 is N Tryon St, US-74 west is Wilkinson Blvd—these are DIFFERENT roads)`;

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

    return new Response(JSON.stringify(response), {
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

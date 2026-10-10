/**
 * OpenAI Responses API helper for Cloudflare Pages Functions.
 *
 * Uses the Responses API (POST /v1/responses) instead of Chat Completions.
 * See: https://platform.openai.com/docs/api-reference/responses
 */

export type OpenAIReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface OpenAIResponsesOptions {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  /** Upper bound on visible output plus reasoning tokens. */
  maxOutputTokens?: number;
  /** Ignored when reasoningEffort is set to anything other than 'none'. */
  temperature?: number;
  /** Only for reasoning-capable models (e.g. gpt-6-luna). Omit for non-reasoning models. */
  reasoningEffort?: OpenAIReasoningEffort;
}

interface ResponseOutput {
  type: string;
  id?: string;
  status?: string;
  role?: string;
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

interface OpenAIResponsesResult {
  id: string;
  object: string;
  created_at: number;
  model: string;
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output: ResponseOutput[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    output_tokens_details?: { reasoning_tokens?: number };
    total_tokens: number;
  };
}

/**
 * Call OpenAI Responses API and extract the text output.
 */
export async function callOpenAIResponses(options: OpenAIResponsesOptions): Promise<string> {
  const {
    apiKey,
    model,
    instructions,
    input,
    maxOutputTokens = 150,
    temperature = 0.3,
    reasoningEffort,
  } = options;

  // Reasoning models reject temperature (HTTP 400) unless reasoning is off.
  const reasoningActive = reasoningEffort !== undefined && reasoningEffort !== 'none';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      temperature: reasoningActive ? undefined : temperature,
      reasoning: reasoningEffort ? { effort: reasoningEffort } : undefined,
      store: false,
    }),
  });

  const requestId = response.headers.get('x-request-id');

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `OpenAI API error: ${response.status} - ${error}${requestId ? ` (request ${requestId})` : ''}`
    );
  }

  const data: OpenAIResponsesResult = await response.json();

  // Reasoning tokens count against max_output_tokens, so a low cap can end the
  // response before any visible text is written.
  if (data.status === 'incomplete') {
    console.warn(
      `OpenAI response incomplete (${data.incomplete_details?.reason ?? 'unknown'}) for ${model} (request ${requestId})`
    );
  }

  if (reasoningEffort) {
    console.info(
      `OpenAI ${model} effort=${reasoningEffort} input=${data.usage?.input_tokens} output=${data.usage?.output_tokens} reasoning=${data.usage?.output_tokens_details?.reasoning_tokens} (request ${requestId})`
    );
  }

  // Extract the assistant output text from the response
  // Find first output item where type === "message"
  const messageOutput = data.output?.find(item => item.type === 'message');

  if (!messageOutput?.content) {
    return 'Unable to generate summary.';
  }

  // Find content with type === "output_text"
  const textContent = messageOutput.content.find(c => c.type === 'output_text');

  return textContent?.text?.trim() || 'Unable to generate summary.';
}

/**
 * OpenAI Responses API helper for Cloudflare Pages Functions.
 *
 * Uses the Responses API (POST /v1/responses) instead of Chat Completions.
 * See: https://platform.openai.com/docs/api-reference/responses
 */

export interface OpenAIResponsesOptions {
  apiKey: string;
  model?: string;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  temperature?: number;
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
  output: ResponseOutput[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI Responses API and extract the text output.
 */
export async function callOpenAIResponses(options: OpenAIResponsesOptions): Promise<string> {
  const {
    apiKey,
    model = 'gpt-4o-mini',
    instructions,
    input,
    maxOutputTokens = 150,
    temperature = 0.3,
  } = options;

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
      temperature,
      store: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data: OpenAIResponsesResult = await response.json();

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

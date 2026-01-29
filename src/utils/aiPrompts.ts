/**
 * AI prompts - single source of truth: src/prompts/*.json
 */

import blufPrompt from '../prompts/blufSummary.json';
import newsParsingPrompt from '../prompts/newsParsing.json';

export const BLUF_SYSTEM_PROMPT: string = blufPrompt.systemPrompt;
export const NEWS_PARSING_SYSTEM_PROMPT: string = newsParsingPrompt.systemPrompt;

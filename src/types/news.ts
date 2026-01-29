/** Single source reference in a parsed news event */
export interface ParsedNewsSource {
  link: string;
  source_name: string;
  published_datetime_utc: string;
  title: string;
  article_id: string;
}

/** Parsed/deduplicated news event from AI pipeline (newsParsing prompt) */
export interface ParsedNewsEvent {
  event_key: string;
  category: string;
  urgency: number;
  text: string;
  sources: ParsedNewsSource[];
}

/** Response from news parse pipeline (fetch + parse, at most ~2x/day) */
export interface ParsedNewsResponse {
  data: ParsedNewsEvent[];
  generatedAt: string;
}

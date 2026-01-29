/** Single news article from OpenWebNinja Real-Time News Data API */
export interface NewsArticle {
  title: string;
  link: string;
  snippet: string;
  photo_url: string | null;
  thumbnail_url: string | null;
  published_datetime_utc: string;
  source_name: string;
  source_url: string;
  source_logo_url: string | null;
  source_favicon_url: string | null;
  authors: string[];
  sub_articles?: SubArticle[];
}

export interface SubArticle {
  title: string;
  link: string;
  source_name: string;
  source_url: string;
  source_favicon_url: string | null;
  published_datetime_utc: string;
}

/** OpenWebNinja /search response envelope */
export interface NewsSearchResponse {
  status: string;
  request_id: string;
  data: NewsArticle[];
}

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

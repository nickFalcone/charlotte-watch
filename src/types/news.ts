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

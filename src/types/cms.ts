// CMS (Charlotte-Mecklenburg Schools) Twitter feed from RapidAPI twitter-api47

export interface CMSTweet {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string };
  type?: string;
}

export interface CMSTwitterResponse {
  data: CMSTweet[];
}

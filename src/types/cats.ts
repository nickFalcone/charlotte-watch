// CATS Twitter (X) feed from RapidAPI twitter-api47
export interface CATSTweet {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string };
  type?: string;
}

export interface CATSTwitterResponse {
  data: CATSTweet[];
}

export interface Url {
  id: number;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: string | null;
}

export interface CreateUrlInput {
  url: string;
  expiresAt?: string | null;
}

export interface UrlResponse {
  short_url: string;
  code: string;
  original_url: string;
  created_at: string;
}

export type UrlListResponse = UrlResponse[];

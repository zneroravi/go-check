export interface Url {
  id: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface CreateUrlInput {
  originalUrl: string;
  ttlHours?: number;
}

export interface UrlResponse {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  clicks: number;
  createdAt: Date;
  expiresAt: Date | null;
}

export type UrlListResponse = UrlResponse[];

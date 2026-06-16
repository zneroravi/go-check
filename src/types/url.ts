export interface Url {
  id: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUrlInput {
  originalUrl: string;
  customCode?: string;
}

export interface UrlResponse {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  clicks: number;
  createdAt: Date;
}

export type UrlListResponse = UrlResponse[];

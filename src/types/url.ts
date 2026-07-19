export interface Url {
  id: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
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
  expiresAt?: Date;
}

export interface UrlListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface UrlListResponse {
  links: UrlResponse[];
  total: number;
  page: number;
  limit: number;
}

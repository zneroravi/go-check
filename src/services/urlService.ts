import { UrlModel } from "@/models/Url";
import { CreateUrlInput, UrlResponse, UrlListResponse } from "@/types";
import { generateId, generateShortCode } from "@/utils/helpers";
import { ConflictError } from "@/lib/errors";
import { config } from "@/config";

const MAX_GENERATION_ATTEMPTS = 10;

function toResponse(url: {
  id: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: Date;
  expiresAt?: Date;
}): UrlResponse {
  return {
    id: url.id,
    originalUrl: url.originalUrl,
    shortCode: url.shortCode,
    shortUrl: `${config.baseUrl}/${url.shortCode}`,
    clicks: url.clicks,
    createdAt: url.createdAt,
    expiresAt: url.expiresAt,
  };
}

export class UrlService {
  static createShortUrl(input: CreateUrlInput): UrlResponse {
    let shortCode: string;
    let attempts = 0;

    do {
      shortCode = generateShortCode(config.shortCodeLength);
      attempts++;
    } while (UrlModel.existsByShortCode(shortCode) && attempts < MAX_GENERATION_ATTEMPTS);

    if (UrlModel.existsByShortCode(shortCode)) {
      throw new ConflictError("Could not generate unique short code. Please try again.");
    }

    const url = UrlModel.create({
      id: generateId(),
      originalUrl: input.originalUrl,
      shortCode,
    });

    return toResponse(url);
  }

  static getAllUrls(): UrlResponse[] {
    const urls = UrlModel.findAll();
    return urls.map(toResponse);
  }

  static getAllUrlsPaginated(page: number, limit: number): UrlListResponse {
    const offset = (page - 1) * limit;
    const { urls, total } = UrlModel.findAllPaginated(offset, limit);
    const links = urls.map(toResponse);
    return { links, total, page, limit };
  }

  static getUrlByShortCode(shortCode: string): UrlResponse | undefined {
    const url = UrlModel.findByShortCode(shortCode);
    if (!url) return undefined;
    return toResponse(url);
  }

  static redirectAndTrack(shortCode: string): { originalUrl: string; clicks: number } | undefined {
    const url = UrlModel.findByShortCode(shortCode);
    if (!url) return undefined;
    UrlModel.incrementClicks(shortCode);
    return { originalUrl: url.originalUrl, clicks: url.clicks + 1 };
  }

  static deleteUrl(id: string): boolean {
    return UrlModel.delete(id);
  }
}

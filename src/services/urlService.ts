import { UrlModel } from "@/models/Url";
import { CreateUrlInput, UrlResponse } from "@/types";
import { generateId, generateShortCode } from "@/utils/helpers";
import { ConflictError } from "@/lib/errors";
import { config } from "@/config";

const MAX_GENERATION_ATTEMPTS = 10;

function toResponse(url: { id: string; originalUrl: string; shortCode: string; clicks: number; createdAt: Date; expiresAt: Date | null }): UrlResponse {
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

    // Compute expires_at: if ttlHours is provided and positive, set to now + ttlHours hours
    let expiresAt: string | null = null;
    if (typeof input.ttlHours === "number" && input.ttlHours > 0) {
      expiresAt = new Date(Date.now() + input.ttlHours * 60 * 60 * 1000).toISOString();
    }

    const url = UrlModel.create({
      id: generateId(),
      originalUrl: input.originalUrl,
      shortCode,
      expiresAt,
    });

    return toResponse(url);
  }

  static getAllUrls(): UrlResponse[] {
    const urls = UrlModel.findAll();
    return urls.map(toResponse);
  }

  static getUrlByShortCode(shortCode: string): UrlResponse | undefined {
    const url = UrlModel.findByShortCode(shortCode);
    if (!url) return undefined;
    return toResponse(url);
  }

  static redirectAndTrack(shortCode: string): { originalUrl: string; clicks: number } | undefined {
    const url = UrlModel.findByShortCode(shortCode);
    if (!url) return undefined;

    // If the record has an expires_at in the past, treat it as gone — do not increment clicks
    if (url.expiresAt && new Date(url.expiresAt) <= new Date()) {
      return undefined;
    }

    UrlModel.incrementClicks(shortCode);
    return { originalUrl: url.originalUrl, clicks: url.clicks + 1 };
  }

  static getStats(shortCode: string): { click_count: number } | undefined {
    const stats = UrlModel.getStats(shortCode);
    if (!stats) return undefined;
    return { click_count: stats.clicks };
  }

  static deleteUrl(id: string): boolean {
    return UrlModel.delete(id);
  }

  static purgeExpired(): number {
    return UrlModel.purgeExpired();
  }
}

import { UrlModel } from "@/models/Url";
import { CreateUrlInput, UrlResponse } from "@/types";
import { generateShortCode } from "@/utils/helpers";
import { ConflictError } from "@/lib/errors";
import { config } from "@/config";

const MAX_GENERATION_ATTEMPTS = 100;

function toCreateResponse(url: { id: number; originalUrl: string; shortCode: string; createdAt: string }): UrlResponse {
  return {
    short_url: `${config.baseUrl}/${url.shortCode}`,
    code: url.shortCode,
    original_url: url.originalUrl,
    created_at: url.createdAt,
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
      originalUrl: input.url,
      shortCode,
      expiresAt: input.expiresAt ?? null,
    });

    return toCreateResponse(url);
  }

  static getAllUrls() {
    const urls = UrlModel.findAll();
    return urls.map((u) => ({
      id: u.id,
      originalUrl: u.originalUrl,
      shortCode: u.shortCode,
      shortUrl: `${config.baseUrl}/${u.shortCode}`,
      clicks: u.clicks,
      createdAt: u.createdAt,
      expiresAt: u.expiresAt,
    }));
  }

  static getUrlByShortCode(shortCode: string) {
    const url = UrlModel.findByShortCode(shortCode);
    if (!url) return undefined;
    return {
      id: url.id,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: `${config.baseUrl}/${url.shortCode}`,
      clicks: url.clicks,
      createdAt: url.createdAt,
    };
  }

  static redirectAndTrack(shortCode: string): { originalUrl: string; clicks: number } | undefined {
    const url = UrlModel.findByShortCode(shortCode);
    if (!url) return undefined;
    UrlModel.incrementClicks(shortCode);
    return { originalUrl: url.originalUrl, clicks: url.clicks + 1 };
  }

  static deleteUrl(id: number): boolean {
    return UrlModel.delete(id);
  }
}

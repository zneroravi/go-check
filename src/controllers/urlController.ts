import { Request, Response, NextFunction } from "express";
import { UrlService } from "@/services/urlService";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { z } from "zod";

const createUrlSchema = z.object({
  originalUrl: z.string().url("Invalid URL format"),
  ttlHours: z.coerce.number().int().positive("ttl_hours must be a positive integer").optional(),
});

export class UrlController {
  static async createShortUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createUrlSchema.safeParse(req.body);
      if (!validation.success) {
        throw new BadRequestError(validation.error.issues.map((e: any) => e.message).join(", "));
      }

      const result = UrlService.createShortUrl(validation.data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getAllUrls(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const urls = UrlService.getAllUrls();
      res.json(urls);
    } catch (error) {
      next(error);
    }
  }

  static async redirectToOriginal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shortCode } = req.params;
      if (!shortCode || Array.isArray(shortCode)) {
        throw new BadRequestError("Short code is required");
      }

      const result = UrlService.redirectAndTrack(shortCode);
      if (!result) {
        // Distinguish between "not found" and "expired" by checking the model directly
        const url = UrlService.getUrlByShortCode(shortCode);
        if (url && url.expiresAt && new Date(url.expiresAt) <= new Date()) {
          res.status(410).json({ error: "Short URL has expired" });
          return;
        }
        throw new NotFoundError("Short URL not found");
      }

      res.redirect(302, result.originalUrl);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        throw new BadRequestError("URL ID is required");
      }

      const deleted = UrlService.deleteUrl(id);
      if (!deleted) {
        throw new NotFoundError("URL not found");
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async purgeExpired(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = UrlService.purgeExpired();
      res.json({ deleted });
    } catch (error) {
      next(error);
    }
  }
}

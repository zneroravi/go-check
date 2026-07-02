import { Request, Response, NextFunction } from "express";
import { UrlService } from "@/services/urlService";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { z } from "zod";

const createUrlSchema = z.object({
  url: z.string().url("Invalid URL format"),
  expires_at: z.string().datetime().optional().nullable(),
});

export class UrlController {
  static async createShortUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createUrlSchema.safeParse(req.body);
      if (!validation.success) {
        const messages = validation.error.errors.map((e) => e.message).join(", ");
        throw new BadRequestError(messages);
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
      if (!shortCode) {
        throw new BadRequestError("Short code is required");
      }

      const result = UrlService.redirectAndTrack(shortCode);
      if (!result) {
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
      if (!id) {
        throw new BadRequestError("URL ID is required");
      }

      const deleted = UrlService.deleteUrl(Number(id));
      if (!deleted) {
        throw new NotFoundError("URL not found");
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

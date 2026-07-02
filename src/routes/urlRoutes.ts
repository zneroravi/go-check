import { Router } from "express";
import { UrlController } from "@/controllers/urlController";

const router = Router();

// POST /api/urls/shorten — create a short URL
router.post("/shorten", UrlController.createShortUrl);
// GET /api/urls — list all URLs
router.get("/", UrlController.getAllUrls);
// GET /api/urls/:shortCode — redirect to original URL
router.get("/:shortCode", UrlController.redirectToOriginal);
// DELETE /api/urls/:id — delete a URL
router.delete("/:id", UrlController.deleteUrl);

export default router;

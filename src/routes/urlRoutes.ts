import { Router } from "express";
import { UrlController } from "@/controllers/urlController";

const router = Router();

router.post("/", UrlController.createShortUrl);
router.get("/", UrlController.getAllUrls);
router.get("/:shortCode", UrlController.redirectToOriginal);
router.get("/stats/:code", UrlController.getStats);
router.delete("/:id", UrlController.deleteUrl);
router.post("/purge-expired", UrlController.purgeExpired);

export default router;

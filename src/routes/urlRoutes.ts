import { Router } from "express";
import { UrlController } from "@/controllers/urlController";

const router = Router();

router.post("/", UrlController.createShortUrl);
router.get("/", UrlController.getAllUrls);
router.get("/:shortCode", UrlController.redirectToOriginal);
router.delete("/:id", UrlController.deleteUrl);

export default router;

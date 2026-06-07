import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "@/index";
import { db } from "@/lib/database";

describe("URL Shortener API", () => {
  beforeAll(async () => {
    // Ensure clean state
    db.exec("DELETE FROM urls");
  });

  afterAll(() => {
    db.close();
  });

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /api/urls creates a short URL", async () => {
    const res = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "https://example.com" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("shortCode");
    expect(res.body).toHaveProperty("shortUrl");
    expect(res.body.originalUrl).toBe("https://example.com");
    expect(res.body.clicks).toBe(0);
  });

  it("POST /api/urls returns 400 for invalid URL", async () => {
    const res = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "not-a-url" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("GET /api/urls returns list of URLs", async () => {
    await request(app).post("/api/urls").send({ originalUrl: "https://example.com/1" });
    await request(app).post("/api/urls").send({ originalUrl: "https://example.com/2" });

    const res = await request(app).get("/api/urls");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it("GET /api/urls/:shortCode redirects to original URL", async () => {
    const createRes = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/redirect-test" });

    const shortCode = createRes.body.shortCode;
    const res = await request(app).get(`/api/urls/${shortCode}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com/redirect-test");
  });

  it("GET /api/urls/:shortCode returns 404 for unknown short code", async () => {
    const res = await request(app).get("/api/urls/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Short URL not found");
  });

  it("DELETE /api/urls/:id deletes a URL", async () => {
    const createRes = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/delete-test" });

    const id = createRes.body.id;
    const res = await request(app).delete(`/api/urls/${id}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/urls/${createRes.body.shortCode}`);
    expect(getRes.status).toBe(404);
  });
});

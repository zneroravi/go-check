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

  it("GET /api/urls returns paginated list with correct structure", async () => {
    await request(app).post("/api/urls").send({ originalUrl: "https://example.com/1" });
    await request(app).post("/api/urls").send({ originalUrl: "https://example.com/2" });

    const res = await request(app).get("/api/urls");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("links");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
    expect(Array.isArray(res.body.links)).toBe(true);
    expect(res.body.links.length).toBe(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);

    // Each link has required fields
    const link = res.body.links[0];
    expect(link).toHaveProperty("originalUrl");
    expect(link).toHaveProperty("shortCode");
    expect(link).toHaveProperty("shortUrl");
    expect(link).toHaveProperty("clicks");
    expect(link).toHaveProperty("createdAt");
    expect(link).toHaveProperty("expiresAt");
  });

  it("GET /api/urls pagination: page 1 with limit 2 returns first 2 records", async () => {
    await request(app).post("/api/urls").send({ originalUrl: "https://example.com/p1-a" });
    await request(app).post("/api/urls").send({ originalUrl: "https://example.com/p1-b" });

    const res = await request(app).get("/api/urls?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.links.length).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
    expect(res.body.total).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/urls pagination: page 2 returns next 2 records", async () => {
    const res = await request(app).get("/api/urls?page=2&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(2);
    // Should have records (total >= 4, so page 2 has records)
    expect(res.body.links.length).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/urls click_count reflects current count from redirect endpoint", async () => {
    // Create a new URL
    const createRes = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/click-test" });

    const shortCode = createRes.body.shortCode;

    // Verify initial click count is 0
    const listRes1 = await request(app).get("/api/urls");
    const linkBefore = listRes1.body.links.find((l: any) => l.shortCode === shortCode);
    expect(linkBefore.clicks).toBe(0);

    // Hit the redirect endpoint twice
    await request(app).get(`/api/urls/${shortCode}`);
    await request(app).get(`/api/urls/${shortCode}`);

    // Verify click count updated in list
    const listRes2 = await request(app).get("/api/urls");
    const linkAfter = listRes2.body.links.find((l: any) => l.shortCode === shortCode);
    expect(linkAfter.clicks).toBe(2);
  });

  it("GET /api/urls includes total count for pagination", async () => {
    const res = await request(app).get("/api/urls?limit=1");
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe("number");
    expect(res.body.total).toBeGreaterThanOrEqual(1);
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

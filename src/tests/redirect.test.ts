import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { db } from "@/lib/database";
import app from "@/index";
import { config } from "@/config";

describe("GET /:code redirect endpoint", () => {
  beforeEach(() => {
    db.exec("DELETE FROM urls");
  });

  it("should redirect with 302 for an existing short code", async () => {
    // Create a short URL first via the API
    const createRes = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/test" });

    expect(createRes.status).toBe(201);
    const shortCode = createRes.body.shortCode;

    // Request the redirect
    const redirectRes = await request(app).get(`/${shortCode}`);

    expect(redirectRes.status).toBe(302);
    expect(redirectRes.headers.location).toBe("https://example.com/test");
  });

  it("should increment click_count by 1 after each redirect", async () => {
    // Create a short URL
    const createRes = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/clicks-test" });

    const shortCode = createRes.body.shortCode;
    expect(createRes.body.clicks).toBe(0);

    // First redirect
    const res1 = await request(app).get(`/${shortCode}`);
    expect(res1.status).toBe(302);

    // Verify clicks incremented
    const getRes1 = await request(app).get(`/api/urls`);
    const urlAfterFirst = getRes1.body.find((u: any) => u.shortCode === shortCode);
    expect(urlAfterFirst.clicks).toBe(1);

    // Second redirect
    const res2 = await request(app).get(`/${shortCode}`);
    expect(res2.status).toBe(302);

    // Verify clicks incremented again
    const getRes2 = await request(app).get(`/api/urls`);
    const urlAfterSecond = getRes2.body.find((u: any) => u.shortCode === shortCode);
    expect(urlAfterSecond.clicks).toBe(2);
  });

  it("should return 404 for a non-existent short code", async () => {
    const res = await request(app).get("/nonexistent-code");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("Short URL not found");
  });

  it("should work for codes created via the Shorten endpoint", async () => {
    // Create via Shorten endpoint
    const createRes = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/via-shorten" });

    expect(createRes.status).toBe(201);
    const shortCode = createRes.body.shortCode;
    const shortUrl = createRes.body.shortUrl;

    // The shortUrl from create response should be the same as our redirect path
    expect(shortUrl).toBe(`${config.baseUrl}/${shortCode}`);

    // Redirect via root endpoint
    const redirectRes = await request(app).get(`/${shortCode}`);
    expect(redirectRes.status).toBe(302);
    expect(redirectRes.headers.location).toBe("https://example.com/via-shorten");
  });

  it("should atomically increment clicks under concurrent requests", async () => {
    // Create a short URL
    const createRes = await request(app)
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/concurrent" });

    const shortCode = createRes.body.shortCode;

    // Fire 5 concurrent redirect requests
    const promises = Array.from({ length: 5 }, () => request(app).get(`/${shortCode}`));
    const results = await Promise.all(promises);

    // All should redirect successfully
    results.forEach((res) => expect(res.status).toBe(302));

    // Verify click count is exactly 5
    const getRes = await request(app).get("/api/urls");
    const url = getRes.body.find((u: any) => u.shortCode === shortCode);
    expect(url.clicks).toBe(5);
  });
});

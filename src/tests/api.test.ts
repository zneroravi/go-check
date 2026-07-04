import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "@/index";
import { clearDatabase, getTestDb } from "@/tests/setup";

const BASE_URL = "http://localhost";

describe("URL Shortener API", () => {
  beforeEach(() => {
    clearDatabase();
  });

  // ---------------------------------------------------------------------------
  // 1. POST /api/urls — create short URL
  // ---------------------------------------------------------------------------
  describe("POST /api/urls", () => {
    it("returns 201 and creates a record with a valid URL", async () => {
      const payload = { originalUrl: "https://example.com/some/path" };

      const response = await request(app)
        .post("/api/urls")
        .send(payload)
        .set("Accept", "application/json");

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        originalUrl: payload.originalUrl,
        shortCode: expect.any(String),
        shortUrl: expect.stringContaining(payload.originalUrl.replace(/\/$/, "")),
        clicks: 0,
        createdAt: expect.any(String),
      });

      // Verify the record was actually persisted in the in-memory DB
      const row = getTestDb()
        .prepare("SELECT * FROM urls WHERE short_code = ?")
        .get(response.body.shortCode);
      expect(row).toBeDefined();
      expect(row.original_url).toBe(payload.originalUrl);
    });

    it("returns 400 with an invalid URL", async () => {
      const payload = { originalUrl: "not-a-valid-url" };

      const response = await request(app)
        .post("/api/urls")
        .send(payload)
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/Invalid URL format/);
    });

    it("returns 400 when body is missing originalUrl", async () => {
      const response = await request(app)
        .post("/api/urls")
        .send({})
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 400 when body is empty", async () => {
      const response = await request(app)
        .post("/api/urls")
        .send(null)
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. GET /api/urls — list all URLs
  // ---------------------------------------------------------------------------
  describe("GET /api/urls", () => {
    it("returns an empty array when no URLs exist", async () => {
      const response = await request(app)
        .get("/api/urls")
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("returns paginated results with correct fields", async () => {
      // Seed two URLs directly into the DB
      const db = getTestDb();
      db.run(
        "INSERT INTO urls (id, original_url, short_code) VALUES (?, ?, ?)",
        ["id-1", "https://first.com", "abc123"]
      );
      db.run(
        "INSERT INTO urls (id, original_url, short_code) VALUES (?, ?, ?)",
        ["id-2", "https://second.com", "def456"]
      );

      const response = await request(app)
        .get("/api/urls")
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      // Verify each entry has the expected shape
      for (const entry of response.body) {
        expect(entry).toHaveProperty("id");
        expect(entry).toHaveProperty("originalUrl");
        expect(entry).toHaveProperty("shortCode");
        expect(entry).toHaveProperty("shortUrl");
        expect(entry).toHaveProperty("clicks");
        expect(entry).toHaveProperty("createdAt");
      }

      // Verify ordering (most recently created first)
      expect(response.body[0].shortCode).toBe("def456");
      expect(response.body[1].shortCode).toBe("abc123");
    });

    it("returns correct shortUrl field format", async () => {
      const db = getTestDb();
      db.run(
        "INSERT INTO urls (id, original_url, short_code) VALUES (?, ?, ?)",
        ["id-3", "https://example.org", "xyz789"]
      );

      const response = await request(app).get("/api/urls");

      expect(response.status).toBe(200);
      expect(response.body[0].shortUrl).toBe("http://localhost:3000/xyz789");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GET /api/urls/:shortCode — redirect and increment clicks
  // ---------------------------------------------------------------------------
  describe("GET /api/urls/:shortCode", () => {
    it("redirects with 302 and increments click_count", async () => {
      const db = getTestDb();
      db.run(
        "INSERT INTO urls (id, original_url, short_code, clicks) VALUES (?, ?, ?, ?)",
        ["id-redir", "https://destination.com", "redir1", 5]
      );

      const response = await request(app).get("/api/urls/redir1");

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("https://destination.com");

      // Verify clicks were incremented in the DB
      const row = db
        .prepare("SELECT clicks FROM urls WHERE short_code = ?")
        .get("redir1") as { clicks: number };
      expect(row.clicks).toBe(6);
    });

    it("returns 404 for an unknown short code", async () => {
      const response = await request(app).get("/api/urls/doesnotexist");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Short URL not found");
    });

    it("increments clicks on each redirect call", async () => {
      const db = getTestDb();
      db.run(
        "INSERT INTO urls (id, original_url, short_code, clicks) VALUES (?, ?, ?, ?)",
        ["id-multi", "https://multi.com", "multi1", 0]
      );

      await request(app).get("/api/urls/multi1");
      await request(app).get("/api/urls/multi1");
      await request(app).get("/api/urls/multi1");

      const row = db
        .prepare("SELECT clicks FROM urls WHERE short_code = ?")
        .get("multi1") as { clicks: number };
      expect(row.clicks).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. DELETE /api/urls/:id — delete a URL
  // ---------------------------------------------------------------------------
  describe("DELETE /api/urls/:id", () => {
    it("returns 200 and removes the record", async () => {
      const db = getTestDb();
      db.run(
        "INSERT INTO urls (id, original_url, short_code) VALUES (?, ?, ?)",
        ["id-del", "https://delete-me.com", "del1"]
      );

      const deleteResponse = await request(app).delete("/api/urls/id-del");

      expect(deleteResponse.status).toBe(204);

      // Verify the record is gone from the DB
      const row = db
        .prepare("SELECT * FROM urls WHERE id = ?")
        .get("id-del");
      expect(row).toBeUndefined();
    });

    it("subsequent GET returns 404 after deletion", async () => {
      const db = getTestDb();
      db.run(
        "INSERT INTO urls (id, original_url, short_code) VALUES (?, ?, ?)",
        ["id-del2", "https://gone.com", "gone1"]
      );

      await request(app).delete("/api/urls/id-del2");

      const getResponse = await request(app).get("/api/urls/gone1");
      expect(getResponse.status).toBe(404);
      expect(getResponse.body.error).toBe("Short URL not found");
    });

    it("returns 404 when deleting an unknown id", async () => {
      const response = await request(app).delete("/api/urls/nonexistent-id");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("URL not found");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Integration: full lifecycle (create → redirect → list → delete)
  // ---------------------------------------------------------------------------
  describe("Full lifecycle integration", () => {
    it("create → redirect → list → delete works end-to-end", async () => {
      // 1. Create
      const createRes = await request(app)
        .post("/api/urls")
        .send({ originalUrl: "https://lifecycle.test/path" });

      expect(createRes.status).toBe(201);
      const shortCode = createRes.body.shortCode;
      const id = createRes.body.id;

      // 2. Redirect
      const redirectRes = await request(app).get(`/api/urls/${shortCode}`);
      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.location).toBe("https://lifecycle.test/path");

      // 3. List
      const listRes = await request(app).get("/api/urls");
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].shortCode).toBe(shortCode);
      expect(listRes.body[0].clicks).toBe(1);

      // 4. Delete
      const deleteRes = await request(app).delete(`/api/urls/${id}`);
      expect(deleteRes.status).toBe(204);

      // 5. Verify gone
      const afterDelete = await request(app).get(`/api/urls/${shortCode}`);
      expect(afterDelete.status).toBe(404);

      const afterList = await request(app).get("/api/urls");
      expect(afterList.body).toHaveLength(0);
    });
  });
});

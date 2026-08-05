# urlstash

A lightweight Express.js REST API for shortening URLs. Create short links, redirect to original URLs, track click counts, and manage URL lifecycle — all backed by SQLite.

---

## Features

- **Create short URLs** — shorten any valid URL with an optional time-to-live (TTL)
- **Redirect** — `GET /:shortCode` resolves and redirects to the original URL
- **Click tracking** — every redirect increments a click counter automatically
- **List all URLs** — retrieve every shortened URL with its metadata
- **Per-URL stats** — query click count for a specific short code
- **Delete URLs** — remove a shortened URL by its internal ID
- **TTL / expiry** — URLs can be created with a `ttlHours` value; expired URLs return `410 Gone`
- **Purge expired** — bulk-delete all expired entries via a dedicated endpoint
- **Health check** — `GET /health` for uptime monitoring
- **Input validation** — request bodies validated with Zod schemas
- **Security headers** — Helmet middleware applied globally
- **CORS enabled** — configurable cross-origin support
- **Structured logging** — HTTP request logging via Morgan
- **Graceful error handling** — operational errors return structured JSON; stack traces included in development mode
- **SQLite with WAL mode** — durable, file-based storage with Write-Ahead Logging for concurrency safety
- **Automatic schema migration** — `expires_at` column added on startup if missing

---

## Project Structure

```
urlstash/
├── src/
│   ├── config/
│   │   └── index.ts          # App configuration (PORT, BASE_URL, SHORT_CODE_LENGTH)
│   ├── controllers/
│   │   └── urlController.ts  # HTTP handlers — request parsing, response formatting
│   ├── lib/
│   │   ├── database.ts       # better-sqlite3 connection, schema creation, migration
│   │   ├── errors.ts         # Custom error classes (AppError, BadRequestError, …)
│   │   └── logger.ts         # Structured logger
│   ├── middleware/
│   │   └── validation.ts     # Generic Zod-based request body validator
│   ├── models/
│   │   └── Url.ts            # Data-access layer — all SQL queries against the urls table
│   ├── routes/
│   │   └── urlRoutes.ts      # Route definitions mounted under /api/urls
│   ├── services/
│   │   └── urlService.ts     # Business logic — short-code generation, TTL, click tracking
│   ├── tests/
│   │   ├── setup.ts          # In-memory test database helper
│   │   ├── api.test.ts       # Integration tests for API endpoints
│   │   ├── redirect.test.ts  # Redirect and expiry behaviour tests
│   │   └── url.test.ts       # Service-layer unit tests
│   ├── types/
│   │   ├── index.ts          # Barrel export for all types
│   │   └── url.ts            # Url, CreateUrlInput, UrlResponse interfaces
│   ├── utils/
│   │   └── helpers.ts        # generateShortCode (crypto-random), generateId (UUID v4)
│   └── index.ts              # Express app bootstrap, middleware, error handlers
├── .env.example               # Environment variable template
├── tsconfig.json              # TypeScript compiler configuration
├── vitest.config.ts           # Vitest test runner configuration
└── package.json               # Dependencies and scripts
```

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Runtime      | Node.js (ESM)                       |
| Framework    | Express.js                          |
| Language     | TypeScript                          |
| Database     | SQLite (via `better-sqlite3`)       |
| Validation   | Zod                                 |
| Logging      | Morgan (HTTP) + custom logger       |
| Security     | Helmet                              |
| Testing      | Vitest + Supertest                  |
| Transpiler   | tsx (dev) / tsc (build)             |

---

## Installation

### Prerequisites

- Node.js >= 18
- npm (or pnpm / yarn)

### Steps

```bash
# 1. Clone the repository

git clone https://github.com/your-org/urlstash.git
cd urlstash

# 2. Install dependencies

npm install

# 3. Copy the example environment file and adjust values if needed

cp .env.example .env

# 4. Ensure the data directory exists (the DB file is written here)

mkdir -p data

# 5. Start the development server

npm run dev

# 6. (Optional) Run the test suite

npm test
```

---

## Configuration

| Variable             | Description                              | Default               |
|----------------------|------------------------------------------|-----------------------|
| `PORT`               | Port the server listens on               | `3000`                |
| `BASE_URL`           | Public base URL used in `shortUrl` field | `http://localhost:3000` |
| `SHORT_CODE_LENGTH`  | Number of characters in each short code  | `6`                   |

---

## API Reference

Base URL: `http://localhost:3000`

All URL-list endpoints are mounted under `/api/urls`. The root-level redirect endpoint lives at `/:shortCode`.

### Create a short URL

```
POST /api/urls
```

**Request body:**

```json
{
  "originalUrl": "https://example.com/very/long/path",
  "ttlHours": 24
}
```

| Field       | Type     | Required | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| `originalUrl` | `string` | Yes      | The URL to shorten (must be a valid absolute URL) |
| `ttlHours`   | `number` | No       | Optional TTL in hours; URL expires after this    |

**Response `201 Created`:**

```json
{
  "id": "a1b2c3d4-...",
  "originalUrl": "https://example.com/very/long/path",
  "shortCode": "xY7kL2",
  "shortUrl": "http://localhost:3000/xY7kL2",
  "clicks": 0,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "expiresAt": "2025-01-16T10:30:00.000Z"
}
```

---

### List all URLs

```
GET /api/urls
```

**Response `200 OK`:**

```json
[
  {
    "id": "a1b2c3d4-...",
    "originalUrl": "https://example.com/very/long/path",
    "shortCode": "xY7kL2",
    "shortUrl": "http://localhost:3000/xY7kL2",
    "clicks": 42,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "expiresAt": null
  }
]
```

---

### Redirect to original URL

```
GET /:shortCode
```

Resolves the short code and issues a `302 Found` redirect to the original URL. The click counter is incremented on each successful redirect.

**Response `302 Found`** — `Location` header set to the original URL.

**Response `404 Not Found`** — short code does not exist.

**Response `410 Gone`** — short code exists but the URL has expired.

---

### Get URL stats

```
GET /api/urls/stats/:code
```

Returns the click count for the given short code.

**Response `200 OK`:**

```json
{
  "click_count": 42
}
```

**Response `404 Not Found`** — short code does not exist.

---

### Delete a URL

```
DELETE /api/urls/:id
```

Permanently removes the URL entry identified by its internal UUID.

**Response `204 No Content`** — deleted successfully.

**Response `404 Not Found`** — ID does not exist.

---

### Purge expired URLs

```
POST /api/urls/purge-expired
```

Deletes all entries whose `expires_at` is in the past.

**Response `200 OK`:**

```json
{
  "deleted": 3
}
```

---

### Health check

```
GET /health
```

**Response `200 OK`:**

```json
{ "status": "ok" }
```

---

## Error Responses

All errors follow a consistent JSON shape:

```json
{ "error": "Human-readable error message" }
```

In development mode (`NODE_ENV=development`), the response also includes a `stack` field.

| Status | Meaning                                       |
|--------|-----------------------------------------------|
| 400    | Bad request — invalid input or missing params |
| 404    | Resource not found                            |
| 409    | Conflict — could not generate unique short code |
| 410    | Gone — short URL has expired                  |
| 500    | Internal server error                         |

---

## Usage Examples

### cURL

```bash
# Create a short URL
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com/article/123", "ttlHours": 48}'

# List all URLs
curl http://localhost:3000/api/urls

# Get stats
curl http://localhost:3000/api/urls/stats/xY7kL2

# Delete a URL
curl -X DELETE http://localhost:3000/api/urls/a1b2c3d4-1111-2222-3333-444455556666

# Purge expired URLs
curl -X POST http://localhost:3000/api/urls/purge-expired

# Health check
curl http://localhost:3000/health
```

### JavaScript (fetch)

```js
const BASE = "http://localhost:3000";

// Create
const res = await fetch(`${BASE}/api/urls`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ originalUrl: "https://example.com", ttlHours: 24 }),
});
const data = await res.json();
console.log("Short URL:", data.shortUrl);

// List
const list = await fetch(`${BASE}/api/urls`).then((r) => r.json());
console.log("All URLs:", list);
```

---

## Running Tests

```bash
npm test
```

Tests use an in-memory SQLite database (no file I/O) and cover:
- API endpoint integration (create, list, redirect, delete, purge)
- Redirect behaviour including expired-URL handling
- Service-layer logic (short-code generation, TTL, click tracking)

---

## License

MIT — see [LICENSE](./LICENSE) for details.

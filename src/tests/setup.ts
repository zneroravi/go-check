import { vi } from "vitest";
import Database from "better-sqlite3";

// Create an in-memory SQLite database for test isolation
const testDb = new Database(":memory:");

testDb.pragma("journal_mode = WAL");
testDb.pragma("foreign_keys = ON");

testDb.exec(`
  CREATE TABLE IF NOT EXISTS urls (
    id TEXT PRIMARY KEY,
    original_url TEXT NOT NULL,
    short_code TEXT NOT NULL UNIQUE,
    clicks INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Mock the database module so the app uses the in-memory DB during tests
vi.mock("@/lib/database", () => ({
  db: testDb,
  default: testDb,
}));

// Helper to clear all records between tests
export function clearDatabase(): void {
  testDb.exec("DELETE FROM urls");
}

// Helper to get the raw db instance for assertions
export function getTestDb(): Database.Database {
  return testDb;
}

import { beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/database";

beforeAll(() => {
  // Ensure test database is clean
  db.exec("DELETE FROM urls");
});

beforeEach(() => {
  db.exec("DELETE FROM urls");
});

afterAll(() => {
  db.close();
});

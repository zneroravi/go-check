import { db } from "@/lib/database";
import { Url } from "@/types";

const SELECT_COLUMNS = `
  id,
  original_url as originalUrl,
  short_code as shortCode,
  clicks,
  created_at as createdAt,
  updated_at as updatedAt
`;

export class UrlModel {
  static findAll(): Url[] {
    const stmt = db.prepare(`SELECT ${SELECT_COLUMNS} FROM urls ORDER BY created_at DESC`);
    return stmt.all() as Url[];
  }

  static findByShortCode(shortCode: string): Url | undefined {
    const stmt = db.prepare(`SELECT ${SELECT_COLUMNS} FROM urls WHERE short_code = ?`);
    return stmt.get(shortCode) as Url | undefined;
  }

  static findById(id: string): Url | undefined {
    const stmt = db.prepare(`SELECT ${SELECT_COLUMNS} FROM urls WHERE id = ?`);
    return stmt.get(id) as Url | undefined;
  }

  static create(data: { id: string; originalUrl: string; shortCode: string }): Url {
    const stmt = db.prepare(`
      INSERT INTO urls (id, original_url, short_code)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(data.id, data.originalUrl, data.shortCode);
    return this.findById(data.id)!;
  }

  static incrementClicks(shortCode: string): void {
    const stmt = db.prepare(`UPDATE urls SET clicks = clicks + 1, updated_at = datetime('now') WHERE short_code = ?`);
    stmt.run(shortCode);
  }

  static delete(id: string): boolean {
    const stmt = db.prepare(`DELETE FROM urls WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static existsByShortCode(shortCode: string): boolean {
    const stmt = db.prepare(`SELECT 1 FROM urls WHERE short_code = ?`);
    return !!stmt.get(shortCode);
  }
}

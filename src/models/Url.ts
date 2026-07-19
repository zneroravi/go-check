import { db } from "@/lib/database";
import { Url } from "@/types";

const SELECT_COLUMNS = `
  id,
  original_url as originalUrl,
  short_code as shortCode,
  clicks,
  created_at as createdAt,
  updated_at as updatedAt,
  expires_at as expiresAt
`;

export class UrlModel {
  static findAll(): Url[] {
    const stmt = db.prepare(`SELECT ${SELECT_COLUMNS} FROM urls ORDER BY created_at DESC`);
    return stmt.all() as Url[];
  }

  static findAllPaginated(offset: number, limit: number): { urls: Url[]; total: number } {
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM urls`);
    const total = (countStmt.get() as { count: number }).count;

    const stmt = db.prepare(
      `SELECT ${SELECT_COLUMNS} FROM urls ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    const urls = stmt.all(limit, offset) as Url[];

    return { urls, total };
  }

  static findByShortCode(shortCode: string): Url | undefined {
    const stmt = db.prepare(`SELECT ${SELECT_COLUMNS} FROM urls WHERE short_code = ?`);
    return stmt.get(shortCode) as Url | undefined;
  }

  static findById(id: string): Url | undefined {
    const stmt = db.prepare(`SELECT ${SELECT_COLUMNS} FROM urls WHERE id = ?`);
    return stmt.get(id) as Url | undefined;
  }

  static create(data: { id: string; originalUrl: string; shortCode: string; expiresAt?: Date }): Url {
    const stmt = db.prepare(`
      INSERT INTO urls (id, original_url, short_code, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(data.id, data.originalUrl, data.shortCode, data.expiresAt ?? null);
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

  static deleteByShortCode(shortCode: string): boolean {
    const stmt = db.prepare(`DELETE FROM urls WHERE short_code = ?`);
    const result = stmt.run(shortCode);
    return result.changes > 0;
  }

  static existsByShortCode(shortCode: string): boolean {
    const stmt = db.prepare(`SELECT 1 FROM urls WHERE short_code = ?`);
    return !!stmt.get(shortCode);
  }
}

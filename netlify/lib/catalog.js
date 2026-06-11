import { getDb } from './db.js';

function stripReadStatus(book) {
  const { readStatus, ...rest } = book;
  return rest;
}

export function sanitizeCatalog(books) {
  if (!Array.isArray(books)) return [];
  return books
    .filter((b) => b?.id && b?.title)
    .map((b) => {
      const clean = stripReadStatus(b);
      return {
        id: String(clean.id).trim(),
        title: String(clean.title || '').trim(),
        category: String(clean.category || '기타').trim(),
        volumes: String(clean.volumes || '').trim(),
        notes: String(clean.notes || '').trim(),
        coverImageUrl: String(clean.coverImageUrl || '').trim(),
      };
    });
}

function rowToBook(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    volumes: row.volumes,
    notes: row.notes,
    coverImageUrl: row.cover_image_url,
  };
}

export async function getCatalog() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT * FROM books ORDER BY sort_order, id');
  if (rows.length === 0) return null;
  return rows.map(rowToBook);
}

export async function saveCatalog(books) {
  const clean = sanitizeCatalog(books);
  const db = await getDb();

  const statements = [
    'DELETE FROM books',
    ...clean.map((b, idx) => ({
      sql: `INSERT INTO books (id, title, category, volumes, notes, cover_image_url, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [b.id, b.title, b.category, b.volumes, b.notes, b.coverImageUrl, idx],
    })),
  ];

  await db.batch(statements, 'write');
  return clean;
}

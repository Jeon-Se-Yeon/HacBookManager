import { getDb } from './db.js';
import { verifySessionToken } from './session.js';

const VALID_STATUSES = new Set(['unread', 'reading', 'read']);

function normalizeUserId(userId) {
  return String(userId).trim().toLowerCase();
}

function sanitizeStatusMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [bookId, status] of Object.entries(raw)) {
    if (!bookId) continue;
    if (VALID_STATUSES.has(status)) {
      out[bookId] = status;
    }
  }
  return out;
}

export function verifyRequestToken(token) {
  return verifySessionToken(token);
}

export async function getReadStatusMap(userId) {
  const db = await getDb();
  const { rows } = await db.execute({
    sql: 'SELECT book_id, status FROM read_status WHERE user_id = ?',
    args: [normalizeUserId(userId)],
  });

  const map = {};
  for (const row of rows) {
    map[row.book_id] = row.status;
  }
  return map;
}

export async function saveReadStatusMap(userId, statusMap) {
  const uid = normalizeUserId(userId);
  const clean = sanitizeStatusMap(statusMap);
  const now = new Date().toISOString();
  const db = await getDb();

  const statements = [
    { sql: 'DELETE FROM read_status WHERE user_id = ?', args: [uid] },
    ...Object.entries(clean).map(([bookId, status]) => ({
      sql: `INSERT INTO read_status (user_id, book_id, status, updated_at)
            VALUES (?, ?, ?, ?)`,
      args: [uid, bookId, status, now],
    })),
  ];

  await db.batch(statements, 'write');
  return clean;
}

export async function patchReadStatus(userId, bookId, readStatus) {
  const uid = normalizeUserId(userId);

  if (VALID_STATUSES.has(readStatus)) {
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO read_status (user_id, book_id, status, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (user_id, book_id) DO UPDATE
            SET status = excluded.status, updated_at = excluded.updated_at`,
      args: [uid, String(bookId), readStatus, new Date().toISOString()],
    });
  }

  return getReadStatusMap(uid);
}

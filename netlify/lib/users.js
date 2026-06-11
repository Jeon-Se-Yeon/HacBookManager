import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

export function successResponse(payload, status = 200) {
  return jsonResponse({ ok: true, ...payload }, status);
}

function normalizeId(userId) {
  return String(userId || '').trim().toLowerCase();
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: row.created_at,
  };
}

function parseSeedUsers() {
  const raw = process.env.HAC_USERS_JSON;
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('Invalid HAC_USERS_JSON');
    return [];
  }
}

export async function ensureUsersInitialized() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT COUNT(*) AS cnt FROM users');
  if (Number(rows[0].cnt) > 0) return;

  for (const entry of parseSeedUsers()) {
    const id = normalizeId(entry.id);
    if (!id || !entry.password) continue;
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, name, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        id,
        String(entry.name || id).trim(),
        await bcrypt.hash(String(entry.password), 10),
        entry.role === 'admin' ? 'admin' : 'user',
        new Date().toISOString(),
      ],
    });
  }
}

export async function findUserById(userId) {
  const id = normalizeId(userId);
  if (!id) return null;

  await ensureUsersInitialized();
  const db = await getDb();
  const { rows } = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  });
  return rowToUser(rows[0]);
}

export async function verifyUserPassword(user, password) {
  if (!user?.passwordHash) return false;
  return bcrypt.compare(String(password), user.passwordHash);
}

export async function createUser({ userId, password, name, role }) {
  const id = normalizeId(userId);
  const cleanName = String(name || '').trim();
  const cleanPassword = String(password || '');

  if (!id || !cleanPassword || !cleanName) {
    throw new Error('INVALID_INPUT');
  }

  const existing = await findUserById(id);
  if (existing) {
    throw new Error('DUPLICATE_ID');
  }

  const user = {
    id,
    name: cleanName,
    passwordHash: await bcrypt.hash(cleanPassword, 10),
    role: role === 'admin' ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  };

  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO users (id, name, password_hash, role, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [user.id, user.name, user.passwordHash, user.role, user.createdAt],
  });
  return user;
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role || 'user',
  };
}

export function getAdminSignupCode() {
  return process.env.HAC_ADMIN_SIGNUP_CODE || null;
}

export async function verifyAdmin(adminId, adminPassword) {
  const user = await findUserById(adminId);
  if (!user || user.role !== 'admin') return null;
  const valid = await verifyUserPassword(user, adminPassword);
  return valid ? user : null;
}

export async function listUsersPublic() {
  await ensureUsersInitialized();
  const db = await getDb();
  const { rows } = await db.execute('SELECT id, name, role, created_at FROM users');
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role === 'admin' ? 'admin' : 'user',
      createdAt: r.created_at || null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'ko'));
}

export async function updateUserByAdmin({ targetUserId, name, role, password }) {
  const id = normalizeId(targetUserId);
  if (!id) throw new Error('INVALID_INPUT');

  const existing = await findUserById(id);
  if (!existing) throw new Error('NOT_FOUND');

  const cleanName = name != null ? String(name).trim() : existing.name;
  if (!cleanName) throw new Error('INVALID_INPUT');

  const nextRole = role === 'admin' ? 'admin' : role === 'user' ? 'user' : existing.role;

  let passwordHash = existing.passwordHash;
  if (password != null && String(password).trim()) {
    passwordHash = await bcrypt.hash(String(password).trim(), 10);
  }

  const db = await getDb();
  await db.execute({
    sql: 'UPDATE users SET name = ?, role = ?, password_hash = ? WHERE id = ?',
    args: [cleanName, nextRole, passwordHash, id],
  });

  return { ...existing, name: cleanName, role: nextRole, passwordHash };
}

export async function deleteUserByAdmin(targetUserId) {
  const id = normalizeId(targetUserId);
  if (!id) throw new Error('INVALID_INPUT');

  const existing = await findUserById(id);
  if (!existing) throw new Error('NOT_FOUND');

  const db = await getDb();
  if (existing.role === 'admin') {
    const { rows } = await db.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'");
    if (Number(rows[0].cnt) <= 1) {
      throw new Error('LAST_ADMIN');
    }
  }

  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM read_status WHERE user_id = ?', args: [id] });
}

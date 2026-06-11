// 배포(Netlify): TURSO_DATABASE_URL + TURSO_AUTH_TOKEN 환경 변수 사용
//   → 네이티브 바이너리가 없는 web(HTTP) 클라이언트 사용 (람다에서 안전)
// 로컬 개발: 환경 변수가 없으면 .data/hac-book.db SQLite 파일 사용
//   → 파일 접근이 필요하므로 Node 클라이언트 사용
const DEFAULT_LOCAL_DB = 'file:.data/hac-book.db';

let client = null;
let schemaReady = null;

async function createDbClient() {
  const url = process.env.TURSO_DATABASE_URL || DEFAULT_LOCAL_DB;

  if (url.startsWith('file:')) {
    if (process.env.NETLIFY === 'true') {
      throw new Error('TURSO_DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }
    const [{ createClient }, { mkdirSync }, { dirname, resolve }] = await Promise.all([
      import('@libsql/client'),
      import('node:fs'),
      import('node:path'),
    ]);
    const filePath = resolve(url.slice('file:'.length));
    mkdirSync(dirname(filePath), { recursive: true });
    return createClient({ url: `file:${filePath}` });
  }

  const { createClient } = await import('@libsql/client/web');
  return createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

async function ensureSchema(db) {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '기타',
        volumes TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        cover_image_url TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS read_status (
        user_id TEXT NOT NULL,
        book_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('unread', 'reading', 'read')),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, book_id)
      )`,
    ],
    'write'
  );
}

export async function getDb() {
  if (!client) {
    client = await createDbClient();
  }
  if (!schemaReady) {
    schemaReady = ensureSchema(client).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
  return client;
}

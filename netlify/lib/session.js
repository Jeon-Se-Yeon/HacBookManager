import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret() {
  return (
    process.env.HAC_SESSION_SECRET ||
    process.env.HAC_ADMIN_SIGNUP_CODE ||
    'hac-session-fallback-change-me'
  );
}

export function createSessionToken(userId) {
  const sub = String(userId || '').trim().toLowerCase();
  if (!sub) return null;

  const payload = JSON.stringify({ sub, exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = createHmac('sha256', getSessionSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', getSessionSecret()).update(payloadB64).digest('base64url');

  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload?.sub || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

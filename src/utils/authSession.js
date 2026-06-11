const SESSION_KEY = 'hac_auth_session';

// 로그인 세션 유지 시간 — 이 시간이 지나면 자동 로그아웃됩니다.
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30분

export function saveAuthSession(user, token) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ user, token: token || null, expiresAt })
  );
  return expiresAt;
}

export function loadAuthSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const expiresAt = typeof parsed?.expiresAt === 'number' ? parsed.expiresAt : null;
      // 만료됐거나 만료 시각이 없는 (구버전) 세션은 폐기
      if (!expiresAt || expiresAt <= Date.now()) {
        clearAuthSession();
        return { user: null, token: null, expiresAt: null };
      }
      return {
        user: parsed?.user || null,
        token: parsed?.token || null,
        expiresAt,
      };
    }
    return { user: null, token: null, expiresAt: null };
  } catch {
    return { user: null, token: null, expiresAt: null };
  }
}

export function clearAuthSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('hac_auth_user');
}

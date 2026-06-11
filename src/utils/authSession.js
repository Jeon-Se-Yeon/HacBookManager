const SESSION_KEY = 'hac_auth_session';

export function saveAuthSession(user, token) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, token: token || null }));
}

export function loadAuthSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        user: parsed?.user || null,
        token: parsed?.token || null,
      };
    }
    const legacy = sessionStorage.getItem('hac_auth_user');
    if (legacy) {
      return { user: JSON.parse(legacy), token: null };
    }
    return { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

export function clearAuthSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('hac_auth_user');
}

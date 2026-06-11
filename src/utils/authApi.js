async function parseJsonResponse(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/** Netlify Functions canonical path (works on deploy + netlify dev) */
function authFunctionUrl(name) {
  const base = import.meta.env.VITE_AUTH_API_BASE || '/.netlify/functions';
  return `${base.replace(/\/$/, '')}/${name}`;
}

async function postAuth(name, body) {
  const res = await fetch(authFunctionUrl(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || !data.ok) {
    throw new Error(data.error || '요청에 실패했습니다.');
  }
  return data;
}

export async function loginWithServer(userId, password) {
  const data = await postAuth('auth-login', { userId, password });
  return { user: data.user, token: data.token || null };
}

export async function signupWithServer({ userId, password, name, role, adminCode }) {
  const data = await postAuth('auth-signup', { userId, password, name, role, adminCode });
  return { user: data.user, token: data.token || null };
}

export async function adminUsersRequest({ adminId, adminPassword, action, ...rest }) {
  const data = await postAuth('auth-users-admin', {
    adminId,
    adminPassword,
    action,
    ...rest,
  });
  return data;
}

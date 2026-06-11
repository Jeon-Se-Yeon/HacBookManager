async function parseJsonResponse(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function readStatusUrl() {
  const base = import.meta.env.VITE_AUTH_API_BASE || '/.netlify/functions';
  return `${base.replace(/\/$/, '')}/read-status`;
}

async function postReadStatus(body) {
  const res = await fetch(readStatusUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || !data.ok) {
    throw new Error(data.error || '독서 상태 동기화에 실패했습니다.');
  }
  return data;
}

export async function fetchReadStatusFromServer(token) {
  const data = await postReadStatus({ action: 'get', token });
  return data.statusMap && typeof data.statusMap === 'object' ? data.statusMap : {};
}

export async function saveReadStatusToServer(token, statusMap) {
  const data = await postReadStatus({ action: 'save', token, statusMap });
  return data.statusMap || statusMap;
}

export async function patchReadStatusOnServer(token, bookId, readStatus) {
  const data = await postReadStatus({ action: 'patch', token, bookId, readStatus });
  return data.statusMap || {};
}

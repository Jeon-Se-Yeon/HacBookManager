async function parseJsonResponse(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function catalogUrl() {
  const base = import.meta.env.VITE_AUTH_API_BASE || '/.netlify/functions';
  return `${base.replace(/\/$/, '')}/books-catalog`;
}

async function postCatalog(body) {
  const res = await fetch(catalogUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || !data.ok) {
    throw new Error(data.error || '서적 목록 동기화에 실패했습니다.');
  }
  return data;
}

export async function fetchCatalogFromServer(token) {
  const data = await postCatalog({ action: 'get', token });
  return Array.isArray(data.catalog) ? data.catalog : [];
}

export async function saveCatalogToServer(token, catalog) {
  const data = await postCatalog({ action: 'save', token, catalog });
  return Array.isArray(data.catalog) ? data.catalog : catalog;
}

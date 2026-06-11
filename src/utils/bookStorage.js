import {
  fetchReadStatusFromServer,
  saveReadStatusToServer,
} from './readStatusApi';
import { fetchCatalogFromServer, saveCatalogToServer } from './catalogApi';

const CATALOG_KEY = 'hac_books_catalog';

export function normalizeUserId(userId) {
  if (!userId) return null;
  return String(userId).trim().toLowerCase();
}

export function getReadStatusStorageKey(userId) {
  const id = normalizeUserId(userId);
  return id ? `hac_read_status_${id}` : 'hac_read_status_guest';
}

export function getLegacyBooksStorageKey(userId) {
  const id = normalizeUserId(userId);
  return id ? `hac_books_${id}` : 'hac_books_guest';
}

function stripReadStatus(book) {
  const { readStatus, ...rest } = book;
  return rest;
}

export function loadReadStatusMap(userId) {
  const key = getReadStatusStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveReadStatusMap(userId, statusMap) {
  localStorage.setItem(getReadStatusStorageKey(userId), JSON.stringify(statusMap));
}

export function loadCatalog() {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(stripReadStatus) : null;
  } catch {
    return null;
  }
}

export function saveCatalogLocal(catalog) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog.map(stripReadStatus)));
}

/** @deprecated use saveCatalogLocal */
export function saveCatalog(catalog) {
  saveCatalogLocal(catalog);
}

export function mergeBooksWithReadStatus(catalog, statusMap) {
  return catalog.map((book) => ({
    ...book,
    readStatus: statusMap[book.id] || 'unread',
  }));
}

function mergeLegacyReadStatus(statusMap, legacyBooks) {
  const next = { ...statusMap };
  let changed = false;

  legacyBooks.forEach((book) => {
    if (!book?.id) return;
    if (next[book.id] != null) return;

    const legacyStatus = book.readStatus;
    if (legacyStatus === 'reading' || legacyStatus === 'read') {
      next[book.id] = legacyStatus;
      changed = true;
    }
  });

  return { map: next, changed };
}

function prepareLocalCatalogAndStatus(userId, initialBooks) {
  let catalog = loadCatalog();
  let statusMap = loadReadStatusMap(userId);
  const hadSavedStatus = Object.keys(statusMap).length > 0;

  const legacyKey = getLegacyBooksStorageKey(userId);
  const legacyRaw = localStorage.getItem(legacyKey);

  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy) && legacy.length > 0) {
        if (!catalog) {
          catalog = legacy.map(stripReadStatus);
          saveCatalogLocal(catalog);
        }

        if (!hadSavedStatus) {
          const { map, changed } = mergeLegacyReadStatus(statusMap, legacy);
          statusMap = map;
          if (changed) {
            saveReadStatusMap(userId, statusMap);
          }
        }
      }
    } catch {
      /* ignore */
    }
    localStorage.removeItem(legacyKey);
  }

  if (!catalog) {
    catalog = initialBooks.map(stripReadStatus);
    saveCatalogLocal(catalog);
  }

  return { catalog, statusMap };
}

async function syncReadStatus(userId, token, localMap) {
  let statusMap = { ...localMap };

  if (token && userId) {
    try {
      const serverMap = await fetchReadStatusFromServer(token);
      statusMap = { ...statusMap, ...serverMap };
      await saveReadStatusToServer(token, statusMap);
    } catch (err) {
      console.warn('Read status server sync failed, using local cache:', err.message);
    }
  }

  saveReadStatusMap(userId, statusMap);
  return statusMap;
}

/** Load catalog (server) + read status; seed server catalog when empty (admin) */
export async function initializeBooks(userId, token, initialBooks, isAdmin = false) {
  const localPrepared = prepareLocalCatalogAndStatus(userId, initialBooks);
  let catalog = localPrepared.catalog;
  let statusMap = localPrepared.statusMap;

  if (token && userId) {
    try {
      const serverCatalog = await fetchCatalogFromServer(token);
      if (serverCatalog.length > 0) {
        catalog = serverCatalog;
        saveCatalogLocal(catalog);
      } else if (isAdmin) {
        catalog = await saveCatalogToServer(token, localPrepared.catalog);
        saveCatalogLocal(catalog);
      } else {
        saveCatalogLocal(catalog);
      }
    } catch (err) {
      console.warn('Catalog server sync failed, using local cache:', err.message);
    }
  }

  statusMap = await syncReadStatus(userId, token, statusMap);

  return {
    catalog,
    statusMap,
    books: sortBooksByTitle(mergeBooksWithReadStatus(catalog, statusMap)),
  };
}

/** Save catalog locally; push to server when admin */
export async function pushCatalogToServer(token, catalog, isAdmin) {
  const clean = catalog.map(stripReadStatus);
  saveCatalogLocal(clean);
  if (!token || !isAdmin) return clean;
  try {
    const saved = await saveCatalogToServer(token, clean);
    saveCatalogLocal(saved);
    return saved;
  } catch (err) {
    console.warn('Failed to push catalog to server:', err.message);
    throw err;
  }
}

/** Push full status map to server */
export async function pushReadStatusToServer(token, userId, statusMap) {
  saveReadStatusMap(userId, statusMap);
  if (!token || !userId) return statusMap;
  try {
    return await saveReadStatusToServer(token, statusMap);
  } catch (err) {
    console.warn('Failed to push read status to server:', err.message);
    return statusMap;
  }
}

export function sortBooksByTitle(books) {
  return [...books].sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', 'ko', { sensitivity: 'base', numeric: true })
  );
}

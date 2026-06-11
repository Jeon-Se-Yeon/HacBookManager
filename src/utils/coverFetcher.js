const CACHE_KEY = 'hac_cover_cache';
const FAILURE_CACHE_TTL_MS = 30 * 60 * 1000;
const ANILIST_REQUEST_GAP_MS = 1500;
const JIKAN_REQUEST_GAP_MS = 400;
const ANILIST_COOLDOWN_MS = 5 * 60 * 1000;
const JIKAN_COOLDOWN_MS = 2 * 60 * 1000;
const MIN_ACCEPTABLE_MATCH_SCORE = 55;
const ANILIST_PER_PAGE = 25;
const JIKAN_LIMIT = 25;

const loadCache = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveCache = (cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save cover cache', e);
  }
};

const cache = loadCache();
const inflightRequests = {};
let lastAniListRequestAt = 0;
let lastJikanRequestAt = 0;
let aniListCooldownUntil = 0;
let jikanCooldownUntil = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeCoverUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/^http:\/\//i, 'https://');
};

const normalizeTitle = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ' ')
    .replace(/[:：\-–_~'".,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const sanitizeTitleForSearch = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ' ')
    .replace(/[:：\-–_~'".,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const readCacheEntry = (rawValue) => {
  if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
    return rawValue;
  }
  return { value: rawValue, ts: 0 };
};

const writeCacheEntry = (key, value) => {
  cache[key] = { value, ts: Date.now() };
  saveCache(cache);
};

const getTitleMatchScore = (query, candidate) => {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q)) return 80;
  if (q.includes(c)) return 75;
  const qTokens = q.split(' ').filter(Boolean);
  const cTokens = c.split(' ').filter(Boolean);
  if (!qTokens.length || !cTokens.length) return 0;
  const overlap = qTokens.filter((token) => cTokens.includes(token)).length;
  return Math.round((overlap / Math.max(qTokens.length, cTokens.length)) * 60);
};

/** Shared matcher: pick highest-scoring cover among candidates (score >= 55). */
const pickBestCoverMatch = (query, items, { getLabels, getImage }) => {
  let best = { score: -1, image: null };

  for (const item of items) {
    const labels = getLabels(item);
    const score = labels.reduce(
      (max, label) => Math.max(max, getTitleMatchScore(query, label)),
      0
    );
    const image = getImage(item);
    if (image && score > best.score) {
      best = { score, image };
    }
  }

  return best.score >= MIN_ACCEPTABLE_MATCH_SCORE ? best.image : null;
};

export function getCachedCoverUrl(title) {
  if (!title) return null;
  const key = title.trim();
  if (cache[key] === undefined) return null;
  const entry = readCacheEntry(cache[key]);
  return entry.value || null;
}

/** Saved catalog URL first, then local cover search cache (for all users). */
export function resolveBookCoverUrl(book) {
  if (!book) return null;
  const saved = book.coverImageUrl?.trim();
  if (saved) return normalizeCoverUrl(saved);
  if (book.title) return getCachedCoverUrl(book.title.trim());
  return null;
}

export function getAniListCooldownRemainingMs() {
  const remaining = aniListCooldownUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** Longest active cooldown among cover search providers (for UI messages). */
export function getCoverSearchCooldownRemainingMs() {
  return Math.max(getAniListCooldownRemainingMs(), Math.max(0, jikanCooldownUntil - Date.now()));
}

const waitForAniListSlot = async () => {
  const now = Date.now();
  if (aniListCooldownUntil > now) return false;
  const elapsed = now - lastAniListRequestAt;
  if (elapsed < ANILIST_REQUEST_GAP_MS) {
    await sleep(ANILIST_REQUEST_GAP_MS - elapsed);
  }
  lastAniListRequestAt = Date.now();
  return true;
};

const waitForJikanSlot = async () => {
  const now = Date.now();
  if (jikanCooldownUntil > now) return false;
  const elapsed = now - lastJikanRequestAt;
  if (elapsed < JIKAN_REQUEST_GAP_MS) {
    await sleep(JIKAN_REQUEST_GAP_MS - elapsed);
  }
  lastJikanRequestAt = Date.now();
  return true;
};

const fetchAniListByType = async (searchTerm, mediaType) => {
  const allowed = await waitForAniListSlot();
  if (!allowed) return { items: null, rateLimited: true };

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: `
        query ($search: String, $mediaType: MediaType) {
          Page(page: 1, perPage: ${ANILIST_PER_PAGE}) {
            media(search: $search, type: $mediaType, sort: POPULARITY_DESC) {
              title { romaji english native }
              synonyms
              coverImage { extraLarge large medium }
              bannerImage
            }
          }
        }
      `,
      variables: { search: searchTerm, mediaType },
    }),
  });

  if (response.status === 429) {
    aniListCooldownUntil = Date.now() + ANILIST_COOLDOWN_MS;
    return { items: null, rateLimited: true };
  }
  if (!response.ok) {
    return { items: null, rateLimited: false };
  }

  const data = await response.json();
  const items = Array.isArray(data?.data?.Page?.media) ? data.data.Page.media : [];
  return { items, rateLimited: false };
};

const getAniListLabels = (media) =>
  [
    media?.title?.romaji,
    media?.title?.english,
    media?.title?.native,
    ...(Array.isArray(media?.synonyms) ? media.synonyms : []),
  ].filter(Boolean);

const getAniListImage = (media, mediaType) => {
  if (mediaType === 'ANIME') {
    return (
      normalizeCoverUrl(media?.bannerImage) ||
      normalizeCoverUrl(media?.coverImage?.extraLarge) ||
      normalizeCoverUrl(media?.coverImage?.large) ||
      normalizeCoverUrl(media?.coverImage?.medium)
    );
  }
  return (
    normalizeCoverUrl(media?.coverImage?.extraLarge) ||
    normalizeCoverUrl(media?.coverImage?.large) ||
    normalizeCoverUrl(media?.coverImage?.medium) ||
    normalizeCoverUrl(media?.bannerImage)
  );
};

const pickBestAniListVisual = (query, mediaItems, mediaType) =>
  pickBestCoverMatch(query, mediaItems, {
    getLabels: getAniListLabels,
    getImage: (media) => getAniListImage(media, mediaType),
  });

const fetchJikanByType = async (searchTerm, mediaType) => {
  const allowed = await waitForJikanSlot();
  if (!allowed) return { items: null, rateLimited: true };

  const params = new URLSearchParams({
    q: searchTerm,
    limit: String(JIKAN_LIMIT),
    order_by: 'popularity',
    sort: 'desc',
  });

  const response = await fetch(`https://api.jikan.moe/v4/${mediaType}?${params}`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 429) {
    jikanCooldownUntil = Date.now() + JIKAN_COOLDOWN_MS;
    return { items: null, rateLimited: true };
  }
  if (!response.ok) {
    return { items: null, rateLimited: false };
  }

  const data = await response.json();
  const items = Array.isArray(data?.data) ? data.data : [];
  return { items, rateLimited: false };
};

const getJikanLabels = (entry) =>
  [
    entry?.title,
    entry?.title_english,
    entry?.title_japanese,
    ...(Array.isArray(entry?.titles) ? entry.titles.map((t) => t?.title) : []),
  ].filter(Boolean);

const getJikanImage = (entry, mediaType) => {
  const jpg = entry?.images?.jpg;
  const webp = entry?.images?.webp;
  if (mediaType === 'anime') {
    return (
      normalizeCoverUrl(webp?.large_image_url) ||
      normalizeCoverUrl(webp?.image_url) ||
      normalizeCoverUrl(jpg?.large_image_url) ||
      normalizeCoverUrl(jpg?.image_url)
    );
  }
  return (
    normalizeCoverUrl(jpg?.large_image_url) ||
    normalizeCoverUrl(jpg?.image_url) ||
    normalizeCoverUrl(webp?.large_image_url) ||
    normalizeCoverUrl(webp?.image_url)
  );
};

const pickBestJikanVisual = (query, items, mediaType) =>
  pickBestCoverMatch(query, items, {
    getLabels: getJikanLabels,
    getImage: (entry) => getJikanImage(entry, mediaType),
  });

const searchAniList = async (query) => {
  let anyRateLimited = false;

  for (const mediaType of ['MANGA', 'ANIME']) {
    const result = await fetchAniListByType(query, mediaType);
    if (result.rateLimited) {
      anyRateLimited = true;
      continue;
    }
    if (result.items?.length) {
      const best = pickBestAniListVisual(query, result.items, mediaType);
      if (best) return { url: best, rateLimited: false };
    }
  }

  return { url: null, rateLimited: anyRateLimited };
};

const searchJikan = async (query) => {
  let anyRateLimited = false;

  for (const mediaType of ['manga', 'anime']) {
    const result = await fetchJikanByType(query, mediaType);
    if (result.rateLimited) {
      anyRateLimited = true;
      continue;
    }
    if (result.items?.length) {
      const best = pickBestJikanVisual(query, result.items, mediaType);
      if (best) return { url: best, rateLimited: false };
    }
  }

  return { url: null, rateLimited: anyRateLimited };
};

/** AniList (25건) → 실패 시 Jikan/MAL (25건), 동일 제목 매칭 점수 알고리즘. */
const fetchCoverFromProviders = async (title) => {
  const query = sanitizeTitleForSearch(title);
  if (!query) return { url: null, rateLimited: false };

  const anilist = await searchAniList(query);
  if (anilist.url) return anilist;

  const jikan = await searchJikan(query);
  if (jikan.url) return jikan;

  return { url: null, rateLimited: anilist.rateLimited && jikan.rateLimited };
};

export async function getBookCoverUrl(title, options = {}) {
  if (!title) return null;
  const cleanTitle = title.trim();
  const forceRefresh = options.forceRefresh === true;

  if (inflightRequests[cleanTitle]) {
    return inflightRequests[cleanTitle];
  }

  if (!forceRefresh && cache[cleanTitle] !== undefined) {
    const entry = readCacheEntry(cache[cleanTitle]);
    if (entry.value !== null) return entry.value;
    if (Date.now() - (entry.ts || 0) < FAILURE_CACHE_TTL_MS) return null;
  }

  if (!forceRefresh && getCoverSearchCooldownRemainingMs() > 0) {
    const cached = getCachedCoverUrl(cleanTitle);
    if (cached) return cached;
  }

  const run = async () => {
    const { url, rateLimited } = await fetchCoverFromProviders(cleanTitle);
    if (url) {
      writeCacheEntry(cleanTitle, url);
      return url;
    }
    if (!rateLimited) {
      writeCacheEntry(cleanTitle, null);
    }
    return null;
  };

  inflightRequests[cleanTitle] = run().finally(() => {
    delete inflightRequests[cleanTitle];
  });

  return inflightRequests[cleanTitle];
}

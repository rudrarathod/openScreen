// Client-side in-memory and sessionStorage cache for API responses

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightPromises = new Map<string, Promise<any>>();

const STORAGE_PREFIX = "openScreen_cache_";

function getSessionItem<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch (e) {
    return null;
  }
}

function setSessionItem<T>(key: string, data: T, ttl: number): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // sessionStorage quota exceeded or unavailable
  }
}

/**
 * Executes fetchFn or returns cached result if valid.
 * Deduplicates in-flight promises so simultaneous calls share one request.
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = 60 * 60 * 1000 // default 1 hour
): Promise<T> {
  if (!cacheKey) return fetchFn();

  // 1. Check in-memory cache
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() - memEntry.timestamp <= memEntry.ttl) {
    if (!Array.isArray(memEntry.data) || memEntry.data.length > 0) {
      return memEntry.data;
    }
  }

  // 2. Check sessionStorage cache
  const sessionData = getSessionItem<T>(cacheKey);
  if (sessionData !== null) {
    if (!Array.isArray(sessionData) || sessionData.length > 0) {
      memoryCache.set(cacheKey, { data: sessionData, timestamp: Date.now(), ttl: ttlMs });
      return sessionData;
    }
  }

  // 3. Deduplicate in-flight requests
  if (inFlightPromises.has(cacheKey)) {
    return inFlightPromises.get(cacheKey) as Promise<T>;
  }

  // 4. Perform fetch
  const promise = (async () => {
    try {
      const data = await fetchFn();
      if (data !== null && data !== undefined) {
        const isEmptyArray = Array.isArray(data) && data.length === 0;
        if (!isEmptyArray) {
          memoryCache.set(cacheKey, { data, timestamp: Date.now(), ttl: ttlMs });
          setSessionItem(cacheKey, data, ttlMs);
        }
      }
      return data;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, promise);
  return promise;
}

/**
 * Clear cached API data
 */
export function clearApiCache(): void {
  memoryCache.clear();
  inFlightPromises.clear();
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    // ignore
  }
}

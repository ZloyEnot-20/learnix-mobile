type CacheEntry<T> = {
  data: T
  fetchedAt: number
  ttl: number
}

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export function cacheKey(method: string, path: string): string {
  return `${method}:${path}`
}

export function peekCached<T>(key: string, maxAge?: number): T | null {
  const entry = store.get(key)
  if (!entry) return null
  const age = Date.now() - entry.fetchedAt
  const limit = maxAge ?? entry.ttl
  if (age > limit) return null
  return entry.data as T
}

export function peekStale<T>(key: string): T | null {
  const entry = store.get(key)
  return entry ? (entry.data as T) : null
}

export function setCached<T>(key: string, data: T, ttl: number): void {
  store.set(key, { data, fetchedAt: Date.now(), ttl })
}

export function invalidateKey(key: string): void {
  store.delete(key)
  inflight.delete(key)
}

export function invalidatePrefix(prefix: string): void {
  for (const key of [...store.keys(), ...inflight.keys()]) {
    if (key.startsWith(prefix)) {
      store.delete(key)
      inflight.delete(key)
    }
  }
}

export function clearApiCache(): void {
  store.clear()
  inflight.clear()
}

export interface CachedFetchOptions {
  force?: boolean
  staleWhileRevalidate?: boolean
}

export async function cachedFetch<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
  options: CachedFetchOptions = {},
): Promise<T> {
  if (!options.force) {
    const fresh = peekCached<T>(key)
    if (fresh !== null) return fresh
  }

  if (options.staleWhileRevalidate && !options.force) {
    const stale = peekStale<T>(key)
    if (stale !== null) {
      void cachedFetch(key, ttl, fetcher, { force: true }).catch(() => {})
      return stale
    }
  }

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const promise = fetcher()
    .then((data) => {
      setCached(key, data, ttl)
      inflight.delete(key)
      return data
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })

  inflight.set(key, promise)
  return promise
}

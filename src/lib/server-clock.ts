import { API_URL } from "./api-client"

const SYNC_TTL_MS = 30_000

let cachedServerNowAtSync = 0
let cachedLocalNowAtSync = 0
let syncInFlight: Promise<number> | null = null

/**
 * Current server wall-clock (ms). Uses /health `ts` and never trusts device date alone.
 * Re-fetches at least every SYNC_TTL_MS; between syncs interpolates with elapsed local time
 * only as a short-lived offset (consume always refreshes first).
 */
export async function getServerNow(options?: { force?: boolean }): Promise<number> {
  const force = options?.force === true
  const localNow = Date.now()
  const cacheAge = localNow - cachedLocalNowAtSync
  if (
    !force &&
    cachedServerNowAtSync > 0 &&
    cacheAge >= 0 &&
    cacheAge < SYNC_TTL_MS
  ) {
    return cachedServerNowAtSync + cacheAge
  }

  if (syncInFlight) return syncInFlight

  syncInFlight = (async () => {
    const res = await fetch(`${API_URL}/health`, {
      method: "GET",
      headers: { "X-Learnix-Client": "mobile" },
    })
    if (!res.ok) throw new Error("server_time_unavailable")
    const data = (await res.json()) as { ts?: unknown }
    const ts = typeof data.ts === "number" && Number.isFinite(data.ts) ? data.ts : NaN
    if (!Number.isFinite(ts) || ts <= 0) throw new Error("server_time_unavailable")

    cachedServerNowAtSync = ts
    cachedLocalNowAtSync = Date.now()
    return ts
  })()

  try {
    return await syncInFlight
  } finally {
    syncInFlight = null
  }
}

/** UTC calendar day from a server timestamp: YYYY-MM-DD */
export function serverUtcDateKey(serverNowMs: number): string {
  return new Date(serverNowMs).toISOString().slice(0, 10)
}

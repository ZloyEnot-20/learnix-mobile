import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"
import { PRODUCTION_API_URL } from "./config"

/** Backend routes are mounted under `/api` — ensure the base URL always includes it. */
function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "")
  if (!trimmed) return PRODUCTION_API_URL
  if (!/^https?:\/\//i.test(trimmed)) {
    if (__DEV__) {
      console.warn(`[api] Invalid EXPO_PUBLIC_API_URL "${raw}", using production default`)
    }
    return PRODUCTION_API_URL
  }
  if (trimmed.endsWith("/api")) return trimmed
  return `${trimmed}/api`
}

const API_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL ??
    Constants.expoConfig?.extra?.apiUrl ??
    PRODUCTION_API_URL,
)

const ACCESS_KEY = "ielts_access_token"
const REFRESH_KEY = "ielts_refresh_token"
const GUEST_MODE_KEY = "ielts_guest_mode"

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY)
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY)
}

export async function isGuestMode(): Promise<boolean> {
  return (await AsyncStorage.getItem(GUEST_MODE_KEY)) === "1"
}

export async function setGuestMode(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(GUEST_MODE_KEY, "1")
  } else {
    await AsyncStorage.removeItem(GUEST_MODE_KEY)
  }
}

export async function setTokens(access: string, refresh?: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_KEY, access)
  if (refresh) await AsyncStorage.setItem(REFRESH_KEY, refresh)
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, GUEST_MODE_KEY])
}

export const SERVICE_UNAVAILABLE_MESSAGE =
  "Service is unavailable. Please try again later."

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

function userFacingApiMessage(_status: number): string {
  return SERVICE_UNAVAILABLE_MESSAGE
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback = SERVICE_UNAVAILABLE_MESSAGE,
): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function parseResponseBody(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  _retry?: boolean
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    await setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, auth = true, _retry = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (auth) {
    const token = await getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (__DEV__) console.warn("[api] network error", method, path, err)
    throw new ApiError(0, SERVICE_UNAVAILABLE_MESSAGE)
  }

  if (res.status === 401 && auth && !_retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiFetch<T>(path, { method, body, auth, _retry: true })
    }
  }

  const text = await res.text()
  const data = parseResponseBody(text)

  if (!res.ok) {
    const technical =
      (data && typeof data === "object" && ("error" in data || "message" in data)
        ? (data as { error?: string; message?: string }).error ||
          (data as { error?: string; message?: string }).message
        : null) || res.statusText
    if (__DEV__) console.warn("[api]", res.status, method, path, technical, data)
    throw new ApiError(res.status, userFacingApiMessage(res.status), data)
  }
  return data as T
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (auth) {
    const token = await getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    })
  } catch (err) {
    if (__DEV__) console.warn("[api] network error POST", path, err)
    throw new ApiError(0, SERVICE_UNAVAILABLE_MESSAGE)
  }

  const text = await res.text()
  const data = parseResponseBody(text)

  if (!res.ok) {
    const technical =
      (data && typeof data === "object" && ("error" in data || "message" in data)
        ? (data as { error?: string; message?: string }).error ||
          (data as { error?: string; message?: string }).message
        : null) || res.statusText
    if (__DEV__) console.warn("[api]", res.status, "POST", path, technical, data)
    throw new ApiError(res.status, userFacingApiMessage(res.status), data)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, auth = true) => apiFetch<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    apiFetch<T>(path, { method: "POST", body, auth }),
  patch: <T>(path: string, body?: unknown, auth = true) =>
    apiFetch<T>(path, { method: "PATCH", body, auth }),
  del: <T>(path: string, body?: unknown, auth = true) =>
    apiFetch<T>(path, { method: "DELETE", body, auth }),
}

export { API_URL }

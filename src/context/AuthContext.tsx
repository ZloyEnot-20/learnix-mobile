import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { authApi, clearApiCache, type AuthUser } from "../lib/api"
import { resetLearningProgressCache } from "../lib/learned-vocabulary"
import {
  clearTokens,
  getAccessToken,
  isGuestMode,
  setGuestMode,
  setTokens,
} from "../lib/api-client"
import { clearHomeScreenSnapshot } from "../lib/home-screen-cache"
import { clearProfileScreenSnapshot } from "../lib/profile-screen-cache"
import { clearHomeworkListSnapshot } from "../lib/homework-list-cache"
import { clearLastActivity } from "../lib/last-activity"
import { prefetchAppMediaAssets } from "../lib/app-cache"
import { GUEST_USER_ID, isGuestUser } from "../lib/guest"
import { runPerfTrace } from "../lib/perf"

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isGuest: boolean
  login: (login: string, password: string) => Promise<void>
  loginAsGuest: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setUser: (user: AuthUser) => void
}

const GUEST_USER: AuthUser = {
  id: GUEST_USER_ID,
  login: "guest",
  email: "",
  name: "Guest",
  type: "guest",
  isPremium: false,
  avatarUrl: null,
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) {
      setUser(null)
      return
    }

    if (await isGuestMode()) {
      setUser(GUEST_USER)
      return
    }

    try {
      const { user: me } = await authApi.me()
      setUser(me)
    } catch {
      await clearTokens()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  useEffect(() => {
    if (!user?.avatarUrl || isGuestUser(user)) return
    prefetchAppMediaAssets({ imageUrls: [user.avatarUrl] })
  }, [user?.id, user?.avatarUrl])

  const login = useCallback(async (loginStr: string, password: string) => {
    clearApiCache()
    clearHomeworkListSnapshot()
    clearHomeScreenSnapshot()
    clearProfileScreenSnapshot()
    await clearLastActivity()
    await setGuestMode(false)
    await runPerfTrace("user_login", async () => {
      const res = await authApi.login(loginStr, password)
      await setTokens(res.accessToken, res.refreshToken)
      setUser(res.user)
    })
  }, [])

  const loginAsGuest = useCallback(async () => {
    clearApiCache()
    clearHomeworkListSnapshot()
    clearHomeScreenSnapshot()
    clearProfileScreenSnapshot()
    await clearLastActivity()
    const res = await authApi.guest()
    await setGuestMode(true)
    await setTokens(res.accessToken)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    const userId = user?.id
    const guest = isGuestUser(user)
    await clearTokens()
    clearApiCache()
    clearHomeworkListSnapshot()
    clearHomeScreenSnapshot()
    clearProfileScreenSnapshot()
    resetLearningProgressCache(userId)
    if (!guest) {
      await clearLastActivity(userId)
    }
    setUser(null)
  }, [user])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isGuest: isGuestUser(user),
      login,
      loginAsGuest,
      logout,
      refreshUser,
      setUser,
    }),
    [user, isLoading, login, loginAsGuest, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

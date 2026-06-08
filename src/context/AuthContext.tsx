import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { authApi, clearApiCache, type AuthUser } from "../lib/api"
import { clearTokens, getAccessToken, setTokens } from "../lib/api-client"
import { clearHomeworkListSnapshot } from "../lib/homework-list-cache"
import { clearLastActivity } from "../lib/last-activity"

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (login: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
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

  const login = useCallback(async (loginStr: string, password: string) => {
    clearApiCache()
    clearHomeworkListSnapshot()
    await clearLastActivity()
    const res = await authApi.login(loginStr, password)
    await setTokens(res.accessToken, res.refreshToken)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    const userId = user?.id
    await clearTokens()
    clearApiCache()
    clearHomeworkListSnapshot()
    await clearLastActivity(userId)
    setUser(null)
  }, [user?.id])

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshUser }),
    [user, isLoading, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

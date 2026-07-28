import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "expo-router"
import type { AuthUser } from "../lib/api"
import {
  canSwitchStaffMode,
  getStaffMode,
  setStaffMode as persistStaffMode,
  type StaffMode,
} from "../lib/staff-mode"

interface StaffModeContextValue {
  mode: StaffMode
  isReady: boolean
  canSwitch: boolean
  setMode: (mode: StaffMode) => Promise<void>
}

const StaffModeContext = createContext<StaffModeContextValue | null>(null)

export function StaffModeProvider({
  user,
  children,
}: {
  user: AuthUser | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const [mode, setModeState] = useState<StaffMode>("teacher")
  const [isReady, setIsReady] = useState(false)
  const canSwitch = canSwitchStaffMode(user)

  useEffect(() => {
    let cancelled = false
    setIsReady(false)
    void getStaffMode().then((stored) => {
      if (cancelled) return
      if (!canSwitchStaffMode(user)) {
        setModeState("teacher")
      } else {
        setModeState(stored)
      }
      setIsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.type])

  const setMode = useCallback(
    async (next: StaffMode) => {
      if (!canSwitchStaffMode(user)) return
      setModeState(next)
      await persistStaffMode(next)
      router.replace((next === "admin" ? "/(admin)" : "/(teacher)") as never)
    },
    [router, user],
  )

  const value = useMemo(
    () => ({
      mode,
      isReady,
      canSwitch,
      setMode,
    }),
    [mode, isReady, canSwitch, setMode],
  )

  return <StaffModeContext.Provider value={value}>{children}</StaffModeContext.Provider>
}

export function useStaffMode() {
  const ctx = useContext(StaffModeContext)
  if (!ctx) throw new Error("useStaffMode must be used within StaffModeProvider")
  return ctx
}

/** Safe hook when provider may be absent (e.g. login screen). */
export function useStaffModeOptional() {
  return useContext(StaffModeContext)
}

import React, { createContext, useCallback, useContext, useRef } from "react"
import { homeworkApi } from "../lib/api"
import type { HomeworkAttempt } from "../types/domain"

type ProgressGetter = () => HomeworkAttempt | null

interface HomeworkProgressContextValue {
  registerProgressGetter: (getter: ProgressGetter | null) => void
  flushProgress: (homeworkId: string) => Promise<void>
}

const HomeworkProgressContext = createContext<HomeworkProgressContextValue>({
  registerProgressGetter: () => {},
  flushProgress: async () => {},
})

export function HomeworkProgressProvider({ children }: { children: React.ReactNode }) {
  const getterRef = useRef<ProgressGetter | null>(null)

  const registerProgressGetter = useCallback((getter: ProgressGetter | null) => {
    getterRef.current = getter
  }, [])

  const flushProgress = useCallback(async (homeworkId: string) => {
    const snapshot = getterRef.current?.()
    if (!snapshot) return
    await homeworkApi.saveProgress(homeworkId, snapshot)
  }, [])

  return (
    <HomeworkProgressContext.Provider value={{ registerProgressGetter, flushProgress }}>
      {children}
    </HomeworkProgressContext.Provider>
  )
}

export function useHomeworkProgressContext() {
  return useContext(HomeworkProgressContext)
}

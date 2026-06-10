import { useCallback, useRef } from "react"
import { useFocusEffect } from "expo-router"
import { homeworkApi } from "../lib/api"
import type { HomeworkSubmission } from "../types/domain"

/** Ignore duplicate focus events within the same visit (React Strict Mode remounts). */
const ENTRY_DEDUPE_MS = 2000

/** Records a homework visit on every screen focus (anti-cheat entry counter). */
export function useHomeworkEntryOnFocus(
  homeworkId: string | undefined,
  enabled: boolean,
  onResult?: (sub: HomeworkSubmission | null) => void,
) {
  const lastEntryRef = useRef<{ homeworkId: string; at: number } | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!homeworkId || !enabled) return

      const now = Date.now()
      const last = lastEntryRef.current
      if (last?.homeworkId === homeworkId && now - last.at < ENTRY_DEDUPE_MS) {
        return
      }
      lastEntryRef.current = { homeworkId, at: now }

      let cancelled = false

      void homeworkApi
        .recordEntry(homeworkId)
        .then((sub) => {
          if (!cancelled) onResult?.(sub)
        })
        .catch(() => {
          if (!cancelled) onResult?.(null)
        })

      return () => {
        cancelled = true
        if (lastEntryRef.current?.homeworkId === homeworkId) {
          lastEntryRef.current = null
        }
      }
    }, [homeworkId, enabled, onResult]),
  )
}

export function isHomeworkEntryFailed(sub: HomeworkSubmission | null | undefined): boolean {
  return (
    sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating === true
  )
}

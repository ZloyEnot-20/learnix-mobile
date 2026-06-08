import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, BackHandler, type AppStateStatus } from "react-native"
import { homeworkApi } from "../lib/api"
import { API_URL } from "../lib/api-client"
import type { IntegrityStatus, ViolationReason } from "../types/domain"

const BACKGROUND_FAIL_THRESHOLD_MS = 5000

function isBackgroundState(state: AppStateStatus): boolean {
  return state === "inactive" || state === "background"
}

export interface HomeworkIntegrityState {
  failed: boolean
  suspicious: boolean
  pauseUsed: boolean
  integrityStatus: IntegrityStatus | null
  pauseSession: (opts?: { fromViolation?: boolean }) => Promise<void>
  leaveSession: (reason: ViolationReason) => Promise<void>
  dismissSuspicious: () => void
}

export function useHomeworkIntegrity(
  homeworkId: string | undefined,
  active: boolean,
  initialPauseUsed: boolean,
  onPaused: () => void,
): HomeworkIntegrityState {
  const [failed, setFailed] = useState(false)
  const [suspicious, setSuspicious] = useState(false)
  const [pauseUsed, setPauseUsed] = useState(initialPauseUsed)
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityStatus | null>(null)

  const processingRef = useRef(false)
  const cooldownUntilRef = useRef(0)
  const wasOnlineRef = useRef(false)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPauseUsed(initialPauseUsed)
  }, [initialPauseUsed])

  const pauseSession = useCallback(
    async (opts?: { fromViolation?: boolean }) => {
      if (!homeworkId || processingRef.current) return
      processingRef.current = true
      try {
        const res = await homeworkApi.pause(homeworkId)
        if (res.action === "fail" || res.submission?.integrityStatus === "cheating_detected") {
          setFailed(true)
          setIntegrityStatus("cheating_detected")
          return
        }
        setPauseUsed(true)
        if (opts?.fromViolation) {
          setIntegrityStatus("cheating_suspicion")
          setSuspicious(true)
        } else {
          onPaused()
        }
      } catch {
        if (opts?.fromViolation) {
          setSuspicious(true)
        } else {
          onPaused()
        }
      } finally {
        processingRef.current = false
      }
    },
    [homeworkId, onPaused],
  )

  const leaveSession = useCallback(
    async (reason: ViolationReason) => {
      if (!homeworkId || !active || failed || suspicious || processingRef.current) return
      const now = Date.now()
      if (now < cooldownUntilRef.current) return

      processingRef.current = true
      cooldownUntilRef.current = now + 2000

      try {
        const res = await homeworkApi.reportViolation(homeworkId, reason)
        if (res.integrityStatus) setIntegrityStatus(res.integrityStatus)
        if (res.pauseUsed) setPauseUsed(true)

        if (res.action === "pause" || res.action === "paused") {
          setIntegrityStatus("cheating_suspicion")
          setSuspicious(true)
          return
        }

        if (res.action === "fail") {
          setFailed(true)
          setIntegrityStatus(res.integrityStatus ?? "cheating_detected")
        }
      } catch {
        // Keep monitoring active if the violation could not be recorded.
      } finally {
        processingRef.current = false
      }
    },
    [homeworkId, active, failed, suspicious],
  )

  const clearBackgroundTimer = useCallback(() => {
    if (backgroundTimerRef.current != null) {
      clearTimeout(backgroundTimerRef.current)
      backgroundTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!homeworkId || !active || failed || suspicious) return

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      void leaveSession("navigation")
      return true
    })
    return () => sub.remove()
  }, [homeworkId, active, failed, suspicious, leaveSession])

  useEffect(() => {
    if (!homeworkId || !active || failed || suspicious) {
      clearBackgroundTimer()
      return
    }

    const scheduleBackgroundCheck = () => {
      clearBackgroundTimer()
      backgroundTimerRef.current = setTimeout(() => {
        if (isBackgroundState(AppState.currentState)) {
          void leaveSession("app_background")
        }
      }, BACKGROUND_FAIL_THRESHOLD_MS)
    }

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current
      appStateRef.current = next

      if (prev === "active" && isBackgroundState(next)) {
        scheduleBackgroundCheck()
        return
      }

      if (next === "active") {
        clearBackgroundTimer()
      }
    })

    if (isBackgroundState(AppState.currentState)) {
      scheduleBackgroundCheck()
    }

    return () => {
      sub.remove()
      clearBackgroundTimer()
    }
  }, [homeworkId, active, failed, suspicious, leaveSession, clearBackgroundTimer])

  useEffect(() => {
    if (!homeworkId || !active || failed || suspicious) return

    let cancelled = false

    async function checkNetwork() {
      if (cancelled) return
      try {
        const res = await fetch(`${API_URL}/health`)
        if (res.ok) {
          wasOnlineRef.current = true
          return
        }
      } catch {
        // request failed — treat as offline
      }
      if (wasOnlineRef.current) {
        void leaveSession("network_lost")
      }
    }

    void checkNetwork()
    const id = setInterval(() => void checkNetwork(), 4000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [homeworkId, active, failed, suspicious, leaveSession])

  const dismissSuspicious = useCallback(() => {
    setSuspicious(false)
    onPaused()
  }, [onPaused])

  return {
    failed,
    suspicious,
    pauseUsed,
    integrityStatus,
    pauseSession,
    leaveSession,
    dismissSuspicious,
  }
}

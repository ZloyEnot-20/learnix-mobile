import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, BackHandler, type AppStateStatus } from "react-native"
import { useNavigation } from "expo-router"
import { homeworkApi } from "../lib/api"
import { API_URL } from "../lib/api-client"
import {
  claimHomeworkIntegritySession,
  isActiveHomeworkIntegritySession,
} from "../lib/homework-integrity-session"
import { needsSuspiciousAcknowledgement } from "../lib/homework-session-start"
import type { IntegrityStatus, ViolationReason } from "../types/domain"

/** Min time outside the app before a leave counts as a violation. */
const BACKGROUND_FAIL_THRESHOLD_MS = 1200
/** Ignore integrity triggers briefly after a homework screen becomes active (navigation transitions). */
const MOUNT_GRACE_MS = 1000

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
  initialSuspicious = false,
  strictIntegrity = true,
  flushProgressBeforePause?: () => Promise<void>,
): HomeworkIntegrityState {
  const navigation = useNavigation()
  const [failed, setFailed] = useState(false)
  const [suspicious, setSuspicious] = useState(initialSuspicious)
  const [pauseUsed, setPauseUsed] = useState(initialPauseUsed)
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityStatus | null>(null)

  const processingRef = useRef(false)
  const cooldownUntilRef = useRef(0)
  const wasOnlineRef = useRef(false)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backgroundStartedAtRef = useRef<number | null>(null)
  const monitoringReadyAtRef = useRef(0)
  const allowLeaveRef = useRef(false)
  const leaveSessionRef = useRef<(reason: ViolationReason) => Promise<void>>(async () => {})
  const syncIntegrityFromServerRef = useRef<() => Promise<void>>(async () => {})
  const pauseUsedRef = useRef(initialPauseUsed)
  const suspiciousRef = useRef(initialSuspicious)
  const integrityStatusRef = useRef<IntegrityStatus | null>(null)

  const shouldMonitorRef = useRef<() => boolean>(() => false)
  shouldMonitorRef.current = () => {
    if (!homeworkId || !active || failed || suspicious) return false
    if (!isActiveHomeworkIntegritySession(homeworkId)) return false
    return Date.now() >= monitoringReadyAtRef.current
  }

  useEffect(() => {
    setPauseUsed(initialPauseUsed)
  }, [initialPauseUsed])

  useEffect(() => {
    pauseUsedRef.current = pauseUsed
  }, [pauseUsed])

  useEffect(() => {
    suspiciousRef.current = suspicious
  }, [suspicious])

  useEffect(() => {
    integrityStatusRef.current = integrityStatus
  }, [integrityStatus])

  useEffect(() => {
    if (strictIntegrity && initialSuspicious) setSuspicious(true)
  }, [initialSuspicious, strictIntegrity])

  useEffect(() => {
    if (!homeworkId || !active) return
    return claimHomeworkIntegritySession(homeworkId)
  }, [homeworkId, active])

  useEffect(() => {
    if (active) {
      monitoringReadyAtRef.current = Date.now() + MOUNT_GRACE_MS
    }
  }, [active, homeworkId])

  const canMonitor = useCallback(() => {
    if (!homeworkId || !active || failed || suspicious) return false
    if (!isActiveHomeworkIntegritySession(homeworkId)) return false
    return Date.now() >= monitoringReadyAtRef.current
  }, [homeworkId, active, failed, suspicious])

  const pauseSession = useCallback(
    async (opts?: { fromViolation?: boolean }) => {
      if (!homeworkId || processingRef.current) return
      processingRef.current = true
      try {
        await flushProgressBeforePause?.()
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
          allowLeaveRef.current = true
          onPaused()
        }
      } catch {
        if (opts?.fromViolation) {
          setSuspicious(true)
        } else {
          allowLeaveRef.current = true
          onPaused()
        }
      } finally {
        processingRef.current = false
      }
    },
    [homeworkId, onPaused, flushProgressBeforePause],
  )

  const applyOptimisticViolation = useCallback(() => {
    if (!strictIntegrity) return

    const shouldFail =
      pauseUsedRef.current ||
      suspiciousRef.current ||
      integrityStatusRef.current === "cheating_suspicion"

    if (shouldFail) {
      setFailed(true)
      setSuspicious(false)
      setIntegrityStatus("cheating_detected")
      integrityStatusRef.current = "cheating_detected"
      suspiciousRef.current = false
      return
    }

    setIntegrityStatus("cheating_suspicion")
    setSuspicious(true)
    integrityStatusRef.current = "cheating_suspicion"
    suspiciousRef.current = true
  }, [strictIntegrity])

  const syncIntegrityFromServer = useCallback(async () => {
    if (!homeworkId || !active || failed || suspicious) return
    if (!strictIntegrity) return

    try {
      const sub = await homeworkApi.start(homeworkId, { force: true, skipEntryCount: true })
      if (sub.integrityStatus === "cheating_detected" || sub.attempt?.failedDueToCheating) {
        setFailed(true)
        setIntegrityStatus("cheating_detected")
        return
      }
      if (needsSuspiciousAcknowledgement(sub)) {
        setIntegrityStatus("cheating_suspicion")
        setSuspicious(true)
        if (sub.pauseUsed) setPauseUsed(true)
      }
    } catch {
      // Offline or transient — optimistic UI already shown when applicable.
    }
  }, [homeworkId, active, failed, suspicious, strictIntegrity])

  syncIntegrityFromServerRef.current = syncIntegrityFromServer

  const leaveSession = useCallback(
    async (reason: ViolationReason) => {
      if (!homeworkId || !canMonitor() || processingRef.current) return
      const now = Date.now()
      if (now < cooldownUntilRef.current) return

      processingRef.current = true
      cooldownUntilRef.current = now + 2000

      applyOptimisticViolation()

      try {
        const res = await homeworkApi.reportViolation(homeworkId, reason)
        if (!strictIntegrity) return

        if (res.integrityStatus) setIntegrityStatus(res.integrityStatus)
        if (res.pauseUsed) setPauseUsed(true)

        if (res.action === "warn") {
          setIntegrityStatus("cheating_suspicion")
          setSuspicious(true)
          setFailed(false)
          return
        }

        if (res.action === "pause" || res.action === "paused") {
          setIntegrityStatus("cheating_suspicion")
          setSuspicious(true)
          setFailed(false)
          if (res.pauseUsed) setPauseUsed(true)
          return
        }

        if (res.action === "fail") {
          setFailed(true)
          setSuspicious(false)
          setIntegrityStatus(res.integrityStatus ?? "cheating_detected")
        }
      } catch {
        void syncIntegrityFromServer()
      } finally {
        processingRef.current = false
      }
    },
    [homeworkId, canMonitor, applyOptimisticViolation, syncIntegrityFromServer, strictIntegrity],
  )

  leaveSessionRef.current = leaveSession

  const clearBackgroundTimer = useCallback(() => {
    if (backgroundTimerRef.current != null) {
      clearTimeout(backgroundTimerRef.current)
      backgroundTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!strictIntegrity || !canMonitor()) return

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      void leaveSession("navigation")
      return true
    })
    return () => sub.remove()
  }, [canMonitor, leaveSession, strictIntegrity])

  useEffect(() => {
    if (!strictIntegrity || !homeworkId || !active || failed || suspicious) return

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return
      if (!isActiveHomeworkIntegritySession(homeworkId)) return
      if (Date.now() < monitoringReadyAtRef.current) return

      e.preventDefault()
      void leaveSession("navigation")
    })

    return unsubscribe
  }, [navigation, homeworkId, active, failed, suspicious, leaveSession, strictIntegrity])

  useEffect(() => {
    if (!homeworkId || !active || failed || suspicious) {
      clearBackgroundTimer()
      backgroundStartedAtRef.current = null
      return
    }

    const maybeRecordBackgroundStart = () => {
      if (backgroundStartedAtRef.current != null) return
      if (!shouldMonitorRef.current()) return
      backgroundStartedAtRef.current = Date.now()
    }

    const maybeHandleBackgroundReturn = () => {
      clearBackgroundTimer()
      const startedAt = backgroundStartedAtRef.current
      backgroundStartedAtRef.current = null
      if (startedAt == null) return
      if (Date.now() - startedAt < BACKGROUND_FAIL_THRESHOLD_MS) return
      if (!shouldMonitorRef.current()) return
      void leaveSessionRef.current("app_background")
    }

    const scheduleBackgroundCheck = () => {
      clearBackgroundTimer()
      backgroundTimerRef.current = setTimeout(() => {
        if (backgroundStartedAtRef.current == null) return
        if (Date.now() - backgroundStartedAtRef.current < BACKGROUND_FAIL_THRESHOLD_MS) return
        if (!isBackgroundState(AppState.currentState)) return
        if (!shouldMonitorRef.current()) return
        backgroundStartedAtRef.current = null
        void leaveSessionRef.current("app_background")
      }, BACKGROUND_FAIL_THRESHOLD_MS)
    }

    appStateRef.current = AppState.currentState

    // If the app was already backgrounded when monitoring started, begin tracking immediately.
    if (isBackgroundState(AppState.currentState)) {
      maybeRecordBackgroundStart()
      scheduleBackgroundCheck()
    }

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current
      appStateRef.current = next

      if (next === "active" && isBackgroundState(prev)) {
        const startedAt = backgroundStartedAtRef.current
        const awayMs = startedAt != null ? Date.now() - startedAt : 0
        maybeHandleBackgroundReturn()
        if (awayMs >= BACKGROUND_FAIL_THRESHOLD_MS) {
          void syncIntegrityFromServerRef.current()
        }
        return
      }

      if (isBackgroundState(next) && prev === "active") {
        maybeRecordBackgroundStart()
        scheduleBackgroundCheck()
      }
    })

    return () => {
      sub.remove()
      clearBackgroundTimer()
    }
  }, [homeworkId, active, failed, suspicious, clearBackgroundTimer])

  useEffect(() => {
    if (!canMonitor()) return

    let cancelled = false

    async function checkNetwork() {
      if (cancelled || !canMonitor()) return
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
  }, [canMonitor, leaveSession])

  const dismissSuspicious = useCallback(() => {
    setSuspicious(false)
    monitoringReadyAtRef.current = Date.now() + MOUNT_GRACE_MS
  }, [])

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

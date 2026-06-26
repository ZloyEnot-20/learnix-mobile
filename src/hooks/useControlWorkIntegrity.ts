import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, BackHandler, type AppStateStatus } from "react-native"
import { useNavigation } from "expo-router"
import { controlWorkApi } from "../lib/api"
import { API_URL } from "../lib/api-client"
import {
  claimControlWorkIntegritySession,
  isActiveControlWorkIntegritySession,
} from "../lib/control-work-integrity-session"
import { needsSuspiciousAcknowledgement } from "../lib/homework-session-start"
import type { IntegrityStatus, ViolationReason } from "../types/domain"

const BACKGROUND_FAIL_THRESHOLD_MS = 1200
const MOUNT_GRACE_MS = 1000

function isBackgroundState(state: AppStateStatus): boolean {
  return state === "inactive" || state === "background"
}

export interface ControlWorkIntegrityState {
  failed: boolean
  suspicious: boolean
  pauseUsed: boolean
  integrityStatus: IntegrityStatus | null
  pauseSession: (opts?: { fromViolation?: boolean }) => Promise<void>
  leaveSession: (reason: ViolationReason) => Promise<void>
  dismissSuspicious: () => void
}

export function useControlWorkIntegrity(
  controlWorkId: string | undefined,
  active: boolean,
  initialPauseUsed: boolean,
  onPaused: () => void,
  initialSuspicious = false,
): ControlWorkIntegrityState {
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
    if (!controlWorkId || !active || failed || suspicious) return false
    if (!isActiveControlWorkIntegritySession(controlWorkId)) return false
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
    if (initialSuspicious) setSuspicious(true)
  }, [initialSuspicious])

  useEffect(() => {
    if (!controlWorkId || !active) return
    return claimControlWorkIntegritySession(controlWorkId)
  }, [controlWorkId, active])

  useEffect(() => {
    if (active) {
      monitoringReadyAtRef.current = Date.now() + MOUNT_GRACE_MS
    }
  }, [active, controlWorkId])

  const canMonitor = useCallback(() => {
    if (!controlWorkId || !active || failed || suspicious) return false
    if (!isActiveControlWorkIntegritySession(controlWorkId)) return false
    return Date.now() >= monitoringReadyAtRef.current
  }, [controlWorkId, active, failed, suspicious])

  const pauseSession = useCallback(
    async (opts?: { fromViolation?: boolean }) => {
      if (!controlWorkId || processingRef.current) return
      processingRef.current = true
      try {
        const res = await controlWorkApi.pause(controlWorkId)
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
    [controlWorkId, onPaused],
  )

  const applyOptimisticViolation = useCallback(() => {
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
  }, [])

  const syncIntegrityFromServer = useCallback(async () => {
    if (!controlWorkId || !active || failed || suspicious) return

    try {
      const sub = await controlWorkApi.start(controlWorkId, { force: true })
      if (sub.integrityStatus === "cheating_detected") {
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
  }, [controlWorkId, active, failed, suspicious])

  syncIntegrityFromServerRef.current = syncIntegrityFromServer

  const leaveSession = useCallback(
    async (reason: ViolationReason) => {
      if (!controlWorkId || !canMonitor() || processingRef.current) return
      const now = Date.now()
      if (now < cooldownUntilRef.current) return

      processingRef.current = true
      cooldownUntilRef.current = now + 2000

      applyOptimisticViolation()

      try {
        const res = await controlWorkApi.reportViolation(controlWorkId, reason)
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
    [controlWorkId, canMonitor, applyOptimisticViolation, syncIntegrityFromServer],
  )

  leaveSessionRef.current = leaveSession

  const clearBackgroundTimer = useCallback(() => {
    if (backgroundTimerRef.current != null) {
      clearTimeout(backgroundTimerRef.current)
      backgroundTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!canMonitor()) return

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      void leaveSession("navigation")
      return true
    })
    return () => sub.remove()
  }, [canMonitor, leaveSession])

  useEffect(() => {
    if (!controlWorkId || !active || failed || suspicious) return

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return
      if (!isActiveControlWorkIntegritySession(controlWorkId)) return
      if (Date.now() < monitoringReadyAtRef.current) return

      e.preventDefault()
      void leaveSession("navigation")
    })

    return unsubscribe
  }, [navigation, controlWorkId, active, failed, suspicious, leaveSession])

  useEffect(() => {
    if (!controlWorkId || !active || failed || suspicious) {
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
  }, [controlWorkId, active, failed, suspicious, clearBackgroundTimer])

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

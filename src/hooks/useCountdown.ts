import { useEffect, useRef, useState } from "react"

export function remainingSeconds(
  minutes: number | undefined,
  elapsedSeconds: number,
  startedAtMs: number | null,
): number | null {
  if (!minutes || minutes <= 0) return null
  const total = Math.round(minutes * 60)
  const running = startedAtMs
    ? elapsedSeconds + Math.floor((Date.now() - startedAtMs) / 1000)
    : elapsedSeconds
  return Math.max(0, total - running)
}

export function useCountdown(
  minutes: number | undefined,
  onExpire: () => void,
  stopped: boolean,
  elapsedSeconds: number,
  startedAtMs: number | null,
): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    remainingSeconds(minutes, elapsedSeconds, startedAtMs),
  )
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    setSecondsLeft(remainingSeconds(minutes, elapsedSeconds, startedAtMs))
  }, [minutes, elapsedSeconds, startedAtMs])

  useEffect(() => {
    if (secondsLeft == null || stopped || startedAtMs == null) return
    if (secondsLeft <= 0) {
      onExpireRef.current()
      return
    }
    const t = setTimeout(
      () => setSecondsLeft((s) => (s == null ? null : s - 1)),
      1000,
    )
    return () => clearTimeout(t)
  }, [secondsLeft, stopped, startedAtMs])

  return secondsLeft
}

export function formatTimer(seconds: number | null): string {
  if (seconds == null) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

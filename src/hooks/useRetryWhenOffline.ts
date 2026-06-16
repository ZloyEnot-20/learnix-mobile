import { useEffect, useRef } from "react"
import { AppState } from "react-native"

const RETRY_INTERVAL_MS = 4000

/** Periodically retries while `active` — e.g. after a failed homework load when offline. */
export function useRetryWhenOffline(active: boolean, onRetry: () => void): void {
  const onRetryRef = useRef(onRetry)
  onRetryRef.current = onRetry

  useEffect(() => {
    if (!active) return

    const tick = () => onRetryRef.current()
    const interval = setInterval(tick, RETRY_INTERVAL_MS)
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick()
    })

    return () => {
      clearInterval(interval)
      sub.remove()
    }
  }, [active])
}

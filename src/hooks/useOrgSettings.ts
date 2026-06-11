import { useEffect, useState } from "react"
import { orgApi } from "../lib/api"

export function useOrgSettings() {
  const [allowScreenshots, setAllowScreenshots] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void orgApi
      .settings()
      .then((settings) => {
        if (!cancelled) {
          setAllowScreenshots(settings.allowScreenshots)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { allowScreenshots, loaded }
}

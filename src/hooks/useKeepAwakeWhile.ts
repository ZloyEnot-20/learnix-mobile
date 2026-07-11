import { useEffect, useId } from "react"
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake"

/** Keeps the screen awake while `active` is true. Uses a unique tag per caller by default. */
export function useKeepAwakeWhile(active: boolean, tag?: string) {
  const autoTag = useId()
  const keepAwakeTag = tag ?? autoTag

  useEffect(() => {
    if (!active) return
    void activateKeepAwakeAsync(keepAwakeTag)
    return () => {
      void deactivateKeepAwake(keepAwakeTag)
    }
  }, [active, keepAwakeTag])
}

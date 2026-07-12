type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeLiveLessonRefresh(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Ask home banner (and any other subscribers) to re-fetch active lesson. */
export function requestLiveLessonRefresh(): void {
  for (const listener of listeners) {
    listener()
  }
}

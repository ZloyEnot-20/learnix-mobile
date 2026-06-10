type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeNotificationsRefresh(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function requestNotificationsRefresh(): void {
  for (const listener of listeners) {
    listener()
  }
}

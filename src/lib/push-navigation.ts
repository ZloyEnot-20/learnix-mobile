type Listener = (data?: Record<string, string>) => void

let navigateHandler: Listener | null = null

/** Registered from root layout once expo-router is mounted. */
export function setPushNavigationHandler(handler: Listener | null): void {
  navigateHandler = handler
}

export function isLiveLessonPush(data?: Record<string, string>): boolean {
  if (!data) return false
  return data.kind === "live_lesson" || data.path === "/live-lesson"
}

/** Open the right screen when the student taps a push (no expo-router import here). */
export function navigateFromPushData(data?: Record<string, string>): void {
  if (!navigateHandler) return
  navigateHandler(data)
}

import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Subject } from "../types/domain"

const KEY_PREFIX = "learnix_last_activity:"

export type LastActivityKind = "homework" | "game"

export interface LastActivity {
  kind: LastActivityKind
  route: string
  title: string
  categoryLabel: string
  subject: Subject
  homeworkId?: string
  openedAt: string
  progressPct?: number
  minutesLeft?: number
  progressLabel?: string
}

const memory = new Map<string, LastActivity>()

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

export function subjectLabel(subject: Subject): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1)
}

export async function saveLastActivity(
  userId: string,
  activity: Omit<LastActivity, "openedAt"> & { openedAt?: string },
): Promise<void> {
  const entry: LastActivity = {
    ...activity,
    openedAt: activity.openedAt ?? new Date().toISOString(),
  }
  memory.set(userId, entry)
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(entry))
}

export async function updateLastActivityProgress(
  userId: string,
  patch: Pick<LastActivity, "progressPct" | "minutesLeft" | "progressLabel">,
): Promise<void> {
  const current = await getLastActivity(userId)
  if (!current) return
  const entry = { ...current, ...patch }
  memory.set(userId, entry)
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(entry))
}

export async function getLastActivity(userId: string): Promise<LastActivity | null> {
  const cached = memory.get(userId)
  if (cached) return cached

  try {
    const raw = await AsyncStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastActivity
    memory.set(userId, parsed)
    return parsed
  } catch {
    return null
  }
}

export async function clearLastActivity(userId?: string): Promise<void> {
  if (userId) {
    memory.delete(userId)
    await AsyncStorage.removeItem(storageKey(userId))
    return
  }
  memory.clear()
  const keys = await AsyncStorage.getAllKeys()
  const ours = keys.filter((k) => k.startsWith(KEY_PREFIX))
  if (ours.length > 0) await AsyncStorage.multiRemove(ours)
}

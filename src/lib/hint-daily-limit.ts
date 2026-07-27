import AsyncStorage from "@react-native-async-storage/async-storage"
import { getServerNow, serverUtcDateKey } from "./server-clock"

export const DAILY_HINT_LIMIT = 5

const STORAGE_KEY = "learnix_daily_hints"

type HintDayState = {
  /** Server UTC day key (YYYY-MM-DD), never device-local. */
  date: string
  used: number
}

let memory: HintDayState | null = null

function emptyForDate(date: string): HintDayState {
  return { date, used: 0 }
}

async function loadStored(): Promise<HintDayState | null> {
  if (memory) return memory
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as HintDayState
    if (
      parsed &&
      typeof parsed.date === "string" &&
      typeof parsed.used === "number"
    ) {
      memory = { date: parsed.date, used: Math.max(0, Math.floor(parsed.used)) }
      return memory
    }
  } catch {
    // ignore corrupt storage
  }
  return null
}

async function writeState(state: HintDayState): Promise<void> {
  memory = state
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

async function stateForServerToday(forceSync = false): Promise<HintDayState> {
  const serverNow = await getServerNow({ force: forceSync })
  const today = serverUtcDateKey(serverNow)
  const stored = await loadStored()
  if (stored && stored.date === today) return stored
  const fresh = emptyForDate(today)
  await writeState(fresh)
  return fresh
}

/** How many hints remain today (0…DAILY_HINT_LIMIT). Throws if server time unavailable. */
export async function getHintsRemaining(): Promise<number> {
  const state = await stateForServerToday(false)
  return Math.max(0, DAILY_HINT_LIMIT - state.used)
}

/**
 * Consume one hint using a fresh server clock sync.
 * Returns remaining after consume, or null if limit already reached.
 * Throws if server time cannot be verified (fail closed — no offline clock cheat).
 */
export async function consumeHint(): Promise<number | null> {
  const state = await stateForServerToday(true)
  if (state.used >= DAILY_HINT_LIMIT) return null
  const serverNow = await getServerNow({ force: true })
  const today = serverUtcDateKey(serverNow)
  const next = {
    date: today,
    used: state.date === today ? state.used + 1 : 1,
  }
  await writeState(next)
  return Math.max(0, DAILY_HINT_LIMIT - next.used)
}

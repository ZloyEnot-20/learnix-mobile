import { Platform } from "react-native"

export type PerfAttributes = Record<string, string | undefined>

type PerfTrace = {
  putAttribute: (name: string, value: string) => void
  stop: () => Promise<void>
}

const noopTrace: PerfTrace = {
  putAttribute: () => {},
  stop: async () => {},
}

function getPerfModule(): (() => { startTrace: (name: string) => Promise<PerfTrace> }) | null {
  try {
    // Native module is unavailable in Expo Go / web.
    const perf = require("@react-native-firebase/perf").default as
      | (() => { startTrace: (name: string) => Promise<PerfTrace> })
      | undefined
    return typeof perf === "function" ? perf : null
  } catch {
    return null
  }
}

function applyPerfAttributes(trace: PerfTrace, attributes?: PerfAttributes): void {
  if (!attributes) return
  for (const [key, value] of Object.entries(attributes)) {
    if (!value) continue
    try {
      trace.putAttribute(key, value)
    } catch {
      /* Firebase attribute limits */
    }
  }
}

export async function startPerfTrace(
  name: string,
  attributes?: PerfAttributes,
): Promise<PerfTrace> {
  const perf = getPerfModule()
  if (!perf || Platform.OS === "web") return noopTrace

  try {
    const trace = await perf().startTrace(name)
    applyPerfAttributes(trace, attributes)
    return trace
  } catch {
    return noopTrace
  }
}

export async function stopPerfTrace(trace: PerfTrace): Promise<void> {
  try {
    await trace.stop()
  } catch {
    /* ignore */
  }
}

export async function runPerfTrace<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: PerfAttributes,
): Promise<T> {
  const trace = await startPerfTrace(name, attributes)
  try {
    return await fn()
  } finally {
    await stopPerfTrace(trace)
  }
}

export interface LessonSchedule {
  weekdays: number[]
  startTime: string
  endTime: string
}

export interface StudentContextResponse {
  groupName: string | null
  teacherName: string | null
  lessonSchedule: LessonSchedule | null
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export { WEEKDAY_LABELS }

/** Colors for weekday display badges (0 = Sun … 6 = Sat). */
export const WEEKDAY_BADGE_STYLES: Record<
  number,
  { backgroundColor: string; color: string; borderColor: string }
> = {
  0: { backgroundColor: "#ffe4e6", color: "#9f1239", borderColor: "#fecdd3" },
  1: { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#bfdbfe" },
  2: { backgroundColor: "#d1fae5", color: "#065f46", borderColor: "#a7f3d0" },
  3: { backgroundColor: "#fef3c7", color: "#92400e", borderColor: "#fde68a" },
  4: { backgroundColor: "#ede9fe", color: "#5b21b6", borderColor: "#ddd6fe" },
  5: { backgroundColor: "#e0f2fe", color: "#075985", borderColor: "#bae6fd" },
  6: { backgroundColor: "#ffedd5", color: "#9a3412", borderColor: "#fed7aa" },
}

export function sortWeekdays(days: number[]): number[] {
  return [...days].sort((a, b) => {
    const order = (d: number) => (d === 0 ? 7 : d)
    return order(a) - order(b)
  })
}

export function hasValidLessonSchedule(schedule: LessonSchedule | null | undefined): boolean {
  return Boolean(schedule?.weekdays?.length && schedule.startTime && schedule.endTime)
}

export function formatLessonScheduleTime(schedule: LessonSchedule | null | undefined): string | null {
  if (!hasValidLessonSchedule(schedule)) return null
  return `${schedule!.startTime}–${schedule!.endTime}`
}

export function formatLessonSchedule(schedule: LessonSchedule | null | undefined): string | null {
  const time = formatLessonScheduleTime(schedule)
  if (!time || !schedule?.weekdays?.length) return null
  const days = sortWeekdays(schedule.weekdays)
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ")
  return `${days} · ${time}`
}

function normalizeTimeHHmm(time: string): string {
  const parts = time.trim().split(":")
  const h = Math.min(23, Math.max(0, Number(parts[0]) || 0))
  const m = Math.min(59, Math.max(0, Number(parts[1]) || 0))
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function parseTimeToMinutes(time: string): number {
  const normalized = normalizeTimeHHmm(time)
  const [h, m] = normalized.split(":").map(Number)
  return h * 60 + m
}

export function normalizeLessonSchedule(raw: unknown): LessonSchedule | null {
  if (!raw || typeof raw !== "object") return null
  const value = raw as Record<string, unknown>
  const weekdaysSource = value.weekdays ?? value.lessonWeekdays
  const weekdays = Array.isArray(weekdaysSource)
    ? [...new Set(weekdaysSource.map(Number).filter((day) => day >= 0 && day <= 6))]
    : []
  const startRaw = value.startTime ?? value.lessonStartTime
  const endRaw = value.endTime ?? value.lessonEndTime
  const startTime = typeof startRaw === "string" ? normalizeTimeHHmm(startRaw) : ""
  const endTime = typeof endRaw === "string" ? normalizeTimeHHmm(endRaw) : ""
  if (!weekdays.length || !startTime || !endTime) return null
  if (parseTimeToMinutes(startTime) >= parseTimeToMinutes(endTime)) return null
  return { weekdays, startTime, endTime }
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function isDuringLesson(schedule: LessonSchedule, now = new Date()): boolean {
  if (!schedule.weekdays.includes(now.getDay())) return false
  const nowMin = minutesSinceMidnight(now)
  const start = parseTimeToMinutes(schedule.startTime)
  const end = parseTimeToMinutes(schedule.endTime)
  return nowMin >= start && nowMin < end
}

export function getNextLessonStart(schedule: LessonSchedule, now = new Date()): Date | null {
  if (!schedule.weekdays?.length) return null
  const startMin = parseTimeToMinutes(schedule.startTime)
  const weekdaySet = new Set(schedule.weekdays)

  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(now)
    candidate.setDate(candidate.getDate() + offset)
    candidate.setSeconds(0, 0)

    if (!weekdaySet.has(candidate.getDay())) continue

    const lessonStart = new Date(candidate)
    lessonStart.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0)

    if (lessonStart.getTime() > now.getTime()) return lessonStart
  }

  return null
}

export interface CountdownDisplay {
  primary: string
  secondsLabel: string
}

export function splitCountdown(ms: number): CountdownDisplay {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const totalHours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const primary =
    totalHours > 0 ? `${totalHours}h ${minutes}m` : `${minutes}m`

  return {
    primary,
    secondsLabel: `${seconds}s`,
  }
}

/** @deprecated Use splitCountdown for live UI. */
export function formatCountdown(ms: number): string {
  const { primary, secondsLabel } = splitCountdown(ms)
  return `${primary} ${secondsLabel}`
}

export const LESSON_ACTIVE_PHRASES: ReadonlyArray<{
  text: string
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap
}> = [
  { text: "Good luck in class!", icon: "sparkles-outline" },
  { text: "Stay focused — you've got this!", icon: "eye-outline" },
  { text: "Make the most of today's lesson!", icon: "bulb-outline" },
  { text: "Time to shine in class!", icon: "star-outline" },
  { text: "Bring your best energy to the lesson!", icon: "flash-outline" },
  { text: "Every minute in class counts!", icon: "timer-outline" },
  { text: "Listen, participate, grow!", icon: "ear-outline" },
  { text: "You're in class — stay present!", icon: "school-outline" },
  { text: "Ask questions and learn boldly!", icon: "chatbubble-ellipses-outline" },
  { text: "Focus mode: lesson time!", icon: "lock-closed-outline" },
  { text: "Turn distractions off — class is on!", icon: "phone-portrait-outline" },
  { text: "Small steps today, big results tomorrow!", icon: "trending-up-outline" },
  { text: "Your future self will thank you!", icon: "heart-outline" },
  { text: "Engage fully — that's how progress happens!", icon: "rocket-outline" },
  { text: "Class is live — jump in!", icon: "play-circle-outline" },
  { text: "Be curious, be active, be you!", icon: "happy-outline" },
  { text: "Lesson time — let's level up!", icon: "arrow-up-circle-outline" },
  { text: "Concentrate now, celebrate later!", icon: "trophy-outline" },
  { text: "You're exactly where you need to be!", icon: "checkmark-circle-outline" },
  { text: "One focused lesson at a time!", icon: "layers-outline" },
]

export function pickRandomLessonPhrase(): (typeof LESSON_ACTIVE_PHRASES)[number] {
  const idx = Math.floor(Math.random() * LESSON_ACTIVE_PHRASES.length)
  return LESSON_ACTIVE_PHRASES[idx]
}

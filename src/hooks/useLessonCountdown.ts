import { useEffect, useMemo, useState } from "react"
import {
  formatLessonSchedule,
  getNextLessonStart,
  isDuringLesson,
  splitCountdown,
  type LessonSchedule,
} from "../lib/lesson-schedule"

export function useLessonCountdown(schedule: LessonSchedule | null) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!schedule) return
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [schedule])

  const scheduleLabel = useMemo(() => formatLessonSchedule(schedule), [schedule])
  const duringLesson = useMemo(
    () => (schedule ? isDuringLesson(schedule, now) : false),
    [schedule, now],
  )
  const nextStart = useMemo(
    () => (schedule ? getNextLessonStart(schedule, now) : null),
    [schedule, now],
  )
  const countdownMs = nextStart ? Math.max(0, nextStart.getTime() - now.getTime()) : 0
  const countdown = splitCountdown(countdownMs)
  const hasSchedule = Boolean(schedule && scheduleLabel)

  return {
    duringLesson,
    countdown,
    countdownMs,
    scheduleLabel,
    hasSchedule,
  }
}

export function formatDue(iso: string, status: string): { label: string; overdue: boolean } {
  if (status === "completed") {
    return { label: "Submitted", overdue: false }
  }
  const due = new Date(iso).getTime()
  const diff = due - Date.now()
  const overdue = diff < 0
  const abs = Math.abs(diff)
  const minutes = Math.floor(abs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  let suffix: string
  if (days >= 1) suffix = `${days}d`
  else if (hours >= 1) suffix = `${hours}h`
  else suffix = `${Math.max(1, minutes)}m`

  return {
    label: overdue ? `Overdue by ${suffix}` : `Due in ${suffix}`,
    overdue,
  }
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function groupKey(iso: string): "Today" | "Yesterday" | "Earlier" {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return "Today"
  if (sameDay(d, yesterday)) return "Yesterday"
  return "Earlier"
}

function lerpColor(from: string, to: string, t: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const
  }
  const [fr, fg, fb] = parse(from)
  const [tr, tg, tb] = parse(to)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
  const toHex = (v: number) => v.toString(16).padStart(2, "0")
  return `#${toHex(mix(fr, tr))}${toHex(mix(fg, tg))}${toHex(mix(fb, tb))}`
}

/** Red at 0%, yellow at 50%, green at 100%. */
export function scoreColor(percent: number): string {
  const p = Math.max(0, Math.min(100, percent))
  if (p <= 50) return lerpColor("#EF4444", "#EAB308", p / 50)
  return lerpColor("#EAB308", "#22C55E", (p - 50) / 50)
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function dateGroupLabel(iso: string): string {
  const key = groupKey(iso)
  if (key !== "Earlier") return key
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}.${mm}.${d.getFullYear()}`
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function primaryLevel(levels: string[]): string {
  const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]
  let best = Number.MAX_SAFE_INTEGER
  for (const l of levels) {
    for (const part of l.split(/[-–]/)) {
      const idx = CEFR_ORDER.indexOf(part.trim().toUpperCase())
      if (idx >= 0 && idx < best) best = idx
    }
  }
  return best === Number.MAX_SAFE_INTEGER ? "A1" : CEFR_ORDER[best]
}

export function clampToFixedLevel(level: string): string {
  const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]
  return CEFR_ORDER.includes(level) ? level : "A1"
}

export function buildTopicSummaries(
  exercises: { topic: string; totalQuestions: number; category: string; level: string }[],
  metas: Array<{
    topic?: string
    slug?: string
    title: string
    description?: string
    category?: "grammar" | "vocabulary" | "speaking"
    levels?: string | string[]
    comingSoon?: boolean
  }>,
): import("../types/vocabulary").TopicSummary[] {
  const byTopic = new Map<
    string,
    { count: number; questions: number; category: string; level: string }
  >()
  for (const ex of exercises) {
    const cur = byTopic.get(ex.topic) ?? {
      count: 0,
      questions: 0,
      category: ex.category,
      level: ex.level,
    }
    cur.count += 1
    cur.questions += ex.totalQuestions
    byTopic.set(ex.topic, cur)
  }

  const metaBySlug = new Map(
    metas.map((m) => {
      const key = m.topic ?? m.slug ?? ""
      return [key, m] as const
    }),
  )

  const real = Array.from(byTopic.entries()).map(([topic, stats]) => {
    const meta = metaBySlug.get(topic)
    const levelsRaw = meta?.levels
    const levels = Array.isArray(levelsRaw)
      ? levelsRaw
      : typeof levelsRaw === "string" && levelsRaw
        ? [levelsRaw]
        : [stats.level]
    return {
      topic,
      title: meta?.title ?? topic,
      description: meta?.description ?? "",
      category: (stats.category as "grammar" | "vocabulary" | "speaking") ?? "grammar",
      levels,
      exerciseCount: stats.count,
      questionCount: stats.questions,
      comingSoon: false,
    }
  })

  const realSlugs = new Set(real.map((t) => t.topic))
  const placeholders = metas
    .filter((m) => {
      const key = m.topic ?? m.slug ?? ""
      return key && !realSlugs.has(key)
    })
    .map((m) => {
      const topic = m.topic ?? m.slug ?? ""
      const levelsRaw = m.levels
      const levels = Array.isArray(levelsRaw)
        ? levelsRaw
        : typeof levelsRaw === "string" && levelsRaw
          ? [levelsRaw]
          : ["A1"]
      return {
        topic,
        title: m.title,
        description: m.description ?? "",
        category: m.category ?? "grammar",
        levels,
        exerciseCount: 0,
        questionCount: 0,
        comingSoon: m.comingSoon ?? true,
      }
    })

  return [...real, ...placeholders]
}

import { exercisesApi } from "./api"
import type { Subject } from "../types/domain"
import { listeningHomeworkSlug } from "../types/listening"
import { podcastHomeworkSlug } from "../types/podcast"
import { readingHomeworkSlug } from "../types/reading"
import { VOCAB_SLUG_PREFIX } from "../types/vocabulary"
import type { AssignFolder } from "../theme/teacher-tokens"
import type { GrammarCategory } from "../types/grammar"

export type TeacherMaterialOption = {
  slug: string
  title: string
  subtitle?: string
  level?: string
  /** Backend homework subject (podcast → listening). */
  homeworkSubject: Subject
  folder: AssignFolder
  estimatedMinutes?: number
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const

function normalizeLevel(level?: string): string | undefined {
  if (!level) return undefined
  const match = level.toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/)
  return match?.[1]
}

export function materialLevels(level?: string): string[] {
  if (!level?.trim()) return []
  const upper = level.toUpperCase()
  if (upper.includes("IELTS")) return ["IELTS"]
  const matches = upper.match(/\b(A1|A2|B1|B2|C1|C2)\b/g)
  return matches ? [...new Set(matches)] : []
}

function matchesLevel(materialLevel: string | undefined, selectedLevel: string): boolean {
  const levels = materialLevels(materialLevel)
  if (levels.length === 0) return selectedLevel === "IELTS"
  return levels.includes(selectedLevel)
}

async function loadCategoryExerciseMaterials(
  category: GrammarCategory,
  folder: AssignFolder,
  homeworkSubject: Subject,
): Promise<TeacherMaterialOption[]> {
  const summaries = await exercisesApi.summaries(undefined, { category })
  return summaries.map((ex) => ({
    slug: ex.slug,
    title: ex.title,
    subtitle: ex.subtopic || ex.topic,
    level: normalizeLevel(ex.level) ?? ex.level,
    homeworkSubject,
    folder,
    estimatedMinutes: ex.estimatedTime,
  }))
}

export async function loadTeacherMaterials(
  folder: AssignFolder,
  level?: string,
): Promise<TeacherMaterialOption[]> {
  let options: TeacherMaterialOption[] = []

  if (folder === "grammar") {
    options = await loadCategoryExerciseMaterials("grammar", "grammar", "grammar")
  } else if (folder === "speaking") {
    options = await loadCategoryExerciseMaterials("speaking", "speaking", "speaking")
  } else if (folder === "writing") {
    options = []
  } else if (folder === "vocabulary") {
    const decks = await exercisesApi.vocabSummaries()
    options = decks.map((d) => ({
      slug: d.slug.startsWith(VOCAB_SLUG_PREFIX) ? d.slug : `${VOCAB_SLUG_PREFIX}${d.slug}`,
      title: d.title,
      subtitle: d.level,
      level: normalizeLevel(d.level) ?? d.level,
      homeworkSubject: "vocabulary" as Subject,
      folder,
      estimatedMinutes: Math.max(5, Math.round((d.wordCount || 0) / 3)),
    }))
  } else if (folder === "reading") {
    const items = await exercisesApi.readingSummaries()
    options = items.map((r) => ({
      slug: readingHomeworkSlug(r.slug),
      title: r.title,
      subtitle: r.level ?? r.subtitle,
      level: normalizeLevel(r.level) ?? r.level ?? "IELTS",
      homeworkSubject: "reading" as Subject,
      folder,
      estimatedMinutes: Math.max(15, r.totalTimeMinutes || 20),
    }))
  } else if (folder === "listening") {
    const items = await exercisesApi.listeningSummaries()
    options = items.map((l) => ({
      slug: listeningHomeworkSlug(l.slug),
      title: l.title,
      subtitle: l.subtitle,
      level: "IELTS",
      homeworkSubject: "listening" as Subject,
      folder,
      estimatedMinutes: Math.max(30, l.totalTimeMinutes || 30),
    }))
  } else if (folder === "podcast") {
    const items = await exercisesApi.podcastSummaries()
    options = items.map((p) => ({
      slug: podcastHomeworkSlug(p.slug),
      title: p.title,
      subtitle: p.topic || p.level,
      level: normalizeLevel(p.level) ?? p.level,
      homeworkSubject: "listening" as Subject,
      folder,
      estimatedMinutes: Math.max(5, p.durationMinutes || 10),
    }))
  }

  if (!level) return options
  return filterMaterialsByLevel(options, level)
}

export function filterMaterialsByLevel(
  materials: TeacherMaterialOption[],
  level: string,
): TeacherMaterialOption[] {
  return materials.filter((m) => matchesLevel(m.level, level))
}

export function countMaterialsByLevel(
  materials: TeacherMaterialOption[],
): Partial<Record<string, number>> {
  const counts: Partial<Record<string, number>> = {}
  for (const m of materials) {
    const levels = materialLevels(m.level)
    if (levels.length === 0) continue
    for (const lvl of levels) {
      counts[lvl] = (counts[lvl] ?? 0) + 1
    }
  }
  return counts
}

export const ASSIGN_LEVEL_ORDER = ["IELTS", ...CEFR_LEVELS] as const

export function materialCartKey(m: Pick<TeacherMaterialOption, "slug" | "homeworkSubject">): string {
  return `${m.homeworkSubject}:${m.slug}`
}

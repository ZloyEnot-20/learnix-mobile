import type {
  BookDocument,
  BookExerciseRaw,
  BookSectionRaw,
  BookUnitRaw,
  LessonStep,
} from "./types"
import { inferExerciseUiType, sectionDisplayLabel, uiLabelFor } from "./infer-exercise-type"

function isExerciseNode(node: BookSectionRaw | BookExerciseRaw): boolean {
  return Boolean(node.exercise_id) || node.section_type === "test_practice" || Boolean(node.notes)
}

function asExerciseRaw(node: BookSectionRaw | BookExerciseRaw): BookExerciseRaw {
  const { exercises: _ignored, ...rest } = node as BookExerciseRaw & { exercises?: unknown }
  return rest as BookExerciseRaw
}

/**
 * Walk unit.sections in JSON order.
 * Handles: nested exercises[], orphan exercises at section level, test_practice sections.
 */
export function flattenUnitToSteps(
  unit: BookUnitRaw,
  answerKey?: Record<string, unknown>,
): LessonStep[] {
  const steps: LessonStep[] = []
  const sections = unit.sections ?? []
  let order = 0

  const pushStep = (
    raw: BookExerciseRaw,
    sectionType: string,
    subtype?: string,
  ) => {
    const exerciseId =
      (typeof raw.exercise_id === "string" && raw.exercise_id) ||
      (sectionType === "test_practice" ? "test_practice" : `step-${order + 1}`)
    const uiType = inferExerciseUiType({ ...raw, section_type: sectionType, subtype })
    const key = answerKey?.[exerciseId] ?? (exerciseId === "test_practice" ? answerKey?.test_practice : undefined)
    steps.push({
      id: `u${unit.unit_number}-${exerciseId}`,
      unitNumber: unit.unit_number,
      exerciseId,
      sectionType,
      sectionLabel: sectionDisplayLabel(sectionType, subtype),
      order: order++,
      instruction: typeof raw.instruction === "string" ? raw.instruction : "",
      uiType,
      uiLabel: uiLabelFor(uiType),
      raw: { ...raw, section_type: sectionType, subtype, exercise_id: exerciseId },
      answers: key,
      ready: true,
    })
  }

  for (const section of sections) {
    const sectionType = (section.section_type as string) || "vocabulary"
    const subtype = typeof section.subtype === "string" ? section.subtype : undefined

    if (Array.isArray(section.exercises) && section.exercises.length > 0) {
      for (const ex of section.exercises) {
        pushStep(ex, sectionType, subtype)
      }
      continue
    }

    if (isExerciseNode(section)) {
      pushStep(asExerciseRaw(section), sectionType === "test_practice" ? "test_practice" : sectionType || "vocabulary", subtype)
    }
  }

  return steps
}

export function buildLessonFlow(book: BookDocument, unitNumber: number): LessonStep[] {
  const unit = book.units.find((u) => u.unit_number === unitNumber)
  if (!unit) return []
  if (!unit.sections || unit.sections.length === 0) return []
  const keyName = `unit_${unitNumber}`
  const answerKey = (book.answer_key?.[keyName] as Record<string, unknown> | undefined) ?? undefined
  return flattenUnitToSteps(unit, answerKey)
}

export function unitIsReady(unit: BookUnitRaw): boolean {
  return Array.isArray(unit.sections) && unit.sections.length > 0
}

export function listUnits(book: BookDocument) {
  return book.units.map((u) => ({
    unitNumber: u.unit_number,
    title: u.title,
    subtitle: u.subtitle,
    ready: unitIsReady(u),
    stepCount: unitIsReady(u) ? flattenUnitToSteps(u).length : 0,
  }))
}

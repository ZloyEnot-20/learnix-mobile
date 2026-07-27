import {
  GRAMMAR_BLANK_TOKEN,
  type GrammarExercise,
  type GrammarExerciseType,
  type GrammarQuestion,
} from "../types/grammar"

/** Resolve the effective type for one question inside an exercise. */
export function resolveQuestionType(
  question: GrammarQuestion,
  exerciseType: GrammarExerciseType,
): GrammarExerciseType {
  if (question.type) return question.type
  if (question.segments?.length) return "error-correction"
  if (question.correctBool !== undefined) return "true-false"
  if (question.options?.length) return "multiple-choice"
  if (
    question.text.includes(GRAMMAR_BLANK_TOKEN) ||
    (question.blanks?.length ?? 0) > 0
  ) {
    return "fill-in-the-blank"
  }
  if (exerciseType !== "mixed") return exerciseType
  return "fill-in-the-blank"
}

/** Unique question types present in an exercise. */
export function collectExerciseQuestionTypes(
  exercise: GrammarExercise,
): GrammarExerciseType[] {
  const types = new Set<GrammarExerciseType>()
  if (exercise.type !== "mixed") types.add(exercise.type)
  for (const t of exercise.questionTypes ?? []) {
    if (t !== "mixed") types.add(t)
  }
  for (const q of exercise.content.questions ?? []) {
    const resolved = resolveQuestionType(q, exercise.type)
    if (resolved !== "mixed") types.add(resolved)
  }
  return [...types]
}

/** Whether an exercise should appear under a topic type filter. */
export function exerciseMatchesType(
  exercise: GrammarExercise,
  type: GrammarExerciseType,
): boolean {
  if (type === "mixed") return exercise.type === "mixed"
  if (exercise.type === type) return true
  if (exercise.questionTypes?.includes(type)) return true
  return (exercise.content.questions ?? []).some(
    (q) => resolveQuestionType(q, exercise.type) === type,
  )
}

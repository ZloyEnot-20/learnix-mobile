import type {
  IeltsListeningCatalogItem,
  IeltsListeningPart,
  IeltsListeningQuestion,
  IeltsListeningQuestionDetail,
  IeltsListeningTest,
} from "../types/ielts"
import type { HomeworkAttempt, HomeworkMistake } from "../types/domain"

import listeningIndex from "../data/ielts-listening/index.json"
import { LOCAL_LISTENING_TESTS } from "../data/ielts-listening/tests-registry.generated"
import { exercisesApi } from "./api"
import { runPerfTrace } from "./perf"

const LOCAL_TESTS: Record<string, IeltsListeningTest> = LOCAL_LISTENING_TESTS

type IndexEntry = {
  book: number
  test: number
  status: string
  file: string
}

export function idFromListeningFile(file: string): string {
  return file.replace(/\.json$/, "")
}

export function countListeningQuestions(test: IeltsListeningTest): number {
  const ids = new Set<number>()
  for (const part of test.parts) {
    for (const question of part.questions) {
      if (question.id <= 40) ids.add(question.id)
    }
  }
  return ids.size
}

export async function listIeltsListeningTests(): Promise<IeltsListeningCatalogItem[]> {
  const entries = listeningIndex as IndexEntry[]
  return entries
    .filter((entry) => entry.status === "ok")
    .map((entry) => {
      const id = idFromListeningFile(entry.file)
      const test = LOCAL_TESTS[id]
      return {
        id,
        file: entry.file,
        book: entry.book,
        test: entry.test,
        title: test?.title ?? `Cambridge IELTS ${entry.book} Listening Test ${entry.test}`,
        subtitle: `Book ${entry.book} · Test ${entry.test}`,
        estimatedMinutes: test?.totalTime ?? 30,
        questionCount: test ? countListeningQuestions(test) : 40,
      }
    })
    .sort((a, b) => b.book - a.book || a.test - b.test)
}

export async function getIeltsListeningTest(id: string): Promise<IeltsListeningTest | null> {
  return runPerfTrace(
    "load_ielts_listening_test",
    async () => {
      try {
        const doc = await exercisesApi.listening(id)
        if (doc?.data) return doc.data
      } catch {
        // fall back to bundled test
      }
      return LOCAL_TESTS[id] ?? null
    },
    { testType: "ielts-listening" },
  )
}

export function flattenListeningQuestions(test: IeltsListeningTest) {
  return test.parts.flatMap((part) =>
    part.questions.map((question) => ({
      ...question,
      partNumber: part.partNumber,
    })),
  )
}

export function formatListeningCorrectAnswer(question: IeltsListeningQuestion): string {
  return parseCorrectVariants(question.correctAnswer).join(" / ")
}

export function buildListeningMistakes(
  test: IeltsListeningTest,
  answers: Record<number, string>,
): HomeworkMistake[] {
  const mistakes: HomeworkMistake[] = []

  for (const part of test.parts) {
    for (const question of part.questions) {
      const userAnswer = answers[question.id] ?? ""
      const detail = getQuestionDetail(test, question.id)
      if (isListeningAnswerCorrect(question, userAnswer, detail)) continue

      const prompt =
        detail?.question?.trim() ||
        extractListeningMcPrompt(question.question ?? "", question.options ?? []) ||
        `Question ${question.id}`

      mistakes.push({
        questionId: question.id,
        prompt,
        userAnswer: userAnswer.trim() || "—",
        correctAnswer: formatListeningCorrectAnswer(question),
      })
    }
  }

  return mistakes
}

export function buildListeningAnswers(
  test: IeltsListeningTest,
  answers: Record<number, string>,
): Array<{ questionId: number; userAnswer: string }> {
  const result: Array<{ questionId: number; userAnswer: string }> = []
  for (const part of test.parts) {
    for (const question of part.questions) {
      const userAnswer = (answers[question.id] ?? "").trim()
      if (userAnswer) result.push({ questionId: question.id, userAnswer })
    }
  }
  return result
}

export function buildListeningAttempt(
  test: IeltsListeningTest,
  answers: Record<number, string>,
  durationSeconds: number,
): HomeworkAttempt {
  const mistakes = buildListeningMistakes(test, answers)
  const { correct, total } = scoreListeningTest(test, answers)
  const answeredCount = Object.values(answers).filter((a) => a.trim()).length

  return {
    totalQuestions: total,
    correctCount: correct,
    durationSeconds,
    answeredCount,
    mistakes,
    readingAnswers: buildListeningAnswers(test, answers),
  }
}

function collectInlineQuestionIdsFromText(text: string, ids: Set<number>) {
  for (const match of text.matchAll(/\[(\d+)\]/g)) {
    ids.add(Number.parseInt(match[1], 10))
  }
}

function polishInstructionSpacing(text: string): string {
  return text
    .replace(/([A-H])\s+,/gi, "$1,")
    .replace(/,\s+([A-H])/gi, ", $1")
    .replace(/([A-H]-[A-H])\s+\./gi, "$1.")
    .replace(/\s+\./g, ".")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeInstructionParagraph(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ""

  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean)
  if (lines.length <= 1) return polishInstructionSpacing(trimmed)

  const lowerBlob = lines.join(" ").toLowerCase()
  const hasInstruction = ["choose ", "write ", "complete ", "answer ", "match "].some((marker) =>
    lowerBlob.includes(marker),
  )
  const letterLines = lines.filter(
    (line) => /^[A-H][.,]?$/i.test(line) || [",", ".", "or", "and"].includes(line),
  ).length

  if (
    hasInstruction &&
    (letterLines >= 2 || lines.some((line) => /^[A-H]$/i.test(line)))
  ) {
    let joined = lines.join(" ").replace(/\s+/g, " ")
    joined = joined.replace(/\s+,/g, ",")
    joined = joined.replace(/,\s*,/g, ",")
    joined = joined.replace(/([A-H])\s+,/gi, "$1,")
    joined = joined.replace(/,\s+([A-H])/gi, ", $1")
    joined = joined.replace(/([A-H]-[A-H])\s+\./gi, "$1.")
    joined = joined.replace(
      /(letter(?:s)?,)\s*([A-H])\s+([A-H])\s+or\s+([A-H])/gi,
      "$1 $2, $3 or $4",
    )
    joined = joined.replace(/\s+\./g, ".")
    joined = joined.replace(/\s+or\s+/gi, " or ")
    if (trimmed.endsWith(".") && !joined.endsWith(".")) joined += "."
    return polishInstructionSpacing(joined)
  }

  return lines.join("\n")
}

export function normalizeListeningDisplayText(text: string): string {
  if (!text.trim()) return text
  const parts = text.trim().split(/\n\n+/)
  return parts
    .map((part) => normalizeInstructionParagraph(part))
    .filter(Boolean)
    .join("\n\n")
}

export function extractInlineQuestionIds(content: string): Set<number> {
  const ids = new Set<number>()
  collectInlineQuestionIdsFromText(content, ids)
  return ids
}

export function extractListeningMcPrompt(question: string, options: string[]): string {
  const trimmed = question.trim()
  if (!trimmed || !options.length) return trimmed

  const firstLetter = options[0]?.trim().match(/^([A-H])\./i)?.[1]
  if (!firstLetter) return trimmed

  for (const pattern of [
    new RegExp(`\\s${firstLetter}\\.\\s`, "i"),
    new RegExp(`\\s${firstLetter}\\s+`, "i"),
  ]) {
    const index = trimmed.search(pattern)
    if (index > 0) return trimmed.slice(0, index).trim()
  }

  return trimmed
}

export function extractInlineQuestionIdsFromPart(part: IeltsListeningPart): Set<number> {
  const ids = new Set<number>()

  if (part.contentBlocks?.length) {
    for (const block of part.contentBlocks) {
      switch (block.type) {
        case "text":
          collectInlineQuestionIdsFromText(block.text, ids)
          break
        case "table":
          for (const header of block.headers) {
            collectInlineQuestionIdsFromText(header, ids)
          }
          for (const row of block.rows) {
            for (const cell of row) {
              collectInlineQuestionIdsFromText(cell, ids)
            }
          }
          break
        case "multi-select-group":
          for (const questionId of block.questionIds) {
            ids.add(questionId)
          }
          break
        case "multiple-choice":
          ids.add(block.questionId)
          break
        case "matching-grid":
          for (const row of block.rows) {
            ids.add(row.questionId)
          }
          break
        case "flow-chart":
          for (const step of block.steps) {
            ids.add(step.questionId)
          }
          break
        case "notes":
          for (const section of block.sections) {
            for (const line of section.lines) {
              if (line.kind === "blank") {
                ids.add(line.questionId)
              }
            }
          }
          break
        case "image":
          break
      }
    }
    return ids
  }

  return extractInlineQuestionIds(part.content)
}

export function getQuestionDetail(
  test: IeltsListeningTest,
  questionId: number,
): IeltsListeningQuestionDetail | undefined {
  return test.questionDetails?.find((q) => q.id === questionId)
}

export function parseCorrectVariants(raw: string): string[] {
  return raw
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function isMultiSelectListeningQuestion(
  question: IeltsListeningQuestion,
  detail?: IeltsListeningQuestionDetail,
): boolean {
  const variants = parseCorrectVariants(question.correctAnswer)
  if (variants.length < 2) return false
  if (!variants.every((v) => /^[A-H]$/i.test(v))) return false
  const prompt = detail?.question ?? ""
  return /TWO/i.test(prompt) || variants.length === 2
}

export function isListeningAnswerCorrect(
  question: IeltsListeningQuestion,
  userAnswer: string,
  detail?: IeltsListeningQuestionDetail,
): boolean {
  const user = userAnswer.trim()
  if (!user) return false

  const variants = parseCorrectVariants(question.correctAnswer)

  if (isMultiSelectListeningQuestion(question, detail)) {
    const userLetters = parseCorrectVariants(user.replace(/,/g, " / "))
      .map((v) => v.toUpperCase())
      .sort()
    const correctLetters = variants.map((v) => v.toUpperCase()).sort()
    return (
      userLetters.length === correctLetters.length &&
      userLetters.every((letter, index) => letter === correctLetters[index])
    )
  }

  const userNorm = user.toUpperCase()
  return variants.some((variant) => variant.toUpperCase() === userNorm)
}

export function scoreListeningTest(
  test: IeltsListeningTest,
  answers: Record<number, string>,
): { correct: number; total: number } {
  let correct = 0
  let total = 0

  for (const part of test.parts) {
    for (const question of part.questions) {
      total += 1
      const detail = getQuestionDetail(test, question.id)
      if (isListeningAnswerCorrect(question, answers[question.id] ?? "", detail)) {
        correct += 1
      }
    }
  }

  return { correct, total }
}

const BAND_SCORE_TABLE = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 32, max: 34, band: 7.5 },
  { min: 30, max: 31, band: 7.0 },
  { min: 26, max: 29, band: 6.5 },
  { min: 23, max: 25, band: 6.0 },
  { min: 18, max: 22, band: 5.5 },
  { min: 16, max: 17, band: 5.0 },
  { min: 13, max: 15, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 0, max: 9, band: 3.5 },
]

export function listeningBandScore(correct: number): number {
  return BAND_SCORE_TABLE.find((range) => correct >= range.min && correct <= range.max)?.band ?? 0
}

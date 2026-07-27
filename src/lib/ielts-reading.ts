import type { HomeworkAttempt, HomeworkMistake } from "../types/domain"
import type { IeltsReadingCatalogItem, IeltsReadingQuestion, IeltsReadingTest } from "../types/ielts"

import readingIndex from "../data/ielts-reading/index.json"
import marieCuriePart1 from "../data/ielts-reading/marie-curie-part1.json"
import { LOCAL_READING_TESTS } from "../data/ielts-reading/tests-registry.generated"
import { exercisesApi } from "./api"
import { runPerfTrace } from "./perf"

const LOCAL_TESTS: Record<string, IeltsReadingTest> = {
  "marie-curie-part1": marieCuriePart1 as IeltsReadingTest,
  ...LOCAL_READING_TESTS,
}

type IndexEntry = IeltsReadingCatalogItem & { book?: number; test?: number }

export async function listIeltsReadingTasks(): Promise<IeltsReadingCatalogItem[]> {
  const items = (readingIndex as { items: IndexEntry[] }).items
  if (items.length > 0) {
    return items
      .slice()
      .sort((a, b) => (b.book ?? 0) - (a.book ?? 0) || (a.test ?? 0) - (b.test ?? 0))
  }

  try {
    const remote = await exercisesApi.readingSummaries()
    return remote
      .map((item) => ({
        id: item.slug,
        title: item.title,
        subtitle: item.subtitle,
        estimatedMinutes: item.totalTimeMinutes,
        questionCount: item.questionCount,
        file: `${item.slug}.json`,
      }))
      .sort((a, b) => a.title.localeCompare(b.title))
  } catch {
    return []
  }
}

export async function getIeltsReadingTest(id: string): Promise<IeltsReadingTest | null> {
  return runPerfTrace(
    "load_ielts_test",
    async () => {
      if (LOCAL_TESTS[id]) return LOCAL_TESTS[id]
      try {
        const doc = await exercisesApi.reading(id)
        if (doc?.data) return doc.data
      } catch {
        // no remote fallback
      }
      return null
    },
    { testType: "ielts" },
  )
}

export function countReadingQuestions(test: IeltsReadingTest): number {
  return test.parts.reduce((sum, part) => {
    if (part.sections?.length) {
      return (
        sum +
        part.sections.reduce((sectionSum, section) => sectionSum + section.questions.length, 0)
      )
    }
    return sum + part.questions.length
  }, 0)
}

export function flattenReadingQuestions(test: IeltsReadingTest) {
  return test.parts.flatMap((part) => {
    if (part.sections?.length) {
      return part.sections.flatMap((section) =>
        section.questions.map((q) => ({
          ...q,
          partNumber: part.partNumber,
          passageTitle: part.passageTitle,
          questionInstruction: section.instruction || part.questionInstruction,
        })),
      )
    }
    return part.questions.map((q) => ({
      ...q,
      partNumber: part.partNumber,
      passageTitle: part.passageTitle,
      questionInstruction: part.questionInstruction,
    }))
  })
}

const ROMAN_NUMERAL = /^(?:i{1,3}|iv|v|vi{0,3}|ix|x)$/i
const ROMAN_NUMERAL_OPTION = /^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.\s/i

export function usesRomanNumeralOptions(options: string[] | undefined): boolean {
  if (!options?.length) return false
  const romanCount = options.filter((option) => ROMAN_NUMERAL_OPTION.test(option.trim())).length
  return romanCount >= Math.ceil(options.length / 2)
}

export function formatReadingChoiceLabel(option: string, index: number): string {
  const trimmed = decodeReadingText(option).trim()
  if (ROMAN_NUMERAL_OPTION.test(trimmed)) return trimmed
  if (/^[A-Z]\.\s/.test(trimmed)) return trimmed
  if (/^\d+\.\s/.test(trimmed)) return trimmed
  return `${String.fromCharCode(65 + index)}. ${trimmed}`
}

export function extractReadingOptionValue(option: string): string {
  const trimmed = decodeReadingText(option).trim()
  const roman = trimmed.match(/^((?:i{1,3}|iv|v|vi{0,3}|ix|x))\.(?:\s|$)/i)
  if (roman) return roman[1].toLowerCase()
  const letter = trimmed.match(/^([A-Z])(?:\.|\s)(?:\s|$)/)
  if (letter) return letter[1]
  const letterOnly = trimmed.match(/^([A-Z])\.(?:\s|$)/)
  if (letterOnly) return letterOnly[1]
  return trimmed
}

export function isReadingAnswerCorrect(
  question: { type: string; correctAnswer: string | number | string[]; options?: string[] },
  answer: string,
): boolean {
  const normalized = answer.trim()
  if (!normalized) return false

  if (question.type === "multiple-choice") {
    const userKey = extractReadingOptionValue(normalized).toLowerCase()
    const correctRaw =
      typeof question.correctAnswer === "number"
        ? String(question.correctAnswer)
        : String(question.correctAnswer).trim()
    const correctKey = extractReadingOptionValue(correctRaw).toLowerCase()

    if (ROMAN_NUMERAL.test(userKey) || ROMAN_NUMERAL.test(correctKey)) {
      return userKey === correctKey
    }

    const user = normalized.toUpperCase()
    const correct = correctRaw.toUpperCase()
    if (user.length === 1 && correct.length === 1) return user === correct
    return user === correct || user.startsWith(`${correct}.`) || user.startsWith(`${correct} `)
  }

  if (Array.isArray(question.correctAnswer)) {
    const userAnswers = normalized.split("|||").filter(Boolean).map((a) => a.trim().toUpperCase())
    const correctAnswers = question.correctAnswer.map((a) => String(a).trim().toUpperCase())
    return (
      userAnswers.length === correctAnswers.length &&
      userAnswers.every((a) => correctAnswers.includes(a))
    )
  }

  const correctRaw = String(question.correctAnswer).trim()
  const variants = correctRaw
    .split(/\s*\/\s*/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)
  const user = normalized.toUpperCase()
  return variants.some((variant) => variant === user)
}

export function decodeReadingText(value: string): string {
  return (
    value
      .replace(/&rsquo;|&#8217;|&apos;/gi, "'")
      .replace(/&lsquo;|&#8216;/gi, "'")
      .replace(/&ldquo;|&#8220;/gi, '"')
      .replace(/&rdquo;|&#8221;/gi, '"')
      .replace(/&ndash;|&#8211;/gi, "–")
      .replace(/&mdash;|&#8212;/gi, "—")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/\u00a0/g, " ")
      // Strip leftover HTML (e.g. <em>H. naledi</em>) so tags never show in RN Text
      .replace(/<\/?[a-zA-Z][^>]*>/g, "")
      .replace(/\s{2,}/g, " ")
  )
}

export function isPlaceholderReadingQuestion(text: string): boolean {
  const t = decodeReadingText(text).trim()
  if (!t) return true
  if (/^Question\s+\d+$/i.test(t)) return true
  if (/^[A-K]$/i.test(t)) return true
  if (t.length <= 2 && /^[A-Za-z0-9]$/.test(t)) return true
  return false
}

/** Strip question stems accidentally merged into part-level instructions. */
export function cleanPartQuestionInstruction(raw: string | undefined): string {
  const text = decodeReadingText(raw ?? "").trim()
  if (!text) return ""

  const splitPatterns = [
    /^(.*?(?:on your answer sheet\.?))\s+(.+)$/is,
    /^(.*?(?:Write the correct letter[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:Write the correct number[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:Write your answers in boxes \d+[-–]\d+ on your answer sheet\.?))\s+(.+)$/is,
    /^(.*?(?:NOT GIVEN[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:NO MORE THAN[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:ONE WORD[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:TWO WORDS[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:THREE WORDS[^.]*\.))\s+(.+)$/is,
  ]

  for (const pattern of splitPatterns) {
    const match = text.match(pattern)
    if (!match?.[2]) continue
    const tail = match[2].trim()
    if (!tail || /^(Write|Choose|In boxes|You should|Reading Passage)/i.test(tail)) continue
    return match[1].trim()
  }

  return text
}

/** Question stem merged into part instruction when the question field is a placeholder. */
export function extractTrailingInstructionPrompt(raw: string | undefined): string {
  const text = decodeReadingText(raw ?? "").trim()
  if (!text) return ""

  const cleaned = cleanPartQuestionInstruction(raw)
  if (!cleaned || cleaned === text) return ""

  if (text.startsWith(cleaned)) {
    return text.slice(cleaned.length).trim()
  }

  return ""
}

export function resolveReadingQuestionPrompt(
  question: string,
  options?: string[],
  partInstruction?: string,
): string {
  let text = decodeReadingText(question).trim()
  if (!isPlaceholderReadingQuestion(text)) {
    if (options?.length) {
      const inlineOptions = text.match(/^(.+?)\s+[A-D]\s+[A-Z]/i)
      if (inlineOptions) text = inlineOptions[1].trim()
    }
    return text
  }

  return extractTrailingInstructionPrompt(partInstruction)
}

export function scoreReadingTest(
  test: IeltsReadingTest,
  answers: Record<number, string>,
): { correct: number; total: number } {
  const questions = flattenReadingQuestions(test)
  let correct = 0
  for (const question of questions) {
    if (isReadingAnswerCorrect(question, answers[question.id] ?? "")) correct += 1
  }
  return { correct, total: questions.length }
}

const READING_BAND_SCORE_TABLE = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7.0 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6.0 },
  { min: 19, max: 22, band: 5.5 },
  { min: 15, max: 18, band: 5.0 },
  { min: 13, max: 14, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 0, max: 9, band: 3.5 },
]

export function readingBandScore(correct: number): number {
  return (
    READING_BAND_SCORE_TABLE.find((range) => correct >= range.min && correct <= range.max)?.band ??
    0
  )
}

export function formatReadingCorrectAnswer(question: IeltsReadingQuestion): string {
  const raw = question.correctAnswer
  if (Array.isArray(raw)) return raw.map((a) => String(a).trim()).filter(Boolean).join(", ")

  const correctStr = String(raw).trim()
  if (question.type === "multiple-choice" && question.options?.length) {
    const key = extractReadingOptionValue(correctStr).toLowerCase()
    for (let i = 0; i < question.options.length; i++) {
      const opt = question.options[i]
      const optKey = extractReadingOptionValue(opt).toLowerCase()
      if (
        optKey === key ||
        correctStr.toUpperCase() === String.fromCharCode(65 + i) ||
        correctStr.toUpperCase() === opt.trim().toUpperCase()
      ) {
        return formatReadingChoiceLabel(opt, i)
      }
    }
  }

  return correctStr
}

export function buildReadingMistakes(
  test: IeltsReadingTest,
  answers: Record<number, string>,
): HomeworkMistake[] {
  const mistakes: HomeworkMistake[] = []

  for (const question of flattenReadingQuestions(test)) {
    const userAnswer = answers[question.id] ?? ""
    if (isReadingAnswerCorrect(question, userAnswer)) continue

    const prompt =
      resolveReadingQuestionPrompt(
        question.question,
        question.options,
        question.questionInstruction,
      ) || `Question ${question.id}`

    mistakes.push({
      questionId: question.id,
      prompt,
      userAnswer: userAnswer.trim() || "—",
      correctAnswer: formatReadingCorrectAnswer(question),
    })
  }

  return mistakes
}

export function buildReadingAnswers(
  test: IeltsReadingTest,
  answers: Record<number, string>,
): Array<{ questionId: number; userAnswer: string }> {
  const result: Array<{ questionId: number; userAnswer: string }> = []
  for (const question of flattenReadingQuestions(test)) {
    const userAnswer = (answers[question.id] ?? "").trim()
    if (userAnswer) result.push({ questionId: question.id, userAnswer })
  }
  return result
}

export function buildReadingAttempt(
  test: IeltsReadingTest,
  answers: Record<number, string>,
  durationSeconds: number,
): HomeworkAttempt {
  const mistakes = buildReadingMistakes(test, answers)
  const { correct, total } = scoreReadingTest(test, answers)
  const answeredCount = Object.values(answers).filter((a) => a.trim()).length

  return {
    totalQuestions: total,
    correctCount: correct,
    durationSeconds,
    answeredCount,
    mistakes,
    readingAnswers: buildReadingAnswers(test, answers),
  }
}

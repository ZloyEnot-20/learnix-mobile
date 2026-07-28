import { exercisesApi } from "./api"
import type { TeacherMaterialOption } from "./teacher-materials"
import { parseListeningHomeworkSlug } from "../types/listening"
import { parsePodcastHomeworkSlug } from "../types/podcast"
import { parseReadingHomeworkSlug } from "../types/reading"
import { parseVocabHomeworkSlug } from "../types/vocabulary"
import type { GrammarQuestion } from "../types/grammar"
import type { IeltsListeningQuestion } from "../types/ielts"
import type { IeltsReadingQuestion } from "../types/ielts"

export type MaterialPreviewLine = {
  index: number
  text: string
  meta?: string
}

export type MaterialPreview = {
  title: string
  subtitle: string
  lines: MaterialPreviewLine[]
}

function clip(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

function grammarQuestionText(q: GrammarQuestion): string {
  if (q.text?.trim()) return q.text
  if (q.instruction?.trim()) return q.instruction
  return "Question"
}

function readingQuestionText(q: IeltsReadingQuestion): string {
  return q.question?.trim() || "Question"
}

function listeningQuestionText(q: IeltsListeningQuestion): string {
  return q.label?.trim() || "Question"
}

export async function loadMaterialPreview(
  material: TeacherMaterialOption,
): Promise<MaterialPreview> {
  const vocabSlug = parseVocabHomeworkSlug(material.slug)
  if (vocabSlug) {
    const deck = await exercisesApi.vocabDeck(vocabSlug)
    return {
      title: deck.title,
      subtitle: `${deck.words.length} words · Vocabulary`,
      lines: deck.words.slice(0, 40).map((word, i) => ({
        index: i + 1,
        text: word.term,
        meta: word.definition ? clip(word.definition, 80) : undefined,
      })),
    }
  }

  const readingSlug = parseReadingHomeworkSlug(material.slug)
  if (readingSlug) {
    const doc = await exercisesApi.reading(readingSlug)
    const lines: MaterialPreviewLine[] = []
    let n = 0
    for (const part of doc.data.parts ?? []) {
      const pool = [
        ...(part.questions ?? []),
        ...(part.sections ?? []).flatMap((s) => s.questions ?? []),
      ]
      for (const q of pool) {
        n += 1
        lines.push({ index: n, text: clip(readingQuestionText(q)) })
        if (lines.length >= 40) break
      }
      if (lines.length >= 40) break
    }
    return {
      title: doc.title,
      subtitle: `${doc.questionCount} questions · Reading`,
      lines,
    }
  }

  const listeningSlug = parseListeningHomeworkSlug(material.slug)
  if (listeningSlug) {
    const doc = await exercisesApi.listening(listeningSlug)
    const lines: MaterialPreviewLine[] = []
    let n = 0
    for (const part of doc.data.parts ?? []) {
      for (const q of part.questions ?? []) {
        n += 1
        lines.push({ index: n, text: clip(listeningQuestionText(q)) })
        if (lines.length >= 40) break
      }
      if (lines.length >= 40) break
    }
    return {
      title: doc.title,
      subtitle: `${doc.questionCount} questions · Listening`,
      lines,
    }
  }

  const podcastSlug = parsePodcastHomeworkSlug(material.slug)
  if (podcastSlug) {
    const episode = await exercisesApi.podcast(podcastSlug)
    const lines: MaterialPreviewLine[] = []
    if (episode.description?.trim()) {
      lines.push({ index: 0, text: clip(episode.description, 200), meta: "Description" })
    }
    episode.words.slice(0, 30).forEach((w, i) => {
      lines.push({
        index: i + 1,
        text: w.word || w.term || "—",
        meta: w.definition ? clip(w.definition, 80) : undefined,
      })
    })
    return {
      title: episode.title,
      subtitle: `${episode.durationMinutes} min · Podcast`,
      lines,
    }
  }

  const exercise = await exercisesApi.get(material.slug)
  const questions = exercise.content?.questions ?? []
  const pairs = exercise.content?.pairs ?? []

  if (questions.length > 0) {
    return {
      title: exercise.title,
      subtitle: `${questions.length} questions · ${exercise.type}`,
      lines: questions.slice(0, 40).map((q, i) => ({
        index: i + 1,
        text: clip(grammarQuestionText(q)),
        meta: q.type,
      })),
    }
  }

  if (pairs.length > 0) {
    return {
      title: exercise.title,
      subtitle: `${pairs.length} pairs · Matching`,
      lines: pairs.slice(0, 40).map((p, i) => ({
        index: i + 1,
        text: clip(`${p.left} → ${p.right}`),
      })),
    }
  }

  return {
    title: exercise.title,
    subtitle: exercise.instructions || material.folder,
    lines: exercise.description
      ? [{ index: 1, text: clip(exercise.description, 200) }]
      : [],
  }
}

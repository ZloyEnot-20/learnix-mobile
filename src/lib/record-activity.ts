import { saveLastActivity, subjectLabel } from "./last-activity"
import type { Subject } from "../types/domain"
import type { GrammarExercise } from "../types/grammar"
import type { VocabDeck } from "../types/vocabulary"

function grammarSubject(ex: GrammarExercise): Subject {
  return ex.category === "vocabulary" ? "vocabulary" : "grammar"
}

export function recordHomeworkExercise(
  userId: string,
  ex: GrammarExercise,
  homeworkId: string,
  subject: Subject,
): void {
  void saveLastActivity(userId, {
    kind: "homework",
    route: `/homework/exercise/${ex.topic}/${ex.slug}?hw=${homeworkId}`,
    title: ex.title,
    categoryLabel: `${subjectLabel(subject)}: ${ex.subtopic || ex.topic}`,
    subject,
    homeworkId,
  })
}

export function recordHomeworkVocabulary(
  userId: string,
  deck: VocabDeck,
  deckSlug: string,
  homeworkId: string,
): void {
  void saveLastActivity(userId, {
    kind: "homework",
    route: `/homework/vocabulary/${deckSlug}?hw=${homeworkId}`,
    title: deck.title,
    categoryLabel: `Vocabulary: ${deck.title}`,
    subject: "vocabulary",
    homeworkId,
  })
}

export function recordGameExercise(
  userId: string,
  ex: GrammarExercise,
  topic: string,
  slug: string,
): void {
  const subject = grammarSubject(ex)
  void saveLastActivity(userId, {
    kind: "game",
    route: `/exercise/${topic}/${slug}`,
    title: ex.title,
    categoryLabel: `${subjectLabel(subject)}: ${ex.subtopic || topic}`,
    subject,
  })
}

export function recordGameVocabulary(userId: string, deck: VocabDeck, deckSlug: string): void {
  void saveLastActivity(userId, {
    kind: "game",
    route: `/vocabulary/${deckSlug}`,
    title: deck.title,
    categoryLabel: `Vocabulary: ${deck.title}`,
    subject: "vocabulary",
  })
}

export function recordGameTopic(
  userId: string,
  topic: string,
  title: string,
  category: "grammar" | "vocabulary" = "grammar",
): void {
  const subject: Subject = category === "vocabulary" ? "vocabulary" : "grammar"
  void saveLastActivity(userId, {
    kind: "game",
    route: `/exercises/${topic}`,
    title,
    categoryLabel: `${subjectLabel(subject)}: ${title}`,
    subject,
  })
}

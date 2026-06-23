import { saveLastActivity, subjectLabel } from "./last-activity"
import { humanizeSlug } from "./topic-meta"
import type { Subject } from "../types/domain"
import type { GrammarExercise } from "../types/grammar"
import type { PodcastEpisode, PodcastSummary } from "../types/podcast"
import type { VocabDeck, VocabDeckSummary } from "../types/vocabulary"

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
  topicTitle?: string,
): void {
  const subject = grammarSubject(ex)
  const resolvedTopicTitle = topicTitle ?? humanizeSlug(topic)
  void saveLastActivity(userId, {
    kind: "game",
    route: `/exercise/${topic}/${slug}`,
    title: ex.title,
    categoryLabel: `${subjectLabel(subject)}: ${ex.subtopic || resolvedTopicTitle}`,
    subject,
  })
}

export function recordGameVocabulary(
  userId: string,
  deck: Pick<VocabDeck | VocabDeckSummary, "title">,
  deckSlug: string,
): void {
  void saveLastActivity(userId, {
    kind: "game",
    route: `/vocabulary/${deckSlug}`,
    title: deck.title,
    categoryLabel: `Vocabulary: ${deck.title}`,
    subject: "vocabulary",
  })
}

export function recordGamePodcast(
  userId: string,
  episode: Pick<PodcastEpisode | PodcastSummary, "title" | "topic">,
  podcastSlug: string,
): void {
  void saveLastActivity(userId, {
    kind: "game",
    route: `/podcast/${podcastSlug}`,
    title: episode.title,
    categoryLabel: `Listening: ${episode.topic}`,
    subject: "listening",
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

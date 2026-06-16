import { continueItemFromLastActivity, resolveContinueLearning } from "./continue-learning"
import {
  buildVocabularyReviewPreview,
  getLearningProgress,
} from "./learned-vocabulary"
import { getLastActivity } from "./last-activity"
import { getHomeScreenSnapshot, patchHomeScreenSnapshot } from "./home-screen-cache"

export async function syncHomeVocabPreview(userId: string): Promise<void> {
  if (!getHomeScreenSnapshot(userId)) return
  const progress = await getLearningProgress(userId)
  patchHomeScreenSnapshot(userId, {
    vocabPreview: buildVocabularyReviewPreview(progress),
  })
}

export async function syncHomeContinueFromLastActivity(userId: string): Promise<void> {
  if (!getHomeScreenSnapshot(userId)) return
  const last = await getLastActivity(userId)
  patchHomeScreenSnapshot(userId, {
    continueItem: last ? continueItemFromLastActivity(last) : null,
  })
}

export async function refreshHomeContinueLearning(userId: string): Promise<void> {
  if (!getHomeScreenSnapshot(userId)) return
  const item = await resolveContinueLearning(userId)
  patchHomeScreenSnapshot(userId, { continueItem: item })
}

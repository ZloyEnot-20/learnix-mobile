import { useCallback, useEffect, useState } from "react"
import type { HomeworkAttempt } from "../types/domain"
import type { ReviewItem } from "../components/exercise/shared"
import {
  buildHomeworkProgress,
  restoreAssignmentIndex,
  restoreMistakes,
  saveHomeworkProgress,
} from "../lib/homework-progress"
import { useHomeworkProgressContext } from "../context/HomeworkProgressContext"

export function useHomeworkAssignmentState(
  homeworkId: string | undefined,
  controlWorkId: string | undefined,
  savedAttempt: HomeworkAttempt | undefined,
  total: number,
) {
  const assignmentMode = !!(homeworkId || controlWorkId)
  const restoreProgress = !!homeworkId && (savedAttempt?.answeredCount ?? 0) > 0

  const [index, setIndex] = useState(() =>
    restoreProgress ? restoreAssignmentIndex(savedAttempt) : 0,
  )
  const [correctCount, setCorrectCount] = useState(() =>
    restoreProgress ? (savedAttempt?.correctCount ?? 0) : 0,
  )
  const [mistakes, setMistakes] = useState<ReviewItem[]>(() =>
    restoreProgress ? restoreMistakes(savedAttempt) : [],
  )

  const { registerProgressGetter } = useHomeworkProgressContext()

  useEffect(() => {
    if (!homeworkId) {
      registerProgressGetter(null)
      return
    }
    registerProgressGetter(() => {
      if (index === 0 && correctCount === 0 && mistakes.length === 0) return null
      return buildHomeworkProgress(total, index, correctCount, mistakes)
    })
    return () => registerProgressGetter(null)
  }, [homeworkId, total, index, correctCount, mistakes, registerProgressGetter])

  const advanceOrFinish = useCallback(
    (
      currentIndex: number,
      finish: () => void,
      nextCorrect: number,
      nextMistakes: ReviewItem[],
    ): boolean => {
      if (!assignmentMode) return false
      if (currentIndex + 1 >= total) {
        finish()
        return true
      }
      const nextIndex = currentIndex + 1
      setIndex(nextIndex)
      if (homeworkId) {
        void saveHomeworkProgress(homeworkId, total, nextIndex, nextCorrect, nextMistakes)
      }
      return true
    },
    [assignmentMode, total, homeworkId],
  )

  return {
    index,
    setIndex,
    correctCount,
    setCorrectCount,
    mistakes,
    setMistakes,
    assignmentMode,
    advanceOrFinish,
  }
}

import React, { useCallback, useEffect, useState } from "react"
import { StyleSheet } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../../src/context/AuthContext"
import { exercisesApi, homeworkApi, peekStale } from "../../../src/lib/api"
import { cacheKey } from "../../../src/lib/api-cache"
import { IeltsReadingRunner } from "../../../src/components/ielts/IeltsReadingRunner"
import { IeltsReadingScreenSkeleton } from "../../../src/components/skeletons/Layouts"
import { HomeworkCheatingFailed } from "../../../src/components/homework/HomeworkCheatingFailed"
import { HomeworkStatusScreen } from "../../../src/components/homework/HomeworkStatusScreen"
import { ScreenErrorBoundary } from "../../../src/components/ui/ScreenErrorBoundary"
import { isCompletedSubmission, resolveHomeworkSubmission } from "../../../src/lib/homework-review"
import { resolveHomeworkSessionStart } from "../../../src/lib/homework-session-start"
import {
  isHomeworkEntryFailed,
  useHomeworkEntryOnFocus,
} from "../../../src/hooks/useHomeworkEntryOnFocus"
import { useRetryWhenOffline } from "../../../src/hooks/useRetryWhenOffline"
import type { HomeworkSubmission } from "../../../src/types/domain"
import type { IeltsReadingTest } from "../../../src/types/ielts"
import { colors } from "../../../src/theme/colors"

export default function HomeworkReadingScreen() {
  const { slug: readingSlug, hw } = useLocalSearchParams<{ slug: string; hw: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const homeworkId = hw
  const isStudent = user?.type === "student"

  const readingKey = readingSlug ? cacheKey("GET", `/exercises/reading/${readingSlug}`) : ""
  const submissionKey = homeworkId ? cacheKey("POST", `/homework/start:${homeworkId}`) : ""

  const [test, setTest] = useState<IeltsReadingTest | null>(() => {
    const cached = readingSlug ? peekStale<{ data: IeltsReadingTest }>(readingKey) : null
    return cached?.data ?? null
  })

  const [loading, setLoading] = useState(() => {
    const cachedSub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null
    const hasReview =
      cachedSub != null && isCompletedSubmission(cachedSub.status, cachedSub.attempt)
    return test === null && !hasReview
  })

  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [alreadyFailed, setAlreadyFailed] = useState(false)
  const [awaitingNetwork, setAwaitingNetwork] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [reviewDone, setReviewDone] = useState(() => {
    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null
    return sub != null && isCompletedSubmission(sub.status, sub.attempt)
  })

  const retryLoad = useCallback(() => {
    setLoadError(false)
    setReloadKey((key) => key + 1)
  }, [])

  const handleEntryResult = useCallback((sub: HomeworkSubmission | null) => {
    if (isHomeworkEntryFailed(sub)) setAlreadyFailed(true)
  }, [])

  useHomeworkEntryOnFocus(homeworkId, isStudent, handleEntryResult)
  useRetryWhenOffline(awaitingNetwork, () => setReloadKey((key) => key + 1))

  useEffect(() => {
    if (!readingSlug || !homeworkId) return
    let cancelled = false
    const hasCachedView = test !== null || reviewDone

    async function load() {
      if (!hasCachedView) setLoading(true)
      setLoadError(false)
      try {
        const [doc, sessionStart] = await Promise.all([
          exercisesApi.reading(readingSlug),
          isStudent ? resolveHomeworkSessionStart(homeworkId) : Promise.resolve(null),
        ])
        if (cancelled) return

        setTest(doc?.data ?? null)
        const sub = isStudent ? sessionStart?.sub ?? null : null

        if (sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating) {
          setAlreadyFailed(true)
          setAwaitingNetwork(false)
          return
        }

        if (isCompletedSubmission(sub?.status, sub?.attempt)) {
          setReviewDone(true)
          setAwaitingNetwork(false)
          return
        }

        if (isStudent && !sub) {
          setAwaitingNetwork(true)
        } else if (doc?.data && isStudent) {
          setAwaitingNetwork(false)
        }
      } catch {
        if (!cancelled) {
          setTest(null)
          setLoadError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [readingSlug, homeworkId, isStudent, reloadKey])

  useEffect(() => {
    if (reviewDone || !isStudent || !homeworkId || sessionStartedAt != null) return
    let cancelled = false

    async function beginSession() {
      const subRaw = await homeworkApi
        .start(homeworkId, { force: true, skipEntryCount: true })
        .catch(() => null)
      const sub = resolveHomeworkSubmission(homeworkId, subRaw)
      if (cancelled) return

      if (sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating) {
        setAlreadyFailed(true)
        return
      }

      if (isCompletedSubmission(sub?.status, sub?.attempt)) {
        setReviewDone(true)
        return
      }

      if (!sub) {
        setAwaitingNetwork(true)
        return
      }

      setAwaitingNetwork(false)
      setSessionStartedAt(
        sub.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),
      )
    }

    void beginSession()
    return () => {
      cancelled = true
    }
  }, [isStudent, homeworkId, sessionStartedAt, reviewDone])

  const sessionReady =
    !loading && test != null && !reviewDone && sessionStartedAt != null

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenErrorBoundary
          title="Couldn't open reading task"
          description="Something went wrong while loading this homework. Please try again."
          onRetry={retryLoad}
        >
          {loading || (awaitingNetwork && !reviewDone) ? (
            <IeltsReadingScreenSkeleton />
          ) : alreadyFailed ? (
            <HomeworkCheatingFailed />
          ) : loadError || !test ? (
            <HomeworkStatusScreen
              style={styles.fill}
              code="?"
              icon="book-outline"
              iconColor={colors.error}
              iconBg="rgba(239, 68, 68, 0.1)"
              title={loadError ? "Couldn't load reading task" : "Reading task not found"}
              description={
                loadError
                  ? "Check your connection and try again."
                  : "This reading task may have been removed or the link is invalid."
              }
              buttonLabel={loadError ? "Try again" : "Go back"}
              onButtonPress={loadError ? retryLoad : () => router.back()}
              secondaryButtonLabel={loadError ? "Go back" : undefined}
              onSecondaryButtonPress={loadError ? () => router.back() : undefined}
            />
          ) : reviewDone ? (
            <HomeworkStatusScreen
              style={styles.fill}
              code="✓"
              icon="checkmark-circle-outline"
              iconColor={colors.success}
              iconBg="rgba(16, 185, 129, 0.12)"
              title="Reading homework completed"
              description="Your answers have been submitted."
              buttonLabel="Go back"
              onButtonPress={() => router.back()}
            />
          ) : sessionReady && sessionStartedAt != null ? (
            <IeltsReadingRunner
              test={test}
              homeworkId={homeworkId}
              studentId={isStudent ? user?.id : undefined}
              sessionStartedAt={sessionStartedAt}
              onExit={() => router.back()}
            />
          ) : (
            <IeltsReadingScreenSkeleton />
          )}
        </ScreenErrorBoundary>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  fill: { flex: 1 },
})

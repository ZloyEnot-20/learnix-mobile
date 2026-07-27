import React, { useCallback, useEffect, useState } from "react"
import { StyleSheet } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../../src/context/AuthContext"
import { homeworkApi, peekStale } from "../../../src/lib/api"
import { cacheKey } from "../../../src/lib/api-cache"
import { getIeltsListeningTest } from "../../../src/lib/ielts-listening"
import { IeltsListeningRunner } from "../../../src/components/ielts/IeltsListeningRunner"
import { IeltsListeningScreenSkeleton } from "../../../src/components/skeletons/ListeningSkeletons"
import { HomeworkCheatingFailed } from "../../../src/components/homework/HomeworkCheatingFailed"
import { HomeworkListeningReview } from "../../../src/components/homework/HomeworkListeningReview"
import { HomeworkStatusScreen } from "../../../src/components/homework/HomeworkStatusScreen"
import { ScreenErrorBoundary } from "../../../src/components/ui/ScreenErrorBoundary"
import { isCompletedSubmission, resolveHomeworkSubmission } from "../../../src/lib/homework-review"
import { runHomeworkDetailLoad } from "../../../src/lib/homework-detail-perf"
import { resolveHomeworkSessionStart } from "../../../src/lib/homework-session-start"
import {
  isHomeworkEntryFailed,
  useHomeworkEntryOnFocus,
} from "../../../src/hooks/useHomeworkEntryOnFocus"
import { useRetryWhenOffline } from "../../../src/hooks/useRetryWhenOffline"
import type { HomeworkSubmission, Subject } from "../../../src/types/domain"
import type { IeltsListeningTest } from "../../../src/types/ielts"
import { colors } from "../../../src/theme/colors"

export default function HomeworkListeningScreen() {
  const { slug: listeningSlug, hw } = useLocalSearchParams<{ slug: string; hw: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const homeworkId = hw
  const isStudent = user?.type === "student"

  const listeningKey = listeningSlug ? cacheKey("GET", `/exercises/listening/${listeningSlug}`) : ""
  const submissionKey = homeworkId ? cacheKey("POST", `/homework/start:${homeworkId}`) : ""

  const [test, setTest] = useState<IeltsListeningTest | null>(() => {
    const cached = listeningSlug ? peekStale<{ data: IeltsListeningTest }>(listeningKey) : null
    return cached?.data ?? null
  })

  const [loading, setLoading] = useState(() => {
    const cachedSub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null
    const hasReview =
      cachedSub != null && isCompletedSubmission(cachedSub.status, cachedSub.attempt)
    return test === null && !hasReview
  })

  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [alreadyFailed, setAlreadyFailed] = useState(false)
  const [awaitingNetwork, setAwaitingNetwork] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [reviewSubmission, setReviewSubmission] = useState<HomeworkSubmission | null>(() => {
    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null
    return sub && isCompletedSubmission(sub.status, sub.attempt) ? sub : null
  })
  const [homeworkSubject, setHomeworkSubject] = useState<Subject>("listening")
  const [completedAt, setCompletedAt] = useState<string | undefined>(() => {
    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null
    return sub?.submittedAt ?? undefined
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
    if (!listeningSlug || !homeworkId) return
    let cancelled = false
    const hasCachedView = test !== null || reviewSubmission !== null

    async function load() {
      if (!hasCachedView) setLoading(true)
      setLoadError(false)
      try {
        await runHomeworkDetailLoad(
          submissionKey || undefined,
          reviewSubmission,
          homeworkSubject,
          async () => {
            const [loadedTest, sessionStart, hwData] = await Promise.all([
              getIeltsListeningTest(listeningSlug),
              isStudent ? resolveHomeworkSessionStart(homeworkId) : Promise.resolve(null),
              homeworkApi.get(homeworkId).catch(() => null),
            ])
            if (cancelled) return

            setTest(loadedTest)
            setTimeLimitMinutes(hwData?.timeLimitMinutes)
            if (hwData?.subject) setHomeworkSubject(hwData.subject)

            const sub = isStudent ? sessionStart?.sub ?? null : null
            if (sub?.elapsedSeconds != null) setElapsedSeconds(sub.elapsedSeconds)

            if (sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating) {
              setAlreadyFailed(true)
              setAwaitingNetwork(false)
              return
            }

            if (isCompletedSubmission(sub?.status, sub?.attempt)) {
              setReviewSubmission(sub)
              setCompletedAt(sub?.submittedAt ?? undefined)
              setAwaitingNetwork(false)
              if (user?.id) {
                void import("../../../src/lib/home-screen-sync").then(({ refreshHomeContinueLearning }) =>
                  refreshHomeContinueLearning(user.id),
                )
              }
              return
            }

            if (isStudent && !sub) {
              setAwaitingNetwork(true)
            } else if (loadedTest && isStudent) {
              setAwaitingNetwork(false)
            }
          },
        )
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
  }, [listeningSlug, homeworkId, isStudent, reloadKey, user?.id])

  const beginHomeworkSession = useCallback(async () => {
    if (!isStudent || !homeworkId || sessionStartedAt != null || reviewSubmission) return

    const subRaw = await homeworkApi
      .start(homeworkId, { force: true, skipEntryCount: true })
      .catch(() => null)
    const sub = resolveHomeworkSubmission(homeworkId, subRaw)

    if (sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating) {
      setAlreadyFailed(true)
      return
    }

    if (isCompletedSubmission(sub?.status, sub?.attempt)) {
      setReviewSubmission(sub)
      setCompletedAt(sub?.submittedAt ?? undefined)
      return
    }

    if (!sub) {
      setAwaitingNetwork(true)
      return
    }

    setAwaitingNetwork(false)
    setElapsedSeconds(sub.elapsedSeconds ?? 0)
    setSessionStartedAt(
      sub.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),
    )
  }, [homeworkId, isStudent, reviewSubmission, sessionStartedAt])

  const canShowRunner = !loading && test != null && !reviewSubmission && !alreadyFailed && !loadError

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenErrorBoundary
          title="Couldn't open listening task"
          description="Something went wrong while loading this homework. Please try again."
          onRetry={retryLoad}
        >
          {loading || (awaitingNetwork && !reviewSubmission && test == null) ? (
            <IeltsListeningScreenSkeleton />
          ) : alreadyFailed ? (
            <HomeworkCheatingFailed />
          ) : loadError || !test ? (
            <HomeworkStatusScreen
              style={styles.fill}
              code="?"
              icon="headset-outline"
              iconColor={colors.error}
              iconBg="rgba(239, 68, 68, 0.1)"
              title={loadError ? "Couldn't load listening task" : "Listening task not found"}
              description={
                loadError
                  ? "Check your connection and try again."
                  : "This listening task may have been removed or the link is invalid."
              }
              buttonLabel={loadError ? "Try again" : "Go back"}
              onButtonPress={loadError ? retryLoad : () => router.back()}
              secondaryButtonLabel={loadError ? "Go back" : undefined}
              onSecondaryButtonPress={loadError ? () => router.back() : undefined}
            />
          ) : reviewSubmission?.attempt ? (
            <HomeworkListeningReview
              test={test}
              attempt={reviewSubmission.attempt}
              title={test.title}
              subject={homeworkSubject}
              completedAt={completedAt}
            />
          ) : canShowRunner && test != null ? (
            <IeltsListeningRunner
              test={test}
              testId={listeningSlug}
              homeworkId={homeworkId}
              studentId={isStudent ? user?.id : undefined}
              sessionStartedAt={sessionStartedAt ?? undefined}
              timeLimitMinutes={timeLimitMinutes}
              elapsedSeconds={elapsedSeconds}
              onAudioPrepared={isStudent ? beginHomeworkSession : undefined}
              onExit={() => router.back()}
              onGoHome={() => router.replace("/(tabs)")}
            />
          ) : (
            <IeltsListeningScreenSkeleton />
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

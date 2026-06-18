import React, { useCallback, useEffect, useState } from "react"
import { StyleSheet } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../../src/context/AuthContext"
import { exercisesApi, homeworkApi, peekStale } from "../../../src/lib/api"
import { cacheKey } from "../../../src/lib/api-cache"
import { PodcastRunner } from "../../../src/components/podcast/PodcastRunner"
import { HomeworkCheatingFailed } from "../../../src/components/homework/HomeworkCheatingFailed"
import { HomeworkSessionShell } from "../../../src/components/homework/HomeworkSessionShell"
import { HomeworkPodcastReview } from "../../../src/components/homework/HomeworkPodcastReview"
import { HomeworkStatusScreen } from "../../../src/components/homework/HomeworkStatusScreen"
import { PodcastScreenSkeleton } from "../../../src/components/skeletons/Layouts"
import { ScreenErrorBoundary } from "../../../src/components/ui/ScreenErrorBoundary"
import { isCompletedSubmission, resolveHomeworkSubmission } from "../../../src/lib/homework-review"
import {
  resolveHomeworkSessionStart,
  resumeHomeworkSession,
} from "../../../src/lib/homework-session-start"
import {
  isHomeworkEntryFailed,
  useHomeworkEntryOnFocus,
} from "../../../src/hooks/useHomeworkEntryOnFocus"
import { useRetryWhenOffline } from "../../../src/hooks/useRetryWhenOffline"
import type { HomeworkSubmission, Subject } from "../../../src/types/domain"
import type { PodcastEpisode } from "../../../src/types/podcast"
import { colors } from "../../../src/theme/colors"

export default function HomeworkPodcastScreen() {
  const { slug: podcastSlug, hw } = useLocalSearchParams<{ slug: string; hw: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const homeworkId = hw
  const isStudent = user?.type === "student"

  const episodeKey = podcastSlug ? cacheKey("GET", `/exercises/podcasts/${podcastSlug}`) : ""
  const submissionKey = homeworkId ? cacheKey("POST", `/homework/start:${homeworkId}`) : ""

  const [episode, setEpisode] = useState<PodcastEpisode | null>(() =>
    podcastSlug ? peekStale<PodcastEpisode>(episodeKey) : null,
  )

  const [loading, setLoading] = useState(() => {
    const cachedSub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null
    const hasReview =
      cachedSub != null && isCompletedSubmission(cachedSub.status, cachedSub.attempt)
    return episode === null && !hasReview
  })

  const [pauseUsed, setPauseUsed] = useState(false)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [reviewSubmission, setReviewSubmission] = useState<HomeworkSubmission | null>(() => {
    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null
    return sub && isCompletedSubmission(sub.status, sub.attempt) ? sub : null
  })
  const [homeworkSubject, setHomeworkSubject] = useState<Subject>("listening")
  const [completedAt, setCompletedAt] = useState<string | undefined>(() => {
    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null
    return sub?.submittedAt ?? undefined
  })
  const [alreadyFailed, setAlreadyFailed] = useState(false)
  const [pendingSuspicious, setPendingSuspicious] = useState(false)
  const [awaitingNetwork, setAwaitingNetwork] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)

  const retryLoad = useCallback(() => {
    setLoadError(false)
    setReloadKey((key) => key + 1)
  }, [])

  const handleEntryResult = useCallback((sub: HomeworkSubmission | null) => {
    if (isHomeworkEntryFailed(sub)) setAlreadyFailed(true)
  }, [])

  useHomeworkEntryOnFocus(homeworkId, isStudent, handleEntryResult)

  const handleSuspiciousDismissed = useCallback(async () => {
    if (!homeworkId || !isStudent) return
    setPendingSuspicious(false)
    const sub = await resumeHomeworkSession(homeworkId)
    if (!sub) return
    setPauseUsed(sub.pauseUsed ?? false)
    setElapsedSeconds(sub.elapsedSeconds ?? 0)
    setSessionStartedAt(
      sub.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),
    )
  }, [homeworkId, isStudent])

  useRetryWhenOffline(awaitingNetwork, () => setReloadKey((key) => key + 1))

  useEffect(() => {
    if (!podcastSlug || !homeworkId) return
    let cancelled = false
    const hasCachedView = episode !== null || reviewSubmission !== null

    async function load() {
      if (!hasCachedView) setLoading(true)
      setLoadError(false)
      try {
        const [ep, sessionStart, hwData] = await Promise.all([
          exercisesApi.podcast(podcastSlug),
          isStudent ? resolveHomeworkSessionStart(homeworkId) : Promise.resolve(null),
          isStudent ? homeworkApi.get(homeworkId).catch(() => null) : Promise.resolve(null),
        ])
        if (cancelled) return

        const sub = isStudent ? sessionStart?.sub ?? null : null
        const needsSuspiciousAck = sessionStart?.needsSuspiciousAck ?? false

        setEpisode(ep ?? null)
        if (hwData?.subject) setHomeworkSubject(hwData.subject)

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
        } else if (isStudent && !sub) {
          setAwaitingNetwork(true)
        } else if (ep && isStudent) {
          setAwaitingNetwork(false)
          setPendingSuspicious(needsSuspiciousAck)
          if (needsSuspiciousAck && sub) {
            setPauseUsed(sub.pauseUsed ?? false)
            setElapsedSeconds(sub.elapsedSeconds ?? 0)
            setSessionStartedAt(
              sub.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),
            )
          }
        }
      } catch {
        if (!cancelled) {
          setEpisode(null)
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
  }, [podcastSlug, homeworkId, isStudent, reloadKey])

  useEffect(() => {
    if (reviewSubmission || !isStudent || !homeworkId || sessionStartedAt != null) return
    let cancelled = false

    async function beginSession() {
      if (pendingSuspicious) return
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
        setReviewSubmission(sub)
        return
      }

      if (!sub) {
        setAwaitingNetwork(true)
        return
      }

      setAwaitingNetwork(false)
      setPauseUsed(sub.pauseUsed ?? false)
      setElapsedSeconds(sub.elapsedSeconds ?? 0)
      setSessionStartedAt(
        sub.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),
      )
    }

    void beginSession()
    return () => {
      cancelled = true
    }
  }, [isStudent, homeworkId, sessionStartedAt, reviewSubmission, pendingSuspicious])

  const sessionReady =
    !loading && episode != null && !reviewSubmission && sessionStartedAt != null

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenErrorBoundary
          title="Couldn't open podcast"
          description="Something went wrong while loading this homework. Please try again."
          onRetry={retryLoad}
        >
          {loading || (awaitingNetwork && !reviewSubmission) ? (
            <PodcastScreenSkeleton />
          ) : alreadyFailed ? (
            <HomeworkCheatingFailed />
          ) : loadError || !episode ? (
            <HomeworkStatusScreen
              style={styles.fill}
              code="?"
              icon="headset-outline"
              iconColor={colors.error}
              iconBg="rgba(239, 68, 68, 0.1)"
              title={loadError ? "Couldn't load podcast" : "Podcast not found"}
              description={
                loadError
                  ? "Check your connection and try again."
                  : "This podcast may have been removed or the link is invalid."
              }
              buttonLabel={loadError ? "Try again" : "Go back"}
              onButtonPress={loadError ? retryLoad : () => router.back()}
              secondaryButtonLabel={loadError ? "Go back" : undefined}
              onSecondaryButtonPress={loadError ? () => router.back() : undefined}
            />
          ) : reviewSubmission?.attempt ? (
            <HomeworkPodcastReview
              episode={episode}
              attempt={reviewSubmission.attempt}
              title={episode.title}
              subject={homeworkSubject}
              completedAt={completedAt}
            />
          ) : (
            <HomeworkSessionShell
              homeworkId={homeworkId}
              active={sessionReady && !alreadyFailed && !sessionEnded}
              pauseUsed={pauseUsed}
              initialSuspicious={pendingSuspicious}
              onSuspiciousDismissed={handleSuspiciousDismissed}
              title={episode.title}
            >
              {sessionReady && sessionStartedAt != null ? (
                <PodcastRunner
                  episode={episode}
                  homeworkId={homeworkId}
                  studentId={isStudent ? user?.id : undefined}
                  sessionStartedAt={sessionStartedAt}
                  elapsedSeconds={elapsedSeconds}
                  onSessionEnd={() => setSessionEnded(true)}
                />
              ) : (
                <PodcastScreenSkeleton />
              )}
            </HomeworkSessionShell>
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

import React, { useCallback, useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../../../../../src/context/AuthContext"
import { controlWorkApi, exercisesApi } from "../../../../../../src/lib/api"
import { ExerciseRunner } from "../../../../../../src/components/exercise/ExerciseRunner"
import { HomeworkCheatingFailed } from "../../../../../../src/components/homework/HomeworkCheatingFailed"
import { ControlWorkSessionShell } from "../../../../../../src/components/homework/ControlWorkSessionShell"
import { ExerciseScreenSkeleton } from "../../../../../../src/components/skeletons/Layouts"
import { needsSuspiciousAcknowledgement } from "../../../../../../src/lib/homework-session-start"
import type { ControlWork } from "../../../../../../src/types/domain"
import type { GrammarExercise } from "../../../../../../src/types/grammar"
import { colors } from "../../../../../../src/theme/colors"

export default function ControlWorkGrammarStep() {
  const { id, slug, step } = useLocalSearchParams<{
    id: string
    topic: string
    slug: string
    step: string
  }>()
  const { user } = useAuth()
  const router = useRouter()
  const studentId = user?.type === "student" ? user.id : undefined
  const stepIndex = step != null ? Number.parseInt(step, 10) : 0
  const [exercise, setExercise] = useState<GrammarExercise | null>(null)
  const [controlWork, setControlWork] = useState<ControlWork | null>(null)
  const [pauseUsed, setPauseUsed] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [pendingSuspicious, setPendingSuspicious] = useState(false)
  const [alreadyFailed, setAlreadyFailed] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const handleSuspiciousDismissed = useCallback(async () => {
    if (!id || !studentId) return
    setPendingSuspicious(false)
    const sub = await controlWorkApi.start(id, { force: true }).catch(() => null)
    if (!sub) return
    setElapsedSeconds(sub.elapsedSeconds ?? 0)
    setPauseUsed(sub.pauseUsed ?? false)
    setSessionStartedAt(
      sub.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),
    )
  }, [id, studentId])

  useEffect(() => {
    if (!slug || !id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const [ex, cw, sub] = await Promise.all([
          exercisesApi.get(slug),
          controlWorkApi.get(id, { force: true }),
          studentId ? controlWorkApi.start(id, { force: true }) : Promise.resolve(null),
        ])
        if (cancelled) return

        if (!ex) {
          setError(true)
          return
        }

        setExercise(ex)
        setControlWork(cw)

        if (!studentId) {
          setSessionStartedAt(Date.now())
          return
        }

        if (sub?.integrityStatus === "cheating_detected") {
          setAlreadyFailed(true)
          return
        }

        const stepResult = sub?.stepResults?.[stepIndex]
        if (stepResult?.status === "completed") {
          router.back()
          return
        }

        setPendingSuspicious(needsSuspiciousAcknowledgement(sub))
        setElapsedSeconds(sub?.elapsedSeconds ?? 0)
        setPauseUsed(sub?.pauseUsed ?? false)
        setSessionStartedAt(
          sub?.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),
        )
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [slug, id, studentId, stepIndex, router])

  const sessionReady =
    !loading && !error && exercise != null && sessionStartedAt != null && !alreadyFailed

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {loading ? (
          <ExerciseScreenSkeleton />
        ) : alreadyFailed ? (
          <HomeworkCheatingFailed />
        ) : error || !exercise ? (
          <View style={styles.center}>
            <Text style={styles.error}>Exercise not found</Text>
          </View>
        ) : sessionStartedAt == null ? (
          <ExerciseScreenSkeleton />
        ) : (
          <ControlWorkSessionShell
            controlWorkId={id!}
            active={sessionReady && !sessionEnded}
            pauseUsed={pauseUsed}
            initialSuspicious={pendingSuspicious}
            onSuspiciousDismissed={handleSuspiciousDismissed}
          >
            <ExerciseRunner
              exercise={exercise}
              controlWorkId={id}
              stepIndex={stepIndex}
              studentId={studentId}
              timeLimitMinutes={controlWork?.timeLimitMinutes}
              elapsedSeconds={elapsedSeconds}
              sessionStartedAt={sessionStartedAt}
              lockNavigation
              onSessionEnd={() => setSessionEnded(true)}
            />
          </ControlWorkSessionShell>
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontSize: 16, fontWeight: "600", color: colors.text },
})

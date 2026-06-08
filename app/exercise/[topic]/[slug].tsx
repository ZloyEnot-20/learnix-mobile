import React, { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { BackButton } from "../../../src/components/ui/BackButton"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../../src/context/AuthContext"
import { exercisesApi, homeworkApi } from "../../../src/lib/api"
import { ExerciseRunner } from "../../../src/components/exercise/ExerciseRunner"
import { ExerciseScreenSkeleton } from "../../../src/components/skeletons/Layouts"
import { recordGameExercise } from "../../../src/lib/record-activity"
import type { GrammarExercise } from "../../../src/types/grammar"
import { colors } from "../../../src/theme/colors"

export default function ExerciseScreen() {
  const { topic, slug, hw } = useLocalSearchParams<{
    topic: string
    slug: string
    hw?: string
  }>()
  const router = useRouter()
  const { user } = useAuth()
  const [exercise, setExercise] = useState<GrammarExercise | null>(null)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>()
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const homeworkId = hw ?? undefined
  const studentId = user?.role === "student" ? user.id : undefined

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function load() {
      try {
        const ex = await exercisesApi.get(slug)
        if (cancelled) return
        if (!ex) {
          setError(true)
          return
        }
        setExercise(ex)

        if (homeworkId) {
          const [hwData, sub] = await Promise.all([
            homeworkApi.get(homeworkId).catch(() => null),
            studentId
              ? homeworkApi.start(homeworkId).catch(() => null)
              : Promise.resolve(null),
          ])
          if (cancelled) return
          setTimeLimitMinutes(hwData?.timeLimitMinutes)
          setSessionStartedAt(
            sub?.startedAt ? new Date(sub.startedAt).getTime() : Date.now(),
          )
        } else {
          setSessionStartedAt(Date.now())
          if (studentId && topic) {
            recordGameExercise(studentId, ex, topic, slug)
          }
        }
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
  }, [slug, homeworkId, studentId])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {!homeworkId && (
          <View style={styles.backWrap}>
            <BackButton onPress={() => router.back()} />
          </View>
        )}

        {loading || sessionStartedAt === null ? (
          <ExerciseScreenSkeleton />
        ) : error || !exercise ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Exercise not found</Text>
            <BackButton onPress={() => router.back()} />
          </View>
        ) : (
          <ExerciseRunner
            exercise={exercise}
            homeworkId={homeworkId}
            studentId={studentId}
            timeLimitMinutes={timeLimitMinutes}
            sessionStartedAt={sessionStartedAt}
          />
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontWeight: "600", color: colors.text },
})

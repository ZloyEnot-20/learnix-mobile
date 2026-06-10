import React, { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../../../../../src/context/AuthContext"
import { exercisesApi } from "../../../../../../src/lib/api"
import { ExerciseRunner } from "../../../../../../src/components/exercise/ExerciseRunner"
import { BackButton } from "../../../../../../src/components/ui/BackButton"
import { ExerciseScreenSkeleton } from "../../../../../../src/components/skeletons/Layouts"
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
  const studentId = user?.type === "student" ? user.id : undefined
  const stepIndex = step != null ? Number.parseInt(step, 10) : 0
  const [exercise, setExercise] = useState<GrammarExercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionStartedAt] = useState(() => Date.now())

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    exercisesApi
      .get(slug)
      .then((ex) => {
        if (!cancelled) setExercise(ex)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <BackButton style={styles.back} />
        {loading ? (
          <ExerciseScreenSkeleton />
        ) : !exercise ? (
          <View style={styles.center}>
            <Text style={styles.error}>Exercise not found</Text>
          </View>
        ) : (
          <ExerciseRunner
            exercise={exercise}
            controlWorkId={id}
            stepIndex={stepIndex}
            studentId={studentId}
            sessionStartedAt={sessionStartedAt}
            lockNavigation
          />
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  back: { margin: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontSize: 16, fontWeight: "600", color: colors.text },
})

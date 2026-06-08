import React, { useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { BackButton } from "../../src/components/ui/BackButton"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi } from "../../src/lib/api"
import { recordGameTopic } from "../../src/lib/record-activity"
import { ExerciseListSkeleton } from "../../src/components/skeletons/Layouts"
import type { GrammarExercise } from "../../src/types/grammar"
import { colors } from "../../src/theme/colors"

export default function TopicExercisesScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!topic) return
    Promise.all([exercisesApi.list(topic), exercisesApi.topics()])
      .then(([list, metas]) => {
        setExercises(list)
        if (user?.role === "student" && user.id) {
          const meta = metas.find((m) => m.topic === topic)
          recordGameTopic(user.id, topic, meta?.title ?? topic, meta?.category ?? "grammar")
        }
      })
      .catch(() => setExercises([]))
      .finally(() => setLoading(false))
  }, [topic, user?.id, user?.role])

  return (
    <>
      <Stack.Screen options={{ title: topic ?? "Exercises" }} />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.backWrap}>
          <BackButton onPress={() => router.back()} />
        </View>

        {loading ? (
          <ExerciseListSkeleton />
        ) : exercises.length === 0 ? (
          <Text style={styles.empty}>No exercises in this topic yet.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {exercises.map((ex) => (
              <Pressable
                key={ex.slug}
                style={styles.card}
                onPress={() =>
                  router.push(`/exercise/${ex.topic}/${ex.slug}` as never)
                }
              >
                <Text style={styles.cardTitle}>{ex.title}</Text>
                <Text style={styles.cardMeta}>
                  {ex.type.replace(/-/g, " ")} · {ex.totalQuestions} questions ·{" "}
                  {ex.estimatedTime} min
                </Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {ex.description}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: "capitalize",
  },
  cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
})

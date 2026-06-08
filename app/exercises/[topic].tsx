import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { exercisesApi } from "../../src/lib/api"
import type { GrammarExercise } from "../../src/types/grammar"
import { colors } from "../../src/theme/colors"

export default function TopicExercisesScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>()
  const router = useRouter()
  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!topic) return
    exercisesApi
      .list(topic)
      .then(setExercises)
      .catch(() => setExercises([]))
      .finally(() => setLoading(false))
  }, [topic])

  return (
    <>
      <Stack.Screen options={{ title: topic ?? "Exercises" }} />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
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
  back: { padding: 16 },
  backText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
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

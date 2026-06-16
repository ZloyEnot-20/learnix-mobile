import React, { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { BackButton } from "../../src/components/ui/BackButton"
import { VocabularyReviewQuiz } from "../../src/components/VocabularyReviewQuiz"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi } from "../../src/lib/api"
import {
  buildDistractorPool,
  getLearningProgress,
  getReviewAvailability,
  type StudyWord,
} from "../../src/lib/learned-vocabulary"
import { colors, spacing } from "../../src/theme/tokens"

export default function VocabularyReviewScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [words, setWords] = useState<StudyWord[] | null>(null)
  const [distractorPool, setDistractorPool] = useState<StudyWord[]>([])
  const [reviewedTodayCount, setReviewedTodayCount] = useState(0)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getReviewAvailability(user.id),
      getLearningProgress(user.id),
      exercisesApi.vocab().catch(() => []),
    ])
      .then(([availability, progress, decks]) => {
        setWords(availability.dueWords)
        setReviewedTodayCount(availability.reviewedTodayCount)
        setDistractorPool(buildDistractorPool(progress, decks))
      })
      .catch(() => {
        setWords([])
        setReviewedTodayCount(0)
        setDistractorPool([])
      })
  }, [user])

  if (!user) return null

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <BackButton onPress={() => router.back()} />
          </View>
          <Text style={styles.title}>Vocabulary review</Text>
          <View style={styles.topBarSide} />
        </View>

        {words == null ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : words.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>
              {reviewedTodayCount > 0 ? "Review done for today" : "No words to review"}
            </Text>
            <Text style={styles.emptyText}>
              {reviewedTodayCount > 0
                ? `You reviewed ${reviewedTodayCount} word${reviewedTodayCount === 1 ? "" : "s"} today. New words will appear tomorrow.`
                : "Complete a vocabulary quiz in Learn or homework, or mark words in flashcards to add them here."}
            </Text>
          </View>
        ) : (
          <VocabularyReviewQuiz
            words={words}
            distractorPool={distractorPool}
            userId={user.id}
            onDone={() => router.back()}
          />
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  topBarSide: {
    width: 44,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
})

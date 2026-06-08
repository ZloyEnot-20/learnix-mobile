import React, { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { BackButton } from "../../src/components/ui/BackButton"
import { VocabularyReviewQuiz } from "../../src/components/VocabularyReviewQuiz"
import { useAuth } from "../../src/context/AuthContext"
import { pickRandomLearnedWords, type LearnedWord } from "../../src/lib/learned-vocabulary"
import { colors, spacing } from "../../src/theme/tokens"

const REVIEW_SIZE = 5

export default function VocabularyReviewScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [words, setWords] = useState<LearnedWord[] | null>(null)

  useEffect(() => {
    if (!user) return
    pickRandomLearnedWords(user.id, REVIEW_SIZE)
      .then(setWords)
      .catch(() => setWords([]))
  }, [user])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topBar}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Vocabulary review</Text>
        </View>

        {words == null ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : words.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No words yet</Text>
            <Text style={styles.emptyText}>
              Complete a vocabulary deck quiz in Games to unlock review.
            </Text>
          </View>
        ) : (
          <VocabularyReviewQuiz words={words} onDone={() => router.back()} />
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
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
})

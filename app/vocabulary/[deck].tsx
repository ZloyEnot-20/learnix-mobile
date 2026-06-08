import React, { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { BackButton } from "../../src/components/ui/BackButton"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi } from "../../src/lib/api"
import { recordGameVocabulary } from "../../src/lib/record-activity"
import { VocabularyScreen } from "../../src/components/VocabularyScreen"
import { VocabScreenSkeleton } from "../../src/components/skeletons/Layouts"
import type { VocabDeck } from "../../src/types/vocabulary"
import { colors } from "../../src/theme/colors"

export default function VocabularyDeckScreen() {
  const { deck: deckSlug, hw } = useLocalSearchParams<{ deck: string; hw?: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [deck, setDeck] = useState<VocabDeck | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!deckSlug) return
    let cancelled = false
    exercisesApi
      .vocabDeck(deckSlug)
      .then((d) => {
        if (!cancelled) {
          setDeck(d ?? null)
          if (d && !hw && user?.role === "student" && user.id) {
            recordGameVocabulary(user.id, d, deckSlug)
          }
        }
      })
      .catch(() => {
        if (!cancelled) setDeck(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [deckSlug, hw, user?.id, user?.role])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? (
          <VocabScreenSkeleton />
        ) : !deck ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Deck not found</Text>
            <BackButton onPress={() => router.back()} />
          </View>
        ) : (
          <VocabularyScreen
            deck={deck}
            homeworkId={hw ?? undefined}
            isStudent={user?.role === "student"}
            studentId={user?.role === "student" ? user.id : undefined}
          />
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontWeight: "600", color: colors.text },
})

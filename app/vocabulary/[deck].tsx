import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi } from "../../src/lib/api"
import { VocabularyScreen } from "../../src/components/VocabularyScreen"
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
        if (!cancelled) setDeck(d ?? null)
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
  }, [deckSlug])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !deck ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Deck not found</Text>
            <Pressable onPress={() => router.back()} style={styles.errorBtn}>
              <Text style={styles.errorBtnText}>Go back</Text>
            </Pressable>
          </View>
        ) : (
          <VocabularyScreen
            deck={deck}
            homeworkId={hw ?? undefined}
            isStudent={user?.role === "student"}
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
  errorBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorBtnText: { color: "#fff", fontWeight: "600" },
})

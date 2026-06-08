import React, { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../../../../src/context/AuthContext"
import { exercisesApi } from "../../../../../src/lib/api"
import { VocabularyScreen } from "../../../../../src/components/VocabularyScreen"
import type { VocabDeck } from "../../../../../src/types/vocabulary"
import { colors } from "../../../../../src/theme/colors"

export default function ControlWorkVocabStep() {
  const { id, deck, step } = useLocalSearchParams<{
    id: string
    deck: string
    step: string
  }>()
  const { user } = useAuth()
  const stepIndex = step != null ? Number.parseInt(step, 10) : 0
  const [vocabDeck, setVocabDeck] = useState<VocabDeck | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!deck) return
    let cancelled = false
    exercisesApi
      .vocabDeck(deck)
      .then((d) => {
        if (!cancelled) setVocabDeck(d)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [deck])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : !vocabDeck ? (
          <View style={styles.center}>
            <Text style={styles.error}>Deck not found</Text>
          </View>
        ) : (
          <VocabularyScreen
            deck={vocabDeck}
            homeworkMode
            isStudent={user?.role === "student"}
            controlWorkId={id}
            stepIndex={stepIndex}
            studentId={user?.role === "student" ? user.id : undefined}
          />
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted },
  error: { fontSize: 16, fontWeight: "600", color: colors.text },
})

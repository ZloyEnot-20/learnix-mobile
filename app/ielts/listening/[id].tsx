import React, { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { BackButton } from "../../../src/components/ui/BackButton"
import { IeltsListeningRunner } from "../../../src/components/ielts/IeltsListeningRunner"
import { IeltsListeningScreenSkeleton } from "../../../src/components/skeletons/ListeningSkeletons"
import { getIeltsListeningTest } from "../../../src/lib/ielts-listening"
import type { IeltsListeningTest } from "../../../src/types/ielts"
import { colors, spacing } from "../../../src/theme/tokens"

export default function IeltsListeningTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [test, setTest] = useState<IeltsListeningTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void getIeltsListeningTest(id)
      .then((data) => {
        if (cancelled) return
        if (!data) setError(true)
        else setTest(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? (
          <IeltsListeningScreenSkeleton />
        ) : error || !test ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Listening test not found</Text>
            <BackButton onPress={() => router.back()} />
          </View>
        ) : (
          <IeltsListeningRunner
            test={test}
            testId={id}
            onExit={() => router.back()}
            onBack={() => router.back()}
          />
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
  },
  errorText: { fontSize: 16, color: colors.textSecondary },
})

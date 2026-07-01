import React, { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { BackButton } from "../../../src/components/ui/BackButton"
import { IeltsReadingRunner } from "../../../src/components/ielts/IeltsReadingRunner"
import { IeltsReadingScreenSkeleton } from "../../../src/components/skeletons/Layouts"
import { getIeltsReadingTest } from "../../../src/lib/ielts-reading"
import type { IeltsReadingTest } from "../../../src/types/ielts"
import { colors, spacing } from "../../../src/theme/tokens"

export default function IeltsReadingTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [test, setTest] = useState<IeltsReadingTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void getIeltsReadingTest(id)
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
          <IeltsReadingScreenSkeleton />
        ) : error || !test ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Reading task not found</Text>
            <BackButton onPress={() => router.back()} />
          </View>
        ) : (
          <IeltsReadingRunner
            test={test}
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

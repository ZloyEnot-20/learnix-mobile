import React, { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { BackButton } from "../../src/components/ui/BackButton"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi } from "../../src/lib/api"
import { recordGamePodcast } from "../../src/lib/record-activity"
import { PodcastRunner } from "../../src/components/podcast/PodcastRunner"
import { PodcastScreenSkeleton } from "../../src/components/skeletons/Layouts"
import type { PodcastEpisode } from "../../src/types/podcast"
import { colors } from "../../src/theme/colors"

export default function PodcastPracticeScreen() {
  const { slug: podcastSlug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!podcastSlug) return
    let cancelled = false

    exercisesApi
      .podcast(podcastSlug)
      .then((ep) => {
        if (cancelled) return
        setEpisode(ep ?? null)
        if (ep && user?.type === "student" && user.id) {
          recordGamePodcast(user.id, ep, podcastSlug)
        }
        setSessionStartedAt(Date.now())
      })
      .catch(() => {
        if (!cancelled) setEpisode(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [podcastSlug, user?.id, user?.type])

  const studentId = user?.type === "student" ? user.id : undefined

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.backWrap}>
          <BackButton onPress={() => router.back()} />
        </View>

        {loading || sessionStartedAt === null ? (
          <PodcastScreenSkeleton />
        ) : !episode ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Podcast not found</Text>
            <BackButton onPress={() => router.back()} />
          </View>
        ) : (
          <PodcastRunner
            episode={episode}
            sessionStartedAt={sessionStartedAt}
            studentId={studentId}
          />
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontWeight: "600", color: colors.text },
})

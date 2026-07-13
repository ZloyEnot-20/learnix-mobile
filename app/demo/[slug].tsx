import React, { useEffect } from "react"
import { ActivityIndicator, StyleSheet } from "react-native"
import { useLocalSearchParams, router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { liveLessonsApi } from "../../src/lib/live-lesson-api"
import { DEMO_BOOK_ID } from "../../src/demo/book-id"
import { colors } from "../../src/theme/tokens"

/**
 * Legacy page slug (page-08, …) → open parent unit from DB pages index.
 */
export default function DemoSlugRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const meta = await liveLessonsApi.getBook(DEMO_BOOK_ID)
        const page = (meta.pages ?? []).find((p) => {
          // Accept page-08 style or numeric
          const want = String(slug ?? "")
          if (want === `page-${String(p.page).padStart(2, "0")}`) return true
          if (want === `page-${p.page}`) return true
          return false
        })
        if (!cancelled) {
          router.replace(`/demo/unit/${page?.unit ?? 1}` as never)
        }
      } catch {
        if (!cancelled) router.replace("/demo" as never)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <SafeAreaView style={styles.safe}>
      <ActivityIndicator color={colors.primary} size="large" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
})

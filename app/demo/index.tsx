import React, { useCallback, useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { liveLessonsApi } from "../../src/lib/live-lesson-api"
import { Skeleton, SkeletonCard } from "../../src/components/ui/Skeleton"
import { DEMO_BOOK_ID } from "../../src/demo/book-id"
import { PURPLE } from "../../src/demo/theme"

type UnitCard = {
  unitNumber: number
  title: string
  subtitle?: string
  ready: boolean
  stepCount: number
  pages: Array<{ page: number; label: string }>
}

function HubSkeleton() {
  return (
    <View style={styles.scroll}>
      <Skeleton height={40} borderRadius={8} style={{ marginBottom: 12 }} />
      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i} style={{ marginBottom: 10, gap: 10, backgroundColor: "#fff" }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Skeleton width={44} height={44} borderRadius={8} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={16} width="70%" />
              <Skeleton height={12} width="50%" />
              <Skeleton height={12} width="40%" />
            </View>
          </View>
        </SkeletonCard>
      ))}
    </View>
  )
}

/**
 * Debug demo hub — units from CurriculumBook (Cambridge textbook look).
 */
export default function DemoHubScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookTitle, setBookTitle] = useState("")
  const [units, setUnits] = useState<UnitCard[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const meta = await liveLessonsApi.getBook(DEMO_BOOK_ID)
      setBookTitle(meta.book?.title || DEMO_BOOK_ID)
      setUnits(
        (meta.units ?? []).map((u) => ({
          unitNumber: u.unit_number,
          title: u.title,
          subtitle: u.subtitle ?? undefined,
          ready: Boolean(u.ready),
          stepCount: u.exerciseIds?.length ?? 0,
          pages: (u.pages ?? []).map((p) => ({ page: p.page, label: p.label })),
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load book from server")
      setUnits([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBtn}>
          <Ionicons name="close" size={22} color={PURPLE.deep} />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.topEyebrow}>DEBUG DEMO</Text>
          <Text style={styles.topTitle} numberOfLines={1}>
            {bookTitle || "Book units"}
          </Text>
        </View>
        <Pressable onPress={() => void load()} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="refresh" size={18} color={PURPLE.note} />
        </Pressable>
      </View>

      {loading ? (
        <HubSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.lead}>
            Cambridge Vocabulary for IELTS Advanced — pages render from the database in textbook
            layout. Open a unit to browse pages in book order.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => void load()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {units.map((u) => {
            const first = u.pages[0]?.page
            const last = u.pages[u.pages.length - 1]?.page
            return (
              <Pressable
                key={u.unitNumber}
                disabled={!u.ready}
                style={({ pressed }) => [
                  styles.card,
                  !u.ready && styles.cardDisabled,
                  pressed && u.ready && { opacity: 0.85 },
                ]}
                onPress={() => router.push(`/demo/unit/${u.unitNumber}` as never)}
              >
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>{u.unitNumber}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{u.title}</Text>
                  {u.subtitle ? <Text style={styles.cardSub}>{u.subtitle}</Text> : null}
                  <Text style={styles.cardMeta}>
                    {u.ready
                      ? first != null
                        ? `pp. ${first}–${last} · ${u.pages.length} pages`
                        : `${u.stepCount} exercises`
                      : "Coming soon"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={u.ready ? PURPLE.mid : "#9CA3AF"}
                />
              </Pressable>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PURPLE.pageBg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  topBtn: { padding: 4 },
  topCenter: { flex: 1 },
  topEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: PURPLE.mid,
  },
  topTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PURPLE.soft,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  lead: {
    fontSize: 13.5,
    lineHeight: 20,
    color: "#4B5563",
    marginBottom: 14,
    fontFamily: "Georgia",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: PURPLE.line,
    marginBottom: 10,
  },
  cardDisabled: { opacity: 0.55 },
  unitBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: PURPLE.deep,
    alignItems: "center",
    justifyContent: "center",
  },
  unitBadgeText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", fontFamily: "Georgia" },
  cardSub: { fontSize: 13, color: "#6B7280", marginTop: 2, fontFamily: "Georgia" },
  cardMeta: { fontSize: 12, color: PURPLE.mid, marginTop: 4, fontWeight: "600" },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  errorText: { color: "#991B1B", fontSize: 13, lineHeight: 18 },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: PURPLE.mid,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
})

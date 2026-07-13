import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, router } from "expo-router"
import { liveLessonsApi } from "../../../src/lib/live-lesson-api"
import { flattenUnitToSteps } from "../../../src/lib/books/lesson-flow"
import type { LessonStep } from "../../../src/lib/books/types"
import { LiveExerciseView } from "../../../src/components/live-lesson/LiveExerciseView"
import { Skeleton, SkeletonCard } from "../../../src/components/ui/Skeleton"
import { colors, radius, spacing, typography } from "../../../src/theme/tokens"
import { DEMO_BOOK_ID } from "../../../src/demo/book-id"

type PageMeta = {
  page: number
  label: string
  exercise_ids: string[]
}

function PageSkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Skeleton height={28} width="60%" />
      <SkeletonCard style={{ gap: 10 }}>
        <Skeleton height={14} width="40%" />
        <Skeleton height={60} />
        <Skeleton height={14} width="80%" />
        <Skeleton height={40} />
      </SkeletonCard>
      <SkeletonCard style={{ gap: 10 }}>
        <Skeleton height={14} width="35%" />
        <Skeleton height={80} />
      </SkeletonCard>
    </View>
  )
}

/**
 * Unit viewer — pages from DB `pages[]`, exercises rendered from unit JSON.
 */
export default function DemoUnitScreen() {
  const { unit: unitParam } = useLocalSearchParams<{ unit: string }>()
  const unitNum = Number(unitParam)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unitTitle, setUnitTitle] = useState("")
  const [pages, setPages] = useState<PageMeta[]>([])
  const [allSteps, setAllSteps] = useState<LessonStep[]>([])
  const [pageIndex, setPageIndex] = useState(0)

  const load = useCallback(async () => {
    if (!Number.isFinite(unitNum) || unitNum < 1) {
      setError("Invalid unit")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [meta, unitPayload] = await Promise.all([
        liveLessonsApi.getBook(DEMO_BOOK_ID),
        liveLessonsApi.getUnit(DEMO_BOOK_ID, unitNum),
      ])
      const unitMeta = (meta.units ?? []).find((u) => Number(u.unit_number) === unitNum)
      setUnitTitle(unitMeta?.title || `Unit ${unitNum}`)

      const pageList =
        (unitMeta?.pages?.length
          ? unitMeta.pages
          : (meta.pages ?? []).filter((p) => Number(p.unit) === unitNum)
        ).map((p) => ({
          page: p.page,
          label: p.label,
          exercise_ids: p.exercise_ids ?? [],
        }))

      const steps = flattenUnitToSteps(
        unitPayload.unit,
        unitPayload.answer_key ?? undefined,
      )

      // If DB has no page index yet, fall back to one virtual page per exercise.
      const resolvedPages: PageMeta[] =
        pageList.length > 0
          ? pageList
          : steps.map((s) => ({
              page: s.order + 1,
              label: `${s.sectionLabel} · ${s.exerciseId}`,
              exercise_ids: [s.exerciseId],
            }))

      setPages(resolvedPages)
      setAllSteps(steps)
      setPageIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load unit")
      setPages([])
      setAllSteps([])
    } finally {
      setLoading(false)
    }
  }, [unitNum])

  useEffect(() => {
    void load()
  }, [load])

  const currentPage = pages[pageIndex] ?? null
  const pageSteps = useMemo(() => {
    if (!currentPage) return []
    const ids = new Set(currentPage.exercise_ids.map(String))
    const matched = allSteps.filter((s) => ids.has(String(s.exerciseId)))
    // Preserve book page order of exercise_ids
    return currentPage.exercise_ids
      .map((id) => matched.find((s) => String(s.exerciseId) === String(id)))
      .filter((s): s is LessonStep => Boolean(s))
  }, [currentPage, allSteps])

  const canPrev = pageIndex > 0
  const canNext = pageIndex < pages.length - 1

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.replace("/demo" as never)}
          hitSlop={12}
          style={styles.topBtn}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.topEyebrow}>
            {currentPage
              ? `UNIT ${unitNum} · P.${currentPage.page} · ${pageIndex + 1}/${pages.length || 1}`
              : `UNIT ${unitNum}`}
          </Text>
          <Text style={styles.topTitle} numberOfLines={1}>
            {unitTitle}
          </Text>
        </View>
        <Pressable onPress={() => void load()} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentPage ? (
              <View style={styles.pageHeader}>
                <Text style={styles.pageNum}>Page {currentPage.page}</Text>
                <Text style={styles.pageLabel}>{currentPage.label}</Text>
              </View>
            ) : null}

            {pageSteps.length === 0 ? (
              <Text style={styles.empty}>No exercises mapped to this page.</Text>
            ) : (
              pageSteps.map((step) => (
                <LiveExerciseView
                  key={step.id}
                  step={step}
                  unitSteps={allSteps}
                  embedded
                />
              ))
            )}
          </ScrollView>

          <View style={styles.turner}>
            <Pressable
              onPress={() => setPageIndex((i) => Math.max(0, i - 1))}
              disabled={!canPrev}
              style={[styles.turnerBtn, !canPrev && styles.turnerDisabled]}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={canPrev ? colors.primaryDark : colors.textMuted}
              />
              <Text style={[styles.turnerBtnText, !canPrev && { color: colors.textMuted }]}>
                Prev
              </Text>
            </Pressable>
            <View style={styles.turnerCenter}>
              <Text style={styles.turnerPage}>
                {currentPage ? `p. ${currentPage.page}` : "—"}
              </Text>
              <Text style={styles.turnerLabel} numberOfLines={1}>
                {currentPage?.label ?? ""}
              </Text>
            </View>
            <Pressable
              onPress={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
              disabled={!canNext}
              style={[styles.turnerBtn, !canNext && styles.turnerDisabled]}
            >
              <Text style={[styles.turnerBtnText, !canNext && { color: colors.textMuted }]}>
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={canNext ? colors.primaryDark : colors.textMuted}
              />
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  topBtn: { padding: 4 },
  topCenter: { flex: 1 },
  topEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colors.primary,
  },
  topTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
  },
  scroll: { padding: 12, paddingBottom: 24 },
  pageHeader: { marginBottom: 12, gap: 2 },
  pageNum: { fontSize: 12, fontWeight: "800", color: colors.primary, letterSpacing: 0.5 },
  pageLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  empty: { ...typography.body, color: colors.textSecondary, padding: spacing.lg },
  errorBox: { margin: 16, backgroundColor: "#FEF2F2", borderRadius: radius.card, padding: 14, gap: 10 },
  errorText: { color: "#991B1B", fontSize: 13, lineHeight: 18 },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  turner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    gap: 8,
  },
  turnerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  turnerDisabled: { backgroundColor: colors.borderLight },
  turnerBtnText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  turnerCenter: { flex: 1, alignItems: "center" },
  turnerPage: { fontSize: 13, fontWeight: "800", color: colors.text },
  turnerLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
})

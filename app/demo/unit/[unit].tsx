import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { liveLessonsApi } from "../../../src/lib/live-lesson-api"
import { flattenUnitToSteps } from "../../../src/lib/books/lesson-flow"
import type { LessonStep } from "../../../src/lib/books/types"
import { DEMO_BOOK_ID } from "../../../src/demo/book-id"
import { BookPageChrome, SectionBanner, UnitHeader } from "../../../src/demo/BookPageChrome"
import { BookExerciseRenderer, shouldSkipExercise } from "../../../src/demo/BookExerciseRenderer"
import { PURPLE } from "../../../src/demo/theme"

type PageMeta = {
  page: number
  label: string
  exercise_ids: string[]
}

/**
 * Unit viewer — pages from DB, rendered in Cambridge textbook layout.
 */
export default function DemoUnitScreen() {
  const { unit: unitParam } = useLocalSearchParams<{ unit: string }>()
  const unitNum = Number(unitParam)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unitTitle, setUnitTitle] = useState("")
  const [unitSubtitle, setUnitSubtitle] = useState<string | undefined>()
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
      setUnitSubtitle(unitMeta?.subtitle ?? undefined)

      const pageList = (
        unitMeta?.pages?.length
          ? unitMeta.pages
          : (meta.pages ?? []).filter((p) => Number(p.unit) === unitNum)
      ).map((p) => ({
        page: p.page,
        label: p.label,
        exercise_ids: p.exercise_ids ?? [],
      }))

      const steps = flattenUnitToSteps(unitPayload.unit, unitPayload.answer_key ?? undefined)

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
    const matched = allSteps.filter(
      (s) => ids.has(String(s.exerciseId)) && !shouldSkipExercise(s),
    )
    return currentPage.exercise_ids
      .map((id) => matched.find((s) => String(s.exerciseId) === String(id)))
      .filter((s): s is LessonStep => Boolean(s))
  }, [currentPage, allSteps])

  // Pages that only had image/graph tasks become empty — jump past them when turning.
  const visiblePageIndexes = useMemo(() => {
    return pages
      .map((p, idx) => {
        const ids = new Set(p.exercise_ids.map(String))
        const hasVisible = allSteps.some(
          (s) => ids.has(String(s.exerciseId)) && !shouldSkipExercise(s),
        )
        return hasVisible ? idx : -1
      })
      .filter((i) => i >= 0)
  }, [pages, allSteps])

  useEffect(() => {
    if (!visiblePageIndexes.length) return
    if (!visiblePageIndexes.includes(pageIndex)) {
      setPageIndex(visiblePageIndexes[0])
    }
  }, [visiblePageIndexes, pageIndex])

  const canPrev = visiblePageIndexes.some((i) => i < pageIndex)
  const canNext = visiblePageIndexes.some((i) => i > pageIndex)

  const goPrev = () => {
    const prev = [...visiblePageIndexes].reverse().find((i) => i < pageIndex)
    if (prev != null) setPageIndex(prev)
  }
  const goNext = () => {
    const next = visiblePageIndexes.find((i) => i > pageIndex)
    if (next != null) setPageIndex(next)
  }

  const visibleOrdinal = Math.max(0, visiblePageIndexes.indexOf(pageIndex))

  const sectionBannerTitle = useMemo(() => {
    const label = currentPage?.label ?? ""
    const head = label.split("·")[0]?.trim()
    return head || pageSteps[0]?.sectionLabel || undefined
  }, [currentPage, pageSteps])

  if (error && !loading) {
    return (
      <BookPageChrome
        title={unitTitle || "Error"}
        unit={unitNum}
        pageNum={0}
        pageIndex={0}
        pageCount={1}
        onClose={() => router.replace("/demo" as never)}
        onPrev={() => {}}
        onNext={() => {}}
        canPrev={false}
        canNext={false}
        onRefresh={() => void load()}
      >
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </BookPageChrome>
    )
  }

  return (
    <BookPageChrome
      title={unitTitle}
      unit={unitNum}
      subtitle={unitSubtitle}
      pageNum={currentPage?.page ?? 0}
      pageLabel={currentPage?.label}
      pageIndex={visibleOrdinal}
      pageCount={visiblePageIndexes.length || 1}
      onClose={() => router.replace("/demo" as never)}
      onPrev={goPrev}
      onNext={goNext}
      canPrev={canPrev}
      canNext={canNext}
      onRefresh={() => void load()}
      loading={loading}
    >
      {pageIndex === 0 ? (
        <UnitHeader unit={unitNum} title={unitTitle} subtitle={unitSubtitle} />
      ) : null}

      {sectionBannerTitle ? <SectionBanner title={sectionBannerTitle} /> : null}

      {pageSteps.length === 0 && !loading ? (
        <Text style={styles.empty}>No exercises mapped to this page.</Text>
      ) : (
        pageSteps.map((step) => (
          <BookExerciseRenderer key={step.id} step={step} unitSteps={allSteps} />
        ))
      )}
    </BookPageChrome>
  )
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: "Georgia",
    fontSize: 14,
    color: "#6B7280",
    paddingVertical: 12,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: "#991B1B", fontSize: 13, lineHeight: 18, fontFamily: "Georgia" },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: PURPLE.mid,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
})

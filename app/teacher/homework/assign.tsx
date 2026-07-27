import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { BackButton } from "../../../src/components/ui/BackButton"
import { FadeInDown } from "../../../src/components/ui/FadeInDown"
import { Spinner } from "../../../src/components/ui/Spinner"
import { TeacherListSkeleton } from "../../../src/components/teacher/TeacherSkeletons"
import { useAuth } from "../../../src/context/AuthContext"
import { exercisesApi, groupsApi, homeworkApi } from "../../../src/lib/api"
import { getUserFacingErrorMessage } from "../../../src/lib/api-client"
import type { Subject } from "../../../src/types/domain"
import type { Group } from "../../../src/types/staff"
import { VOCAB_SLUG_PREFIX } from "../../../src/types/vocabulary"
import { readingHomeworkSlug } from "../../../src/types/reading"
import { listeningHomeworkSlug } from "../../../src/types/listening"
import { colors, radius, shadow, spacing, subjectColors, typography } from "../../../src/theme/tokens"

const SUBJECTS: Subject[] = ["grammar", "vocabulary", "reading", "listening"]

type MaterialOption = {
  slug: string
  title: string
  subtitle?: string
}

function endOfDayIso(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)
  return dt.toISOString()
}

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function TeacherAssignHomeworkScreen() {
  const { groupId: prefillGroupId } = useLocalSearchParams<{ groupId?: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState(prefillGroupId ?? "")
  const [subject, setSubject] = useState<Subject>("grammar")
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [exerciseSlug, setExerciseSlug] = useState("")
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [error, setError] = useState("")

  useEffect(() => {
    void (async () => {
      try {
        const list = await groupsApi.list()
        setGroups(list.sort((a, b) => a.name.localeCompare(b.name)))
        if (!groupId && list[0]) setGroupId(list[0].id)
      } catch (e) {
        setError(getUserFacingErrorMessage(e, "Could not load groups."))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const loadMaterials = useCallback(async (nextSubject: Subject) => {
    setMaterialsLoading(true)
    setExerciseSlug("")
    try {
      let options: MaterialOption[] = []
      if (nextSubject === "grammar") {
        const topics = await exercisesApi.topics()
        const topicSlugs = topics
          .map((t) => t.slug || t.topic)
          .filter((s): s is string => Boolean(s))
          .slice(0, 12)
        const summaries = await Promise.all(
          topicSlugs.map((slug) => exercisesApi.summaries(slug)),
        )
        options = summaries.flat().map((ex) => ({
          slug: ex.slug,
          title: ex.title,
          subtitle: ex.topic,
        }))
      } else if (nextSubject === "vocabulary") {
        const decks = await exercisesApi.vocabSummaries()
        options = decks.map((d) => ({
          slug: d.slug.startsWith(VOCAB_SLUG_PREFIX) ? d.slug : `${VOCAB_SLUG_PREFIX}${d.slug}`,
          title: d.title,
          subtitle: d.level,
        }))
      } else if (nextSubject === "reading") {
        const items = await exercisesApi.readingSummaries()
        options = items.map((r) => ({
          slug: readingHomeworkSlug(r.slug),
          title: r.title,
          subtitle: r.level ?? r.subtitle,
        }))
      } else if (nextSubject === "listening") {
        const items = await exercisesApi.listeningSummaries()
        options = items.map((l) => ({
          slug: listeningHomeworkSlug(l.slug),
          title: l.title,
          subtitle: l.subtitle,
        }))
      }
      setMaterials(options)
    } catch (e) {
      setMaterials([])
      setError(getUserFacingErrorMessage(e, "Could not load materials."))
    } finally {
      setMaterialsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMaterials(subject)
  }, [subject, loadMaterials])

  useEffect(() => {
    const selected = materials.find((m) => m.slug === exerciseSlug)
    if (selected && !title.trim()) {
      setTitle(selected.title)
    }
  }, [exerciseSlug])

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === groupId) ?? null,
    [groups, groupId],
  )

  const canSubmit = Boolean(groupId && subject && exerciseSlug && title.trim() && dueDate)

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError("")
    try {
      await homeworkApi.create({
        title: title.trim(),
        subject,
        groupId,
        dueAt: endOfDayIso(dueDate),
        exerciseSlug,
        estimatedMinutes: 15,
        createdBy: user?.id,
      })
      Alert.alert("Assigned", "Homework has been assigned to the group.", [
        {
          text: "OK",
          onPress: () => {
            if (router.canGoBack()) router.back()
            else router.replace("/(teacher)/homework" as never)
          },
        },
      ])
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not assign homework."))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <TeacherListSkeleton count={3} />
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        <FadeInDown index={0}>
          <Text style={styles.title}>Assign homework</Text>
          <Text style={styles.subtitle}>Pick a group, material, and due date</Text>
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Group</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {groups.map((g) => {
            const active = g.id === groupId
            return (
              <Pressable
                key={g.id}
                onPress={() => setGroupId(g.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.name}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
        {selectedGroup ? (
          <Text style={styles.hint}>Selected: {selectedGroup.name}</Text>
        ) : null}

        <Text style={[styles.label, styles.labelSpaced]}>Subject</Text>
        <View style={styles.subjectRow}>
          {SUBJECTS.map((s) => {
            const active = s === subject
            const color = subjectColors[s] ?? colors.primary
            return (
              <Pressable
                key={s}
                onPress={() => setSubject(s)}
                style={[
                  styles.subjectChip,
                  active && { backgroundColor: `${color}33`, borderColor: color },
                ]}
              >
                <Text style={[styles.subjectText, active && { color: colors.text, fontWeight: "700" }]}>
                  {s}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={[styles.label, styles.labelSpaced]}>Material</Text>
        {materialsLoading ? (
          <View style={styles.materialsLoading}>
            <Spinner size={28} />
          </View>
        ) : materials.length === 0 ? (
          <View style={[styles.emptyCard, shadow.card]}>
            <Text style={styles.emptyText}>No materials for this subject</Text>
          </View>
        ) : (
          materials.slice(0, 40).map((m) => {
            const active = m.slug === exerciseSlug
            return (
              <Pressable
                key={m.slug}
                onPress={() => {
                  setExerciseSlug(m.slug)
                  setTitle(m.title)
                }}
                style={[styles.materialCard, shadow.card, active && styles.materialActive]}
              >
                <View style={styles.materialMain}>
                  <Text style={styles.materialTitle} numberOfLines={1}>
                    {m.title}
                  </Text>
                  {m.subtitle ? (
                    <Text style={styles.materialSub} numberOfLines={1}>
                      {m.subtitle}
                    </Text>
                  ) : null}
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </Pressable>
            )
          })
        )}

        <Text style={[styles.label, styles.labelSpaced]}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Homework title"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Due date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dueDate}
          onChangeText={setDueDate}
          autoCapitalize="none"
          placeholder="2026-08-03"
          placeholderTextColor={colors.textMuted}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitDisabled]}
          onPress={() => void submit()}
          disabled={!canSubmit || submitting}
        >
          {submitting ? <Spinner size={22} /> : <Text style={styles.submitText}>Assign homework</Text>}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 110,
  },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.sm },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  labelSpaced: { marginTop: spacing.lg },
  chipScroll: { marginBottom: spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: { ...typography.label, color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: colors.primary },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    textTransform: "capitalize",
  },
  subjectText: { ...typography.caption, color: colors.textSecondary, textTransform: "capitalize" },
  materialsLoading: { paddingVertical: spacing.xl, alignItems: "center" },
  materialCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  materialActive: { borderColor: colors.primary },
  materialMain: { flex: 1, minWidth: 0 },
  materialTitle: { ...typography.label, color: colors.text },
  materialSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: "center" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
})

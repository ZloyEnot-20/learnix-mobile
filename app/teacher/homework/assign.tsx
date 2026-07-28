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
import { AssignConfirmModal } from "../../../src/components/teacher/AssignConfirmModal"
import { HorizontalBadgeStrip } from "../../../src/components/teacher/HorizontalBadgeStrip"
import { HomeworkListRow } from "../../../src/components/teacher/HomeworkListRow"
import { TeacherMaterialPreviewModal } from "../../../src/components/teacher/TeacherMaterialPreviewModal"
import { TeacherListSkeleton } from "../../../src/components/teacher/TeacherSkeletons"
import { useAuth } from "../../../src/context/AuthContext"
import { groupsApi, homeworkApi } from "../../../src/lib/api"
import { getUserFacingErrorMessage } from "../../../src/lib/api-client"
import {
  ASSIGN_LEVEL_ORDER,
  materialCartKey,
  type TeacherMaterialOption,
} from "../../../src/lib/teacher-materials"
import {
  ensureTeacherMaterials,
  getCachedFilteredMaterials,
  getCachedFolderMaterials,
  getCachedLevelCounts,
  isFolderMaterialsLoading,
  preloadTeacherMaterials,
  subscribeTeacherMaterialsCache,
} from "../../../src/lib/teacher-materials-cache"
import type { Group } from "../../../src/types/staff"
import { colors, radius, spacing, typography } from "../../../src/theme/tokens"
import {
  ASSIGN_FOLDERS,
  assignLevelMeta,
  subjectFolderMeta,
  teacherColors,
  type AssignFolder,
} from "../../../src/theme/teacher-tokens"

type CartItem = TeacherMaterialOption

const TASK_PAGE_SIZE = 20

const AssignTaskRow = React.memo(function AssignTaskRow({
  material,
  folderLabel,
  selected,
  assignedPreviously,
  onToggle,
  onPreview,
}: {
  material: TeacherMaterialOption
  folderLabel: string
  selected: boolean
  assignedPreviously: boolean
  onToggle: (item: TeacherMaterialOption) => void
  onPreview: (item: TeacherMaterialOption) => void
}) {
  return (
    <HomeworkListRow
      title={material.title}
      subtitle={material.subtitle ?? folderLabel}
      subject={material.folder}
      selected={selected}
      selectionMode
      assignedPreviously={assignedPreviously}
      onPress={() => onToggle(material)}
      onPreview={() => onPreview(material)}
    />
  )
})

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

function folderSkipsLevel(folder: AssignFolder | null): boolean {
  return folder === "listening"
}

export default function TeacherAssignHomeworkScreen() {
  const { groupId: prefillGroupId } = useLocalSearchParams<{ groupId?: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState(prefillGroupId ?? "")
  const [folder, setFolder] = useState<AssignFolder | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [cacheVersion, setCacheVersion] = useState(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [error, setError] = useState("")
  const [taskSearch, setTaskSearch] = useState("")
  const [previewMaterial, setPreviewMaterial] = useState<TeacherMaterialOption | null>(null)
  const [groupAssignedSlugs, setGroupAssignedSlugs] = useState<Set<string>>(() => new Set())
  const [taskPage, setTaskPage] = useState(1)

  useEffect(() => {
    void preloadTeacherMaterials()
    return subscribeTeacherMaterialsCache(() => {
      setCacheVersion((v) => v + 1)
    })
  }, [])

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

  useEffect(() => {
    if (!groupId) {
      setGroupAssignedSlugs(new Set())
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const list = await homeworkApi.list()
        if (cancelled) return
        const slugs = new Set<string>()
        for (const hw of list) {
          if (hw.groupId === groupId && hw.exerciseSlug) slugs.add(hw.exerciseSlug)
        }
        setGroupAssignedSlugs(slugs)
      } catch {
        if (!cancelled) setGroupAssignedSlugs(new Set())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [groupId])

  const selectFolder = useCallback((nextFolder: AssignFolder) => {
    setFolder(nextFolder)
    setTaskSearch("")
    setTaskPage(1)
    if (folderSkipsLevel(nextFolder)) {
      setLevel("IELTS")
    }
    void ensureTeacherMaterials(nextFolder)
  }, [])

  const selectLevel = useCallback((nextLevel: string) => {
    setLevel(nextLevel)
    setTaskSearch("")
    setTaskPage(1)
  }, [])

  useEffect(() => {
    setTaskPage(1)
  }, [folder, level, taskSearch])

  const folderMaterialsReady = folder ? getCachedFolderMaterials(folder) !== undefined : false

  const materials = useMemo(() => {
    if (!folder || !level || !folderMaterialsReady) return []
    return getCachedFilteredMaterials(folder, level) ?? []
  }, [folder, level, folderMaterialsReady, cacheVersion])

  const filteredMaterials = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()
    if (!query) return materials
    return materials.filter((m) => {
      const title = m.title.toLowerCase()
      const subtitle = (m.subtitle ?? "").toLowerCase()
      return title.includes(query) || subtitle.includes(query)
    })
  }, [materials, taskSearch])

  const visibleMaterials = useMemo(
    () => filteredMaterials.slice(0, taskPage * TASK_PAGE_SIZE),
    [filteredMaterials, taskPage],
  )

  const hasMoreTasks = visibleMaterials.length < filteredMaterials.length

  const folderMaterialsLoading = folder ? isFolderMaterialsLoading(folder) : false

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === groupId) ?? null,
    [groups, groupId],
  )

  const cartKeys = useMemo(() => new Set(cart.map(materialCartKey)), [cart])
  const canAssign = Boolean(groupId && cart.length > 0)
  const levelCounts = useMemo(() => {
    if (!folder || !folderMaterialsReady) return {}
    return getCachedLevelCounts(folder) ?? {}
  }, [folder, folderMaterialsReady, cacheVersion])
  const folderLabel = folder ? (subjectFolderMeta[folder]?.label ?? folder) : ""

  const typeBadges = useMemo(
    () =>
      ASSIGN_FOLDERS.map((id) => {
        const meta = subjectFolderMeta[id]
        return {
          id,
          label: meta?.label ?? id,
          icon: meta?.icon,
          bg: meta?.bg,
          color: meta?.color,
        }
      }),
    [],
  )

  const levelBadges = useMemo(
    () =>
      ASSIGN_LEVEL_ORDER.map((id) => {
        const meta = assignLevelMeta[id]
        const count = folderMaterialsReady ? (levelCounts[id] ?? 0) : null
        return {
          id,
          label: meta?.label ?? id,
          sublabel: count != null ? String(count) : undefined,
          icon: meta?.icon,
          bg: meta?.bg,
          color: meta?.color,
        }
      }),
    [levelCounts, folderMaterialsReady],
  )

  const toggleMaterial = useCallback((material: TeacherMaterialOption) => {
    const key = materialCartKey(material)
    setCart((prev) => {
      if (prev.some((item) => materialCartKey(item) === key)) {
        return prev.filter((item) => materialCartKey(item) !== key)
      }
      return [...prev, material]
    })
  }, [])

  const openPreview = useCallback((material: TeacherMaterialOption) => {
    setPreviewMaterial(material)
  }, [])

  const loadMoreTasks = useCallback(() => {
    if (visibleMaterials.length < filteredMaterials.length) {
      setTaskPage((page) => page + 1)
    }
  }, [visibleMaterials.length, filteredMaterials.length])

  const removeFromCart = useCallback((material: CartItem) => {
    const key = materialCartKey(material)
    setCart((prev) => prev.filter((item) => materialCartKey(item) !== key))
  }, [])

  const submit = async (pickedDueDate: string) => {
    if (!groupId || cart.length === 0 || !pickedDueDate) return
    setSubmitting(true)
    setError("")
    try {
      const dueAt = endOfDayIso(pickedDueDate)
      setDueDate(pickedDueDate)
      await Promise.all(
        cart.map((item) =>
          homeworkApi.create({
            title: item.title,
            subject: item.homeworkSubject,
            groupId,
            dueAt,
            exerciseSlug: item.slug,
            estimatedMinutes: item.estimatedMinutes ?? 15,
            createdBy: user?.id,
          }),
        ),
      )
      setGroupAssignedSlugs((prev) => {
        const next = new Set(prev)
        for (const item of cart) next.add(item.slug)
        return next
      })
      setConfirmOpen(false)
      Alert.alert(
        "Assigned",
        cart.length === 1
          ? "Homework has been assigned to the group."
          : `${cart.length} assignments have been sent to the group.`,
        [
          {
            text: "OK",
            onPress: () => {
              if (router.canGoBack()) router.back()
              else router.replace("/(teacher)/homework" as never)
            },
          },
        ],
      )
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not assign homework."))
    } finally {
      setSubmitting(false)
    }
  }

  const renderListEmpty = useCallback(() => {
    if (!folder || !level) return null
    if (materials.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No materials in this folder</Text>
        </View>
      )
    }
    if (filteredMaterials.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tests match your search</Text>
        </View>
      )
    }
    return null
  }, [folder, level, materials.length, filteredMaterials.length])

  const showTaskSkeleton = Boolean(folder && level && folderMaterialsLoading && !folderMaterialsReady)
  const listEmpty = renderListEmpty()

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.screenTitle}>Assign homework</Text>
          <View style={styles.topSpacer} />
        </View>
        <TeacherListSkeleton count={3} />
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.screenTitle}>Assign homework</Text>
        {cart.length > 0 ? (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cart.length}</Text>
          </View>
        ) : (
          <View style={styles.topSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionLabel}>Group</Text>
        <View style={styles.groupScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgeScroll}
            nestedScrollEnabled
          >
            {groups.map((g) => {
              const active = g.id === groupId
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGroupId(g.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {g.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        <Text style={styles.sectionLabel}>Type</Text>
        <HorizontalBadgeStrip
          items={typeBadges}
          selectedId={folder}
          onSelect={(id) => selectFolder(id as AssignFolder)}
          edgeToEdge
        />

        <Text style={styles.sectionLabel}>Level</Text>
        <HorizontalBadgeStrip
          items={levelBadges}
          selectedId={level}
          onSelect={selectLevel}
          edgeToEdge
          reserveSublabel={Boolean(folder)}
        />

        {folder && level ? (
          <>
            <Text style={styles.sectionLabel}>
              Tasks · {folderLabel} · {level}
              {filteredMaterials.length > 0 ? ` · ${filteredMaterials.length}` : ""}
            </Text>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={taskSearch}
                onChangeText={setTaskSearch}
                placeholder="Search by test name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {taskSearch.length > 0 ? (
                <Pressable onPress={() => setTaskSearch("")} hitSlop={8} style={styles.searchClear}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {showTaskSkeleton ? (
              <TeacherListSkeleton count={4} />
            ) : listEmpty ? (
              listEmpty
            ) : (
              visibleMaterials.map((m) => (
                <AssignTaskRow
                  key={m.slug}
                  material={m}
                  folderLabel={folderLabel}
                  selected={cartKeys.has(materialCartKey(m))}
                  assignedPreviously={groupAssignedSlugs.has(m.slug)}
                  onToggle={toggleMaterial}
                  onPreview={openPreview}
                />
              ))
            )}

            {hasMoreTasks ? (
              <Pressable
                onPress={loadMoreTasks}
                style={({ pressed }) => [styles.loadMoreBtn, pressed && styles.pressed]}
              >
                <Text style={styles.loadMoreText}>
                  Load more · {visibleMaterials.length} of {filteredMaterials.length}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : folder && folderSkipsLevel(folder) ? null : (
          <Text style={styles.hint}>Pick a type and level to see tasks.</Text>
        )}

        {cart.length > 0 ? (
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Selected · {cart.length}</Text>
            {cart.map((item) => (
              <View key={materialCartKey(item)} style={styles.cartRow}>
                <View style={styles.cartRowMain}>
                  <Text style={styles.cartRowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cartRowMeta}>
                    {subjectFolderMeta[item.folder]?.label ?? item.folder}
                  </Text>
                </View>
                <Pressable onPress={() => removeFromCart(item)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.listBottomSpacer} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Text style={styles.footerMeta} numberOfLines={1}>
          {selectedGroup?.name ?? "Group"} · {cart.length} task{cart.length === 1 ? "" : "s"}
        </Text>
        <Pressable
          style={[styles.submitBtn, (!canAssign || submitting) && styles.submitDisabled]}
          onPress={() => setConfirmOpen(true)}
          disabled={!canAssign || submitting}
        >
          <Text style={styles.submitText}>
            Assign{cart.length > 0 ? ` (${cart.length})` : ""}
          </Text>
        </Pressable>
      </View>

      <AssignConfirmModal
        visible={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        onConfirm={(date) => void submit(date)}
        onRemoveItem={removeFromCart}
        onPreviewItem={setPreviewMaterial}
        submitting={submitting}
        groupName={selectedGroup?.name ?? "Group"}
        cart={cart}
        initialDueDate={dueDate}
      />

      <TeacherMaterialPreviewModal
        visible={previewMaterial != null}
        material={previewMaterial}
        onClose={() => setPreviewMaterial(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  screenTitle: { ...typography.h3, color: colors.text, flex: 1, fontSize: 18 },
  cartBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: teacherColors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  cartBadgeText: { ...typography.caption, fontWeight: "800", color: "#FFFFFF" },
  topSpacer: { width: 28 },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  groupScrollWrap: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing.xs,
  },
  listBottomSpacer: {
    height: 120,
  },
  loadMoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  loadMoreText: {
    ...typography.label,
    color: teacherColors.accentDark,
    fontSize: 13,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.text,
    paddingVertical: 10,
  },
  searchClear: {
    marginLeft: spacing.xs,
  },
  badgeScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
    alignSelf: "center",
  },
  chipActive: {
    backgroundColor: teacherColors.accentLight,
    borderWidth: 1,
    borderColor: teacherColors.accentMuted,
  },
  chipText: { ...typography.label, color: colors.text, fontSize: 13 },
  chipTextActive: { fontWeight: "800", color: teacherColors.accentDark },
  loadingBox: { paddingVertical: spacing.md, alignItems: "center" },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted },
  hint: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  cartSection: {
    marginTop: spacing.sm,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 6,
  },
  cartRowMain: { flex: 1, minWidth: 0 },
  cartRowTitle: { ...typography.label, color: colors.text, fontSize: 13 },
  cartRowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
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
    gap: spacing.sm,
  },
  footerMeta: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: teacherColors.accent,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
  pressed: { opacity: 0.88 },
})

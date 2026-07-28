import React, { useCallback, useMemo, useState } from "react"
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import {
  AdminBottomSheet,
  AdminSheetBody,
  AdminSheetDetailRow,
  AdminSheetHeaderCard,
  AdminSheetInfoCard,
} from "../admin-sheet-ui"
import { AdminGroupProgressSection } from "../AdminGroupProgressSection"
import { AdminListSkeleton } from "../AdminListSkeleton"
import { GROUP_CARD_PALETTES } from "../../teacher/TeacherHomeGroupCards"
import { adminApi } from "../../../lib/api"
import { formatLastLogin } from "../../../lib/admin-format"
import { getUserFacingErrorMessage } from "../../../lib/api-client"
import type { AdminTeacherOverview } from "../../../types/admin"
import { colors, radius, shadow, spacing, typography } from "../../../theme/tokens"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function AdminTeachersScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [teachers, setTeachers] = useState<AdminTeacherOverview[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<AdminTeacherOverview | null>(null)
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setTeachers(await adminApi.teachers())
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not load teachers."))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.groupNames.some((g) => g.toLowerCase().includes(q)),
    )
  }, [teachers, search])

  const closeTeacherSheet = () => {
    setSelected(null)
    setGroupSheetOpen(false)
  }

  if (loading) return <AdminListSkeleton />

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search teacher or group"
              placeholderTextColor={colors.textMuted}
              style={styles.search}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)} style={[styles.card, shadow.card]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.name)}</Text>
              <View style={[styles.dot, item.isOnline ? styles.dotOnline : styles.dotOffline]} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.studentCount} students · {item.groupNames.length} groups
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No teachers found</Text>}
      />

      <AdminBottomSheet
        visible={!!selected && !groupSheetOpen}
        onClose={closeTeacherSheet}
        title={selected?.name ?? "Teacher"}
      >
        {selected ? (
          <View style={styles.sheetContent}>
            <AdminSheetBody>
              <AdminSheetHeaderCard
                title={selected.name}
                subtitle={`${selected.studentCount} students · ${selected.groupIds.length} groups`}
                initials={initials(selected.name)}
                accentBg="#EDE9FE"
                accentColor="#7C3AED"
                badge={
                  selected.isOnline
                    ? { label: "Online", tone: "success" }
                    : { label: "Offline", tone: "muted" }
                }
              />
              <AdminSheetInfoCard>
                <AdminSheetDetailRow label="Students" value={String(selected.studentCount)} />
                <AdminSheetDetailRow
                  label="Groups"
                  value={String(selected.groupIds.length)}
                />
                <AdminSheetDetailRow
                  label="Last activity"
                  value={formatLastLogin(selected.lastActivityAt)}
                  last
                />
              </AdminSheetInfoCard>
            </AdminSheetBody>
            <View style={styles.groupsSection}>
              <AdminGroupProgressSection
                title="Groups"
                groupIds={selected.groupIds}
                embedded
                bleed={false}
                onModalVisibilityChange={setGroupSheetOpen}
              />
            </View>
          </View>
        ) : null}
      </AdminBottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.screen, gap: spacing.sm, paddingBottom: spacing.xxl },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  search: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avatar: { position: "relative" },
  avatarText: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GROUP_CARD_PALETTES[1].bg,
    color: GROUP_CARD_PALETTES[1].color,
    textAlign: "center",
    ...typography.label,
    lineHeight: 44,
  },
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.card,
  },
  dotOnline: { backgroundColor: colors.success },
  dotOffline: { backgroundColor: colors.textMuted },
  cardBody: { flex: 1, minWidth: 0 },
  name: { ...typography.label, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { ...typography.bodySm, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  sheetContent: { gap: spacing.sm },
  groupsSection: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
})

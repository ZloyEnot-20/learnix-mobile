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
  AdminSheetMenuCard,
  AdminSheetMenuItem,
  AdminSheetPickRow,
  AdminSheetPrimaryButton,
  AdminSheetSectionTitle,
} from "../admin-sheet-ui"
import { AdminListSkeleton } from "../AdminListSkeleton"
import { adminApi, groupsApi, studentsApi } from "../../../lib/api"
import { formatLastLogin } from "../../../lib/admin-format"
import { getUserFacingErrorMessage } from "../../../lib/api-client"
import type { AdminTeacherOverview } from "../../../types/admin"
import type { Group, StaffStudent } from "../../../types/staff"
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

export function AdminUsersScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [students, setStudents] = useState<StaffStudent[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<AdminTeacherOverview[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all")
  const [selected, setSelected] = useState<StaffStudent | null>(null)
  const [sheet, setSheet] = useState<"detail" | "group" | "teacher" | null>(null)
  const [pickedGroupId, setPickedGroupId] = useState("")
  const [pickedTeacherId, setPickedTeacherId] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (force = false) => {
    try {
      const [s, g, t] = await Promise.all([
        studentsApi.list({ force }),
        groupsApi.list({ force }),
        adminApi.teachers(),
      ])
      setStudents(s)
      setGroups(g)
      setTeachers(t)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not load users."))
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
    return students.filter((s) => {
      if (statusFilter === "active" && s.isActive === false) return false
      if (statusFilter === "blocked" && s.isActive !== false) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.login.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.phone?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [students, search, statusFilter])

  const groupName = (id?: string) => groups.find((g) => g.id === id)?.name ?? "—"
  const teacherForStudent = (s: StaffStudent) => {
    const g = groups.find((gr) => gr.id === s.groupId)
    if (!g?.teacherId) return "—"
    return teachers.find((t) => t.id === g.teacherId)?.name ?? "—"
  }

  const openStudent = (s: StaffStudent) => {
    setSelected(s)
    setPickedGroupId(s.groupId ?? "")
    setPickedTeacherId(groups.find((g) => g.id === s.groupId)?.teacherId ?? "")
    setSheet("detail")
  }

  const saveGroup = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await studentsApi.update(selected.id, { groupId: pickedGroupId || undefined })
      setSheet(null)
      await load(true)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not update group."))
    } finally {
      setSaving(false)
    }
  }

  const saveTeacher = async () => {
    if (!selected || !pickedTeacherId) return
    const teacherGroups = groups.filter((g) => g.teacherId === pickedTeacherId)
    if (!teacherGroups.length) {
      Alert.alert("No groups", "This teacher has no groups yet.")
      return
    }
    setSaving(true)
    try {
      await studentsApi.update(selected.id, { groupId: teacherGroups[0].id })
      setSheet(null)
      await load(true)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not assign teacher."))
    } finally {
      setSaving(false)
    }
  }

  const toggleBlock = async () => {
    if (!selected) return
    try {
      if (selected.isActive === false) await studentsApi.unblock(selected.id)
      else await studentsApi.block(selected.id)
      setSheet(null)
      await load(true)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Action failed."))
    }
  }

  const resetPassword = async () => {
    if (!selected) return
    try {
      const res = await studentsApi.resetPassword(selected.id)
      Alert.alert(
        "New credentials",
        `Login: ${res.login}\nPassword: ${res.password}\nCode: ${res.confirmation.code}`,
      )
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not reset password."))
    }
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
              void load(true)
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Name, email or phone"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
              />
            </View>
            <View style={styles.chips}>
              {(["all", "active", "blocked"] as const).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setStatusFilter(key)}
                  style={[styles.chip, statusFilter === key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, statusFilter === key && styles.chipTextActive]}>
                    {key === "all" ? "All" : key === "active" ? "Active" : "Blocked"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openStudent(item)} style={[styles.card, shadow.card]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.name)}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {groupName(item.groupId)} · {formatLastLogin(item.lastLoginAt)}
              </Text>
            </View>
            <View style={[styles.badge, item.isActive === false && styles.badgeBlocked]}>
              <Text style={[styles.badgeText, item.isActive === false && styles.badgeTextBlocked]}>
                {item.isActive === false ? "Blocked" : "Active"}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
      />

      <AdminBottomSheet visible={sheet === "detail"} onClose={() => setSheet(null)} title={selected?.name ?? "User"}>
        {selected ? (
          <AdminSheetBody>
            <AdminSheetHeaderCard
              title={selected.name}
              subtitle={selected.login ? `@${selected.login}` : undefined}
              initials={initials(selected.name)}
              badge={
                selected.isActive === false
                  ? { label: "Blocked", tone: "danger" }
                  : { label: "Active", tone: "success" }
              }
            />
            <AdminSheetInfoCard>
              <AdminSheetDetailRow label="Group" value={groupName(selected.groupId)} />
              <AdminSheetDetailRow label="Teacher" value={teacherForStudent(selected)} />
              <AdminSheetDetailRow
                label="Last activity"
                value={formatLastLogin(selected.lastLoginAt)}
                last
              />
            </AdminSheetInfoCard>
            <AdminSheetSectionTitle title="Actions" />
            <AdminSheetMenuCard>
              <AdminSheetMenuItem
                icon="people-outline"
                label="Change group"
                onPress={() => setSheet("group")}
              />
              <AdminSheetMenuItem
                icon="school-outline"
                label="Assign teacher"
                onPress={() => setSheet("teacher")}
              />
              <AdminSheetMenuItem
                icon="key-outline"
                label="Reset password"
                onPress={() => void resetPassword()}
              />
              <AdminSheetMenuItem
                icon={selected.isActive === false ? "lock-open-outline" : "ban-outline"}
                label={selected.isActive === false ? "Unblock account" : "Block account"}
                onPress={() => void toggleBlock()}
                danger
                last
              />
            </AdminSheetMenuCard>
          </AdminSheetBody>
        ) : null}
      </AdminBottomSheet>

      <AdminBottomSheet visible={sheet === "group"} onClose={() => setSheet("detail")} title="Change group">
        <AdminSheetBody>
          {groups.map((g) => (
            <AdminSheetPickRow
              key={g.id}
              label={g.name}
              selected={pickedGroupId === g.id}
              onPress={() => setPickedGroupId(g.id)}
            />
          ))}
          <AdminSheetPrimaryButton
            label={saving ? "Saving…" : "Save"}
            onPress={() => void saveGroup()}
            disabled={saving}
          />
        </AdminSheetBody>
      </AdminBottomSheet>

      <AdminBottomSheet visible={sheet === "teacher"} onClose={() => setSheet("detail")} title="Assign teacher">
        <AdminSheetBody>
          {teachers.map((t) => (
            <AdminSheetPickRow
              key={t.id}
              label={t.name}
              selected={pickedTeacherId === t.id}
              onPress={() => setPickedTeacherId(t.id)}
            />
          ))}
          <AdminSheetPrimaryButton
            label={saving ? "Assigning…" : "Assign"}
            onPress={() => void saveTeacher()}
            disabled={saving}
          />
        </AdminSheetBody>
      </AdminBottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.screen, gap: spacing.sm, paddingBottom: spacing.xxl },
  filters: { gap: spacing.sm, marginBottom: spacing.md },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  search: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 12 },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { ...typography.label, color: colors.primary },
  cardBody: { flex: 1, minWidth: 0 },
  name: { ...typography.label, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeBlocked: { backgroundColor: colors.errorBg },
  badgeText: { ...typography.caption, fontSize: 10, fontWeight: "600", color: colors.success },
  badgeTextBlocked: { color: colors.error },
  empty: { ...typography.bodySm, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
})

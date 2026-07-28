import React, { useCallback, useMemo, useState } from "react"
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
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
  AdminSheetPickRow,
  AdminSheetPrimaryButton,
  adminSheetStyles,
} from "../admin-sheet-ui"
import { AdminListSkeleton } from "../AdminListSkeleton"
import { adminApi, groupsApi, studentsApi } from "../../../lib/api"
import { formatDateTime } from "../../../lib/admin-format"
import { getUserFacingErrorMessage } from "../../../lib/api-client"
import type { AdminBroadcastRecord } from "../../../types/admin"
import type { Group, StaffStudent } from "../../../types/staff"
import { colors, radius, shadow, spacing, typography } from "../../../theme/tokens"

type Audience = "all" | "group" | "student"

export function AdminPushScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [history, setHistory] = useState<AdminBroadcastRecord[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<StaffStudent[]>([])
  const [audience, setAudience] = useState<Audience>("all")
  const [audienceId, setAudienceId] = useState("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState("")

  const activeStudents = useMemo(
    () => students.filter((s) => s.isActive !== false),
    [students],
  )

  const load = useCallback(async () => {
    try {
      const [rows, g, s] = await Promise.all([
        adminApi.broadcastHistory(),
        groupsApi.list(),
        studentsApi.list(),
      ])
      setHistory(rows)
      setGroups(g)
      setStudents(s)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not load notifications."))
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

  const recipientCount = useMemo(() => {
    if (audience === "all") return activeStudents.length
    if (audience === "group") {
      return activeStudents.filter((s) => s.groupId === audienceId).length
    }
    return audienceId ? 1 : 0
  }, [audience, audienceId, activeStudents])

  const audienceLabel = useMemo(() => {
    if (audience === "all") return "All students"
    if (audience === "group") {
      return groups.find((g) => g.id === audienceId)?.name ?? "Select group"
    }
    return activeStudents.find((s) => s.id === audienceId)?.name ?? "Select student"
  }, [audience, audienceId, groups, activeStudents])

  const send = async () => {
    const trimmedTitle = title.trim()
    const trimmedMessage = message.trim()
    if (!trimmedTitle || !trimmedMessage) {
      Alert.alert("Missing fields", "Title and message are required.")
      return
    }
    if (audience !== "all" && !audienceId) {
      Alert.alert("Select recipient", "Choose a group or student.")
      return
    }
    setSending(true)
    try {
      await adminApi.broadcast({
        audience,
        audienceId: audience === "all" ? undefined : audienceId,
        title: trimmedTitle,
        message: trimmedMessage,
      })
      setTitle("")
      setMessage("")
      setPreviewOpen(false)
      await load()
      Alert.alert("Sent", `Delivered to ${recipientCount} recipient(s).`)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not send notification."))
    } finally {
      setSending(false)
    }
  }

  const pickerItems = useMemo(() => {
    const sortByLabel = <T extends { label: string }>(items: T[]) =>
      [...items].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))

    if (audience === "group") {
      return sortByLabel(
        groups.map((g) => ({
          id: g.id,
          label: g.name,
          searchText: [g.name, g.teacherName].filter(Boolean).join(" "),
        })),
      )
    }
    if (audience === "student") {
      return sortByLabel(
        activeStudents.map((s) => ({
          id: s.id,
          label: s.name,
          searchText: [s.name, s.login, s.email, s.phone].filter(Boolean).join(" "),
        })),
      )
    }
    return []
  }, [audience, groups, activeStudents])

  const filteredPickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    if (!q) return pickerItems
    return pickerItems.filter((item) => item.searchText.toLowerCase().includes(q))
  }, [pickerItems, pickerSearch])

  const closePicker = () => {
    setPickerOpen(false)
    setPickerSearch("")
  }

  if (loading) return <AdminListSkeleton />

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
          />
        }
      >
        <View style={[styles.formCard, shadow.card]}>
          <Text style={styles.sectionTitle}>New notification</Text>

          <Text style={styles.fieldLabel}>Audience</Text>
          <View style={styles.chips}>
            {(["all", "group", "student"] as const).map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  setAudience(key)
                  setAudienceId("")
                }}
                style={[styles.chip, audience === key && styles.chipActive]}
              >
                <Text style={[styles.chipText, audience === key && styles.chipTextActive]}>
                  {key === "all" ? "All" : key === "group" ? "Group" : "Student"}
                </Text>
              </Pressable>
            ))}
          </View>

          {audience !== "all" ? (
            <Pressable style={styles.pickerBtn} onPress={() => setPickerOpen(true)}>
              <Text style={styles.pickerText}>{audienceLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Notification title"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Your message"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textarea]}
            multiline
          />

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={() => setPreviewOpen(true)}>
              <Ionicons name="eye-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>Preview</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => void send()} disabled={sending}>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{sending ? "Sending…" : "Send"}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.historyTitle}>History</Text>
        {history.length === 0 ? (
          <Text style={styles.empty}>No notifications sent yet</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={[styles.historyCard, shadow.card]}>
              <Text style={styles.historyItemTitle}>{item.title}</Text>
              <Text style={styles.historyMessage} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={styles.historyMeta}>
                {item.audienceLabel ?? item.audience} · {item.recipientCount} recipients ·{" "}
                {formatDateTime(item.createdAt)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <AdminBottomSheet visible={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview">
        <AdminSheetBody>
          <View style={adminSheetStyles.previewCard}>
            <View style={adminSheetStyles.previewIcon}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
            </View>
            <View style={adminSheetStyles.previewBody}>
              <Text style={adminSheetStyles.previewTitle}>{title.trim() || "Title"}</Text>
              <Text style={adminSheetStyles.previewMessage}>{message.trim() || "Message"}</Text>
            </View>
          </View>
          <Text style={adminSheetStyles.previewMeta}>
            To: {audienceLabel} ({recipientCount} recipients)
          </Text>
          <AdminSheetPrimaryButton
            label={sending ? "Sending…" : "Confirm & send"}
            onPress={() => void send()}
            disabled={sending}
          />
        </AdminSheetBody>
      </AdminBottomSheet>

      <AdminBottomSheet
        visible={pickerOpen}
        onClose={closePicker}
        title={audience === "group" ? "Select group" : "Select student"}
      >
        <AdminSheetBody>
          <View style={styles.pickerSearchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder={audience === "group" ? "Search group or teacher" : "Search name, email or phone"}
              placeholderTextColor={colors.textMuted}
              style={styles.pickerSearchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {pickerSearch.length > 0 ? (
              <Pressable onPress={() => setPickerSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          {filteredPickerItems.length === 0 ? (
            <Text style={styles.empty}>
              {pickerItems.length === 0 ? "Nothing to select" : "No matches found"}
            </Text>
          ) : (
            <View style={adminSheetStyles.pickerList}>
              {filteredPickerItems.map((item) => (
                <AdminSheetPickRow
                  key={item.id}
                  label={item.label}
                  selected={audienceId === item.id}
                  onPress={() => {
                    setAudienceId(item.id)
                    closePicker()
                  }}
                />
              ))}
            </View>
          )}
        </AdminSheetBody>
      </AdminBottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.md },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.label, fontSize: 16, color: colors.text, marginBottom: spacing.xs },
  fieldLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: "600" },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  pickerText: { ...typography.body, color: colors.text },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
  },
  textarea: { minHeight: 88, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
  },
  secondaryBtnText: { ...typography.label, color: colors.primary },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 12,
  },
  primaryBtnText: { ...typography.label, color: "#fff" },
  historyTitle: { ...typography.label, color: colors.text, marginTop: spacing.sm },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 4,
  },
  historyItemTitle: { ...typography.label, color: colors.text },
  historyMessage: { ...typography.bodySm, color: colors.textSecondary },
  historyMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { ...typography.bodySm, color: colors.textMuted, textAlign: "center" },
  pickerSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pickerSearchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 12,
  },
})

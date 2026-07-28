import React from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheet } from "../ui/BottomSheet"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"

type AdminBottomSheetProps = React.ComponentProps<typeof BottomSheet>

export function AdminBottomSheet({ contentStyle, ...props }: AdminBottomSheetProps) {
  return (
    <BottomSheet
      {...props}
      contentStyle={[styles.sheetContent, contentStyle]}
    />
  )
}

type AdminSheetBodyProps = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function AdminSheetBody({ children, style }: AdminSheetBodyProps) {
  const { height: windowHeight } = useWindowDimensions()
  const maxHeight = Math.min(windowHeight * 0.72, windowHeight - 120)

  return (
    <ScrollView
      style={[styles.body, { maxHeight }, style]}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {children}
    </ScrollView>
  )
}

type AdminSheetHeaderCardProps = {
  title: string
  subtitle?: string
  initials: string
  accentBg?: string
  accentColor?: string
  badge?: { label: string; tone: "success" | "muted" | "danger" }
}

export function AdminSheetHeaderCard({
  title,
  subtitle,
  initials,
  accentBg = colors.primaryLight,
  accentColor = colors.primary,
  badge,
}: AdminSheetHeaderCardProps) {
  return (
    <View style={[styles.headerCard, { backgroundColor: accentBg, borderColor: accentBg }]}>
      <View style={[styles.headerAvatar, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerAvatarText, { color: accentColor }]}>{initials}</Text>
      </View>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {badge ? (
          <View
            style={[
              styles.headerBadge,
              badge.tone === "success" && styles.headerBadgeSuccess,
              badge.tone === "danger" && styles.headerBadgeDanger,
              badge.tone === "muted" && styles.headerBadgeMuted,
            ]}
          >
            <Text
              style={[
                styles.headerBadgeText,
                badge.tone === "success" && styles.headerBadgeTextSuccess,
                badge.tone === "danger" && styles.headerBadgeTextDanger,
                badge.tone === "muted" && styles.headerBadgeTextMuted,
              ]}
            >
              {badge.label}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

type AdminSheetInfoCardProps = {
  children: React.ReactNode
}

export function AdminSheetInfoCard({ children }: AdminSheetInfoCardProps) {
  return <View style={styles.infoCard}>{children}</View>
}

type AdminSheetDetailRowProps = {
  label: string
  value: string
  last?: boolean
}

export function AdminSheetDetailRow({ label, value, last }: AdminSheetDetailRowProps) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

type AdminSheetSectionTitleProps = {
  title: string
}

export function AdminSheetSectionTitle({ title }: AdminSheetSectionTitleProps) {
  return <Text style={styles.sectionTitle}>{title}</Text>
}

type AdminSheetMenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  danger?: boolean
  last?: boolean
}

export function AdminSheetMenuItem({ icon, label, onPress, danger, last }: AdminSheetMenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        !last && styles.menuItemBorder,
        pressed && styles.menuItemPressed,
      ]}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  )
}

type AdminSheetMenuCardProps = {
  children: React.ReactNode
}

export function AdminSheetMenuCard({ children }: AdminSheetMenuCardProps) {
  return <View style={styles.menuCard}>{children}</View>
}

type AdminSheetPickRowProps = {
  label: string
  selected?: boolean
  onPress: () => void
}

export function AdminSheetPickRow({ label, selected, onPress }: AdminSheetPickRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickRow,
        selected && styles.pickRowActive,
        pressed && styles.pickRowPressed,
      ]}
    >
      <Text style={[styles.pickText, selected && styles.pickTextActive]}>{label}</Text>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
    </Pressable>
  )
}

type AdminSheetPrimaryButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
}

export function AdminSheetPrimaryButton({ label, onPress, disabled }: AdminSheetPrimaryButtonProps) {
  return (
    <Pressable
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  )
}

type AdminSheetListItemProps = {
  label: string
}

export function AdminSheetListItem({ label }: AdminSheetListItemProps) {
  return (
    <View style={styles.listItem}>
      <View style={styles.listBullet} />
      <Text style={styles.listItemText}>{label}</Text>
    </View>
  )
}

export const adminSheetStyles = StyleSheet.create({
  previewCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.card,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBody: { flex: 1, minWidth: 0 },
  previewTitle: { ...typography.label, color: colors.text },
  previewMessage: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4 },
  previewMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
  pickerList: { gap: spacing.xs },
})

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
  },
  headerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    ...typography.label,
    fontSize: 18,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { ...typography.label, color: colors.text, fontSize: 16 },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  headerBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  headerBadgeSuccess: { backgroundColor: colors.successBg },
  headerBadgeDanger: { backgroundColor: colors.errorBg },
  headerBadgeMuted: { backgroundColor: colors.borderLight },
  headerBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  headerBadgeTextSuccess: { color: colors.success },
  headerBadgeTextDanger: { color: colors.error },
  headerBadgeTextMuted: { color: colors.textSecondary },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...shadow.card,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: { ...typography.caption, color: colors.textMuted, flex: 1 },
  detailValue: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
    flex: 1.2,
    textAlign: "right",
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    ...shadow.card,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  menuItemPressed: { backgroundColor: colors.background },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconDanger: { backgroundColor: colors.errorBg },
  menuLabel: { ...typography.body, color: colors.text, flex: 1 },
  menuLabelDanger: { color: colors.error },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  pickRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pickRowPressed: { opacity: 0.92 },
  pickText: { ...typography.body, color: colors.text, flex: 1 },
  pickTextActive: { color: colors.primary, fontWeight: "600" },
  primaryBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...typography.label, color: "#fff" },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  listBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    marginLeft: 2,
  },
  listItemText: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
})

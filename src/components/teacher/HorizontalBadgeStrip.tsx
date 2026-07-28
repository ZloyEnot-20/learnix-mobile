import React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherColors } from "../../theme/teacher-tokens"

export type BadgeStripItem = {
  id: string
  label: string
  sublabel?: string
  icon?: string
  bg?: string
  color?: string
}

type HorizontalBadgeStripProps = {
  items: BadgeStripItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  emptyText?: string
  /** Scroll bleeds to screen edges; first/last items align with screen padding. */
  edgeToEdge?: boolean
  /** Keeps sublabel row height to avoid layout shift when counts appear. */
  reserveSublabel?: boolean
}

function hasVisualMeta(item: BadgeStripItem): boolean {
  return Boolean(item.icon && item.bg && item.color)
}

export function HorizontalBadgeStrip({
  items,
  selectedId,
  onSelect,
  emptyText = "Nothing to show",
  edgeToEdge = false,
  reserveSublabel = false,
}: HorizontalBadgeStripProps) {
  if (items.length === 0) {
    return (
      <View style={[styles.emptyWrap, edgeToEdge && styles.edgeWrap]}>
        <Text style={[styles.emptyText, edgeToEdge && styles.emptyTextEdge]}>{emptyText}</Text>
      </View>
    )
  }

  const strip = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, edgeToEdge && styles.scrollEdge]}
    >
      {items.map((item) => {
        const active = item.id === selectedId
        const colorful = hasVisualMeta(item)

        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.badge,
              colorful && styles.badgeColorful,
              colorful && {
                backgroundColor: item.bg,
                borderColor: active ? item.color : "transparent",
              },
              !colorful && active && styles.badgeActive,
              pressed && styles.pressed,
            ]}
          >
            {colorful ? (
              <>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={item.color}
                  />
                </View>
                <View style={styles.textCol}>
                  <Text
                    style={[styles.badgeLabel, { color: item.color, fontWeight: active ? "800" : "600" }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.sublabel != null ? (
                    <Text
                      style={[styles.badgeSub, { color: item.color, opacity: 0.85 }]}
                      numberOfLines={1}
                    >
                      {item.sublabel}
                    </Text>
                  ) : reserveSublabel ? (
                    <Text
                      style={[styles.badgeSub, styles.badgeSubReserved, { color: item.color }]}
                      numberOfLines={1}
                    >
                      {" "}
                    </Text>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.badgeLabel, active && styles.badgeLabelActive]} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.sublabel ? (
                  <Text style={[styles.badgeSub, active && styles.badgeSubActive]} numberOfLines={1}>
                    {item.sublabel}
                  </Text>
                ) : null}
              </>
            )}
          </Pressable>
        )
      })}
    </ScrollView>
  )

  if (edgeToEdge) {
    return <View style={styles.edgeWrap}>{strip}</View>
  }

  return strip
}

const styles = StyleSheet.create({
  edgeWrap: {
    marginHorizontal: -spacing.screen,
  },
  scroll: {
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  scrollEdge: {
    paddingHorizontal: spacing.screen,
  },
  badge: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: spacing.sm,
    alignItems: "center",
    minWidth: 56,
  },
  badgeColorful: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: "transparent",
    minWidth: 0,
  },
  badgeActive: {
    backgroundColor: teacherColors.accentLight,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  textCol: {
    minWidth: 0,
    paddingRight: 4,
  },
  badgeLabel: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
  },
  badgeLabelActive: {
    fontWeight: "800",
    color: teacherColors.accentDark,
  },
  badgeSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
    minHeight: 12,
  },
  badgeSubReserved: {
    opacity: 0,
  },
  badgeSubActive: {
    color: teacherColors.accentDark,
    fontWeight: "600",
  },
  emptyWrap: {
    paddingBottom: spacing.xs,
  },
  emptyTextEdge: {
    paddingHorizontal: spacing.screen,
  },
  emptyText: { ...typography.caption, color: colors.textMuted },
  pressed: { opacity: 0.88 },
})

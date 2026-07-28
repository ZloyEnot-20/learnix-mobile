import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, radius, typography } from "../../theme/tokens"
import { teacherShadow } from "../../theme/teacher-tokens"

type TeacherStatCardProps = {
  label: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
  iconBg: string
  iconColor: string
  accent?: string
  tall?: boolean
  onPress?: () => void
}

export function TeacherStatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  accent,
  tall,
  onPress,
}: TeacherStatCardProps) {
  const content = (
    <>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        {onPress ? (
          <Ionicons name="arrow-up-outline" size={14} color={colors.textMuted} style={styles.arrow} />
        ) : null}
      </View>
      <Text style={[styles.value, tall && styles.valueTall, accent ? { color: accent } : null]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          teacherShadow.card,
          tall && styles.cardTall,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    )
  }

  return <View style={[styles.card, teacherShadow.card, tall && styles.cardTall]}>{content}</View>
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    minHeight: 100,
  },
  cardTall: { minHeight: 148 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { transform: [{ rotate: "45deg" }] },
  value: { ...typography.h3, color: colors.text, marginTop: 10 },
  valueTall: { fontSize: 28, lineHeight: 34 },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
})

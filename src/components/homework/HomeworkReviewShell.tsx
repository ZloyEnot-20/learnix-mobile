import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { BackButton } from "../ui/BackButton"
import type { Subject } from "../../types/domain"
import { colors, radius, spacing, subjectColors, typography } from "../../theme/tokens"

const SUBJECT_ICONS: Record<Subject, keyof typeof Ionicons.glyphMap> = {
  reading: "book-outline",
  listening: "headset-outline",
  writing: "create-outline",
  speaking: "mic-outline",
  grammar: "school-outline",
  vocabulary: "library-outline",
}

interface HomeworkReviewShellProps {
  title: string
  subject?: Subject
  children: React.ReactNode
}

export function HomeworkReviewShell({
  title,
  subject = "grammar",
  children,
}: HomeworkReviewShellProps) {
  const router = useRouter()
  const accent = subjectColors[subject] ?? colors.primary
  const icon = SUBJECT_ICONS[subject]
  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1)

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backBtn} />
        <View style={styles.headerText}>
          <View style={styles.subjectRow}>
            <Ionicons name={icon} size={14} color={accent} />
            <Text style={[styles.subjectLabel, { color: accent }]}>{subjectLabel}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { marginTop: 2 },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  subjectLabel: { fontSize: 13, fontWeight: "600" },
  title: { ...typography.h3, fontSize: 22, lineHeight: 28, color: colors.text },
})


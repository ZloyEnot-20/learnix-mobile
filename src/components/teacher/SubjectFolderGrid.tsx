import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { AssignFolder } from "../../theme/teacher-tokens"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { subjectFolderMeta, teacherShadow } from "../../theme/teacher-tokens"

type SubjectFolderGridProps = {
  subjects: AssignFolder[]
  counts?: Partial<Record<AssignFolder, number>>
  selected?: AssignFolder | null
  onSelect: (subject: AssignFolder) => void
  columns?: 2
}

export function SubjectFolderGrid({
  subjects,
  counts,
  selected,
  onSelect,
}: SubjectFolderGridProps) {
  return (
    <View style={styles.grid}>
      {subjects.map((subject) => {
        const meta = subjectFolderMeta[subject] ?? {
          label: subject,
          icon: "folder",
          bg: colors.primaryLight,
          color: colors.primary,
        }
        const active = selected === subject
        const count = counts?.[subject] ?? 0
        return (
          <Pressable
            key={subject}
            onPress={() => onSelect(subject)}
            style={({ pressed }) => [
              styles.folder,
              teacherShadow.card,
              active && styles.folderActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
              <Ionicons
                name={meta.icon as keyof typeof Ionicons.glyphMap}
                size={26}
                color={meta.color}
              />
            </View>
            <Text style={styles.folderLabel}>{meta.label}</Text>
            {count > 0 ? (
              <View style={[styles.countBadge, { backgroundColor: meta.color }]}>
                <Text style={styles.countText}>{count > 99 ? "99+" : count}</Text>
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  folder: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  folderActive: {
    borderColor: colors.text,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  folderLabel: { ...typography.label, color: colors.text, textAlign: "center" },
  countBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countText: { fontSize: 10, fontWeight: "800", color: "#fff" },
})

import React from "react"
import { Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, radius, spacing, typography, subjectColors } from "../theme/tokens"

const UNAVAILABLE_MESSAGE =
  "IELTS mock test will be available when your teacher assigns it to you."

const IELTS_SECTIONS = [
  { id: "reading", label: "Reading", icon: "book-outline" as const },
  { id: "listening", label: "Listening", icon: "headset-outline" as const },
  { id: "writing", label: "Writing", icon: "create-outline" as const },
  { id: "speaking", label: "Speaking", icon: "mic-outline" as const },
]

export function IeltsMockTestBanner() {
  const showInfo = () => {
    Alert.alert("IELTS Mock Test", UNAVAILABLE_MESSAGE)
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>IELTS Mock Test</Text>
      <Pressable
        onPress={showInfo}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="clipboard-outline" size={22} color="#93C5FD" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headline}>Full practice exam</Text>
            <Text style={styles.subline}>All four sections · timed format</Text>
          </View>
        </View>

        <View style={styles.sectionsRow}>
          {IELTS_SECTIONS.map((section) => (
            <View key={section.id} style={styles.sectionItem}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: (subjectColors[section.id] ?? colors.border) + "40" },
                ]}
              >
                <Ionicons
                  name={section.icon}
                  size={18}
                  color={subjectColors[section.id] ?? colors.text}
                />
              </View>
              <Text style={styles.sectionLabel}>{section.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.unavailableBadge}>
            <Ionicons name="lock-closed" size={12} color="rgba(226, 232, 240, 0.85)" />
            <Text style={styles.unavailableText}>Unavailable</Text>
          </View>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="rgba(226, 232, 240, 0.55)"
          />
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: "#1A2744",
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardPressed: { opacity: 0.94 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headline: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    lineHeight: 21,
  },
  subline: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(226, 232, 240, 0.72)",
  },
  sectionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(241, 245, 249, 0.88)",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  unavailableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.28)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  unavailableText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(226, 232, 240, 0.85)",
  },
})

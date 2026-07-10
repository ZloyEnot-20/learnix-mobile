import React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { IELTS_SKILLS } from "../../src/types/ielts"
import { BackButton } from "../../src/components/ui/BackButton"
import { colors, radius, shadow, spacing, subjectColors, typography } from "../../src/theme/tokens"

export default function IeltsHubScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerText}>
            <Text style={styles.title}>IELTS Practice</Text>
            <Text style={styles.subtitle}>Train all four exam skills</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {IELTS_SKILLS.map((skill) => {
            const accent = subjectColors[skill.id] ?? colors.primary
            const available = skill.id === "reading" || skill.id === "listening"
            return (
              <Pressable
                key={skill.id}
                disabled={!available}
                onPress={() => router.push(`/ielts/${skill.id}` as never)}
                style={({ pressed }) => [
                  styles.card,
                  !available && styles.cardDisabled,
                  pressed && available && styles.cardPressed,
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
                  <Ionicons name={skill.icon} size={22} color={accent} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{skill.label}</Text>
                    {!available ? (
                      <View style={styles.soonBadge}>
                        <Text style={styles.soonText}>Soon</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    )}
                  </View>
                  <Text style={styles.cardDesc}>{skill.description}</Text>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={[styles.note, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.noteText}>
            Reading and listening practice use real IELTS-style tasks and question types.
          </Text>
        </View>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySm, color: colors.textSecondary },
  list: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.94 },
  cardDisabled: { opacity: 0.62 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  soonBadge: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soonText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  noteText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
})

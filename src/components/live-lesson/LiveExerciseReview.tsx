import React from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { LiveStudentProgress } from "../../lib/books/types"
import { formatAnswerKeyList } from "../../lib/books/gap-text"
import { colors, radius, spacing, typography } from "../../theme/tokens"

type ReviewProps = {
  unitNumber: number | null
  exerciseId: string
  answerKey: unknown
  me?: LiveStudentProgress | null
}

/**
 * Shown to students after the teacher finishes/closes the current exercise.
 */
export function LiveExerciseReview({ unitNumber, exerciseId, answerKey, me }: ReviewProps) {
  const detail = me?.scoreDetail
  const correct = detail?.correct ?? 0
  const total =
    detail?.total && detail.total > 0
      ? detail.total
      : formatAnswerKeyList(answerKey).length || 0
  const mistakes = Math.max(0, total - correct)
  const pct =
    me?.score != null && Number.isFinite(me.score)
      ? Math.round(me.score)
      : total > 0
        ? Math.round((100 * correct) / total)
        : null

  const items = detail?.items?.length
    ? detail.items
    : formatAnswerKeyList(answerKey).map((expected, i) => ({
        id: String(i + 1),
        label: `#${i + 1}`,
        given: "—",
        expected,
        ok: false,
      }))

  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="checkmark-done" size={28} color="#047857" />
        </View>
        <Text style={styles.heroTitle}>Exercise finished</Text>
        <Text style={styles.heroSub}>
          Unit {unitNumber ?? "—"} · Ex {exerciseId}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{pct != null ? `${pct}%` : "—"}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: "#047857" }]}>{correct}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: "#B91C1C" }]}>{mistakes}</Text>
          <Text style={styles.statLabel}>Mistakes</Text>
        </View>
      </View>

      {!me?.scoreDetail && !me?.answers ? (
        <Text style={styles.note}>You didn’t submit answers — correct answers are below.</Text>
      ) : null}

      <Text style={styles.sectionTitle}>Answers</Text>
      {items.length === 0 ? (
        <Text style={styles.note}>No graded answer key for this exercise.</Text>
      ) : (
      <View style={styles.list}>
        {items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.row,
              item.ok === true && styles.rowOk,
              item.ok === false && styles.rowBad,
            ]}
          >
            <View style={styles.rowHead}>
              <Text style={styles.rowLabel}>{item.label ?? item.id}</Text>
              {item.ok != null ? (
                <Ionicons
                  name={item.ok ? "checkmark-circle" : "close-circle"}
                  size={18}
                  color={item.ok ? "#047857" : "#B91C1C"}
                />
              ) : null}
            </View>
            {item.given && item.given !== "—" ? (
              <Text style={styles.rowMeta}>
                Yours: <Text style={styles.strong}>{item.given}</Text>
              </Text>
            ) : null}
            <Text style={styles.rowMeta}>
              Correct: <Text style={styles.strong}>{item.expected}</Text>
            </Text>
          </View>
        ))}
      </View>
      )}

      <Text style={styles.footerHint}>Wait for your teacher to open the next exercise.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { alignItems: "center", gap: 6, paddingVertical: spacing.md },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { ...typography.h3, color: colors.text },
  heroSub: { ...typography.caption, color: colors.textMuted },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  statValue: { ...typography.h3, color: colors.text, fontWeight: "700" },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  note: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  sectionTitle: { ...typography.label, color: colors.text, fontWeight: "700", marginTop: spacing.sm },
  list: { gap: spacing.sm },
  row: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: 4,
  },
  rowOk: { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" },
  rowBad: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { ...typography.label, color: colors.text, fontWeight: "600" },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  strong: { color: colors.text, fontWeight: "700" },
  footerHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
})

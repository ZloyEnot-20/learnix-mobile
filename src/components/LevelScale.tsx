import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { studentsApi } from "../lib/api"
import {
  CEFR_LEVEL_REQUIREMENT,
  CEFR_ORDER,
  tierForLevel,
  TIERS,
  type StudentLevel,
} from "../types/gamification"
import { colors } from "../theme/colors"

interface LevelScaleProps {
  studentId: string
  compact?: boolean
}

export function LevelScale({ studentId, compact = false }: LevelScaleProps) {
  const [data, setData] = useState<StudentLevel | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    studentsApi
      .level(studentId)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loading) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!data) return null

  const tier = tierForLevel(data.level)
  const progressPct = Math.round((data.pointsIntoLevel / data.pointsForNextLevel) * 100)

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
            <Text style={styles.tierEmoji}>🏆</Text>
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.levelName}>{data.levelName}</Text>
              <Pressable onPress={() => setShowAll(true)}>
                <Text style={styles.allLevels}>All levels ›</Text>
              </Pressable>
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.tierPill, { backgroundColor: tier.color + "22" }]}>
                <Text style={[styles.tierLabel, { color: tier.color }]}>{data.tierLabel}</Text>
              </View>
              <Text style={styles.points}>
                {data.totalPoints.toLocaleString()} pts · {data.pointsToNextLevel} to lvl{" "}
                {data.level + 1}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: tier.barColor }]}
          />
        </View>

        {!compact && (
          <View style={styles.cefrSection}>
            <Text style={styles.cefrTitle}>UNLOCKED LEVELS</Text>
            <View style={styles.cefrRow}>
              {CEFR_ORDER.map((cefr) => {
                const required = CEFR_LEVEL_REQUIREMENT[cefr] ?? 1
                const unlocked = data.unlockedCefrLevels.includes(cefr)
                return (
                  <View
                    key={cefr}
                    style={[styles.cefrPill, unlocked ? styles.cefrUnlocked : styles.cefrLocked]}
                  >
                    <Text style={[styles.cefrText, unlocked ? styles.cefrTextUnlocked : styles.cefrTextLocked]}>
                      {!unlocked ? "🔒 " : ""}
                      {cefr}
                      {!unlocked ? ` · Lvl ${required}` : ""}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}
      </View>

      <Modal visible={showAll} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All levels</Text>
            <Pressable onPress={() => setShowAll(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {TIERS.map((t) => {
              const isCurrent = t.id === tier.id
              const isPassed = data.level > t.maxLevel
              const range =
                t.maxLevel === Number.POSITIVE_INFINITY
                  ? `Lvl ${t.minLevel}+`
                  : `Lvl ${t.minLevel}–${t.maxLevel}`
              return (
                <View key={t.id} style={[styles.tierCard, isCurrent && styles.tierCardCurrent]}>
                  <View style={[styles.tierIcon, { backgroundColor: t.color }]}>
                    <Text style={styles.tierEmoji}>🏆</Text>
                  </View>
                  <View style={styles.tierInfo}>
                    <View style={styles.tierTitleRow}>
                      <Text style={styles.tierName}>{t.label}</Text>
                      <Text style={styles.tierRange}>{range}</Text>
                      {isCurrent && <Text style={styles.youAreHere}>You are here</Text>}
                      {isPassed && <Text>✅</Text>}
                    </View>
                    <Text style={styles.tierTagline}>{t.tagline}</Text>
                    <Text style={styles.tierDesc}>{t.description}</Text>
                    <View style={styles.perksRow}>
                      {t.perks.map((p) => (
                        <View key={p} style={styles.perkPill}>
                          <Text style={styles.perkText}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  loading: {
    alignItems: "center",
    paddingVertical: 24,
  },
  header: {
    flexDirection: "row",
    gap: 12,
  },
  tierBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tierEmoji: { fontSize: 24 },
  headerText: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  allLevels: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.indigo,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  tierPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  points: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  cefrSection: { marginTop: 16 },
  cefrTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  cefrRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  cefrPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cefrUnlocked: { backgroundColor: "#D1FAE5" },
  cefrLocked: { backgroundColor: "#F1F5F9" },
  cefrText: { fontSize: 11, fontWeight: "600" },
  cefrTextUnlocked: { color: "#047857" },
  cefrTextLocked: { color: colors.textMuted },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 56,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  closeBtn: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  modalContent: { padding: 16, gap: 12 },
  tierCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tierCardCurrent: {
    borderColor: colors.indigo,
    backgroundColor: "#EEF2FF",
  },
  tierIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tierInfo: { flex: 1 },
  tierTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  tierName: { fontSize: 14, fontWeight: "700", color: colors.text },
  tierRange: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  youAreHere: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: colors.indigo,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tierTagline: { fontSize: 12, fontWeight: "500", color: colors.text, marginTop: 4 },
  tierDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  perksRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  perkPill: {
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  perkText: { fontSize: 11, color: colors.textSecondary },
})

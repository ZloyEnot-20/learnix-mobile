import React, { useEffect, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { studentsApi } from "../lib/api"
import { TierBadge } from "./TierBadge"
import { LevelScaleSkeleton } from "./skeletons/Layouts"
import {
  CEFR_LEVEL_REQUIREMENT,
  CEFR_ORDER,
  tierForLevel,
  TIERS,
  type StudentLevel,
  type TierMeta,
} from "../types/gamification"
import { colors, radius, shadow, spacing, typography } from "../theme/tokens"

function TierModalCard({
  tier,
  isCurrent,
  isPassed,
  range,
}: {
  tier: TierMeta
  isCurrent: boolean
  isPassed: boolean
  range: string
}) {
  const isMaster = tier.id === "master"

  const card = (
    <View
      style={[
        styles.tierCard,
        isMaster && styles.tierCardMaster,
        isCurrent && (isMaster ? styles.tierCardMasterCurrent : styles.tierCardCurrent),
      ]}
    >
      <TierBadge tierId={tier.id} size={56} />
      <View style={styles.tierInfo}>
        <View style={styles.tierTitleRow}>
          {isMaster ? (
            <Ionicons name="flame" size={15} color="#EA580C" style={styles.masterFlame} />
          ) : null}
          <Text style={[styles.tierName, isMaster && styles.tierNameMaster]}>{tier.label}</Text>
          <Text style={[styles.tierRange, isMaster && styles.tierRangeMaster]}>{range}</Text>
          {isCurrent && <Text style={styles.youAreHere}>You are here</Text>}
          {isPassed && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
        </View>
        <Text style={[styles.tierTagline, isMaster && styles.tierTaglineMaster]}>{tier.tagline}</Text>
        <Text style={styles.tierDesc}>{tier.description}</Text>
        <View style={styles.perksRow}>
          {tier.perks.map((p) => (
            <View key={p} style={[styles.perkPill, isMaster && styles.perkPillMaster]}>
              <Text style={[styles.perkText, isMaster && styles.perkTextMaster]}>{p}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )

  if (!isMaster) return card

  return (
    <View style={styles.tierCardMasterGlow}>
      <View style={styles.tierCardMasterRing}>{card}</View>
    </View>
  )
}

interface LevelScaleProps {
  studentId: string
  compact?: boolean
  levelData?: StudentLevel | null
  levelLoading?: boolean
}

export function LevelScale({
  studentId,
  compact = false,
  levelData,
  levelLoading,
}: LevelScaleProps) {
  const [data, setData] = useState<StudentLevel | null>(levelData ?? null)
  const [loading, setLoading] = useState(levelLoading ?? levelData === undefined)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (levelData !== undefined) {
      setData(levelData)
      setLoading(levelLoading ?? false)
      return
    }

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
  }, [studentId, levelData, levelLoading])

  if (loading) {
    return <LevelScaleSkeleton compact={compact} />
  }

  if (!data) return null

  const tier = tierForLevel(data.level)
  const progressPct = Math.round((data.pointsIntoLevel / data.pointsForNextLevel) * 100)

  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.sectionLabel}>
            <View style={styles.sectionIcon}>
              <Ionicons name="trophy-outline" size={14} color={colors.indigo} />
            </View>
            <Text style={styles.sectionTitle}>Your level</Text>
          </View>
          <Pressable onPress={() => setShowAll(true)} hitSlop={8}>
            <Text style={styles.allLevels}>All levels ›</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <TierBadge tierId={tier.id} size={48} />
          <View style={styles.headerText}>
            <Text style={styles.levelName}>{data.levelName}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.tierPill, { backgroundColor: tier.color + "22" }]}>
                <Text style={[styles.tierLabel, { color: tier.color }]}>{data.tierLabel}</Text>
              </View>
              <Text style={styles.points}>{data.totalPoints.toLocaleString()} pts</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: tier.barColor }]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {data.pointsIntoLevel.toLocaleString()}/{data.pointsForNextLevel.toLocaleString()}
          </Text>
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
                    <View style={styles.cefrPillContent}>
                      {!unlocked && (
                        <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
                      )}
                      <Text style={[styles.cefrText, unlocked ? styles.cefrTextUnlocked : styles.cefrTextLocked]}>
                        {cefr}
                        {!unlocked ? ` · Lvl ${required}` : ""}
                      </Text>
                    </View>
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
            <Pressable
              onPress={() => setShowAll(false)}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {TIERS.map((t) => {
              const isCurrent = t.id === tier.id
              const isPassed = data.level > t.maxLevel
              const range =
                t.maxLevel === Number.POSITIVE_INFINITY
                  ? `Lvl ${t.minLevel}+`
                  : `Lvl ${t.minLevel}–${t.maxLevel}`
              return (
                <TierModalCard
                  key={t.id}
                  tier={t}
                  isCurrent={isCurrent}
                  isPassed={isPassed}
                  range={range}
                />
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
    borderRadius: radius.card,
    padding: spacing.section,
    gap: spacing.md,
    ...shadow.card,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 17,
    color: colors.text,
  },
  header: {
    flexDirection: "row",
    gap: 12,
  },
  headerText: { flex: 1, gap: 4 },
  levelName: {
    ...typography.label,
    fontSize: 16,
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
  progressSection: {
    gap: 6,
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "right",
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
  cefrPillContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 15, fontWeight: "700", color: colors.text, lineHeight: 20 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
  },
  closeBtnPressed: { opacity: 0.7 },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 24, gap: 10 },
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
  tierCardMasterGlow: {
    borderRadius: 18,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  tierCardMasterRing: {
    borderRadius: 17,
    padding: 2,
    backgroundColor: "#F97316",
  },
  tierCardMaster: {
    borderWidth: 0,
    backgroundColor: "#FFF7ED",
  },
  tierCardMasterCurrent: {
    backgroundColor: "#FFEDD5",
  },
  masterFlame: {
    marginRight: -2,
  },
  tierNameMaster: {
    color: "#9A3412",
  },
  tierRangeMaster: {
    color: "#C2410C",
    backgroundColor: "#FFEDD5",
  },
  tierTaglineMaster: {
    color: "#9A3412",
    fontWeight: "600",
  },
  perkPillMaster: {
    backgroundColor: "#FFEDD5",
  },
  perkTextMaster: {
    color: "#C2410C",
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

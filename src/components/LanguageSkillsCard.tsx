import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { studentsApi } from "../lib/api"
import {
  buildSkillDisplayRows,
  CEFR_LEVEL_COLORS,
  cefrBackground,
  learnixLevelToCefr,
} from "../lib/language-profile"
import type { StudentLanguageProfile } from "../types/language-profile"
import { LanguageSkillsSkeleton } from "./skeletons/Layouts"
import { colors, radius, shadow, spacing } from "../theme/tokens"

interface LanguageSkillsCardProps {
  studentId: string
  profile?: StudentLanguageProfile | null
  loading?: boolean
  /** When true, skills stay open (no collapse toggle). */
  alwaysExpanded?: boolean
  /** Override the header subtitle. */
  subtitle?: string
}

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const MOBILE_COLLAPSE_MAX_WIDTH = 520

function CefrBadge({ level }: { level: string }) {
  const color = CEFR_LEVEL_COLORS[level] ?? colors.textMuted
  return (
    <View style={[styles.cefrBadge, { backgroundColor: cefrBackground(level) }]}>
      <Text style={[styles.cefrText, { color }]}>{level}</Text>
    </View>
  )
}

function EmptyBadge() {
  return (
    <View style={styles.emptyBadge}>
      <Text style={styles.emptyText}>—</Text>
    </View>
  )
}

export function LanguageSkillsCard({
  studentId,
  profile: profileProp,
  loading: loadingProp,
  alwaysExpanded = false,
  subtitle: subtitleProp,
}: LanguageSkillsCardProps) {
  const isMobile = !alwaysExpanded && SCREEN_WIDTH <= MOBILE_COLLAPSE_MAX_WIDTH
  const [profile, setProfile] = useState<StudentLanguageProfile | null>(profileProp ?? null)
  const [loading, setLoading] = useState(loadingProp ?? profileProp === undefined)
  const [collapsed, setCollapsed] = useState(isMobile)
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const expandAnim = useRef(new Animated.Value(alwaysExpanded || !isMobile ? 1 : 0)).current

  const load = useCallback(
    async (force?: boolean) => {
      setLoading(true)
      try {
        const data = await studentsApi.languageProfile(studentId, { force })
        setProfile(data)
      } catch {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    },
    [studentId],
  )

  useEffect(() => {
    if (profileProp !== undefined) {
      setProfile(profileProp)
      setLoading(Boolean(loadingProp))
      return
    }
    void load()
  }, [profileProp, loadingProp, load])

  const rows = useMemo(() => buildSkillDisplayRows(profile), [profile])
  const hasAnyData = useMemo(() => rows.some((row) => row.hasData), [rows])
  const overallCefr =
    profile && profile.overall.confidence > 0
      ? learnixLevelToCefr(profile.overall.level)
      : null

  useEffect(() => {
    if (!isMobile) setCollapsed(false)
    Animated.timing(expandAnim, {
      toValue: !isMobile || !collapsed ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [collapsed, expandAnim, isMobile])

  const chevronRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  })

  const contentAnimatedStyle = useMemo(() => {
    if (!isMobile) {
      return null
    }

    const height =
      contentHeight == null
        ? collapsed
          ? 0
          : undefined
        : expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, contentHeight],
          })

    return {
      height,
      opacity: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      overflow: "hidden" as const,
    }
  }, [collapsed, contentHeight, expandAnim, isMobile])

  const renderContent = () => (
    <>
      <View style={styles.divider} />
      <View style={styles.rows}>
        {rows.map((row, index) => (
          <View
            key={row.key}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
          >
            <View style={styles.rowLabel}>
              <Ionicons
                name={row.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={row.hasData ? colors.textSecondary : colors.textMuted}
              />
              <Text style={[styles.skillName, !row.hasData && styles.skillNameMuted]}>
                {row.label}
              </Text>
            </View>
            {row.cefr ? <CefrBadge level={row.cefr} /> : <EmptyBadge />}
          </View>
        ))}
      </View>
    </>
  )

  const subtitle =
    subtitleProp ??
    (profile?.ieltsEstimation?.estimatedBand
      ? `Estimated IELTS ${profile.ieltsEstimation.estimatedBand.toFixed(1)}`
      : hasAnyData
        ? "Based on practice & homework"
        : "No skill data yet")

  if (loading) {
    return <LanguageSkillsSkeleton />
  }

  const CardWrap = isMobile ? Pressable : View

  return (
    <CardWrap
      style={styles.card}
      onPress={isMobile ? () => setCollapsed((v) => !v) : undefined}
      disabled={!isMobile}
      accessibilityRole={isMobile ? "button" : undefined}
      accessibilityLabel={isMobile ? "Toggle language skills" : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="language-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Language skills</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {profile?.ieltsEstimation?.estimatedBand != null ? (
            <View style={[styles.cefrBadge, { backgroundColor: "#EEF2FF" }]}>
              <Text style={[styles.cefrText, { color: "#4338CA" }]}>
                {profile.ieltsEstimation.estimatedBand.toFixed(1)}
              </Text>
            </View>
          ) : overallCefr ? (
            <CefrBadge level={overallCefr} />
          ) : null}
        </View>
      </View>

      {isMobile ? (
        <Animated.View style={contentAnimatedStyle ?? undefined}>{renderContent()}</Animated.View>
      ) : (
        renderContent()
      )}

      {isMobile ? (
        <View style={styles.footerStripe} pointerEvents="none">
          <Animated.View style={[styles.footerChevron, { transform: [{ rotate: chevronRotate }] }]}>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </Animated.View>
        </View>
      ) : null}

      <View
        pointerEvents="none"
        style={styles.contentMeasure}
        onLayout={(e) => {
          const h = Math.ceil(e.nativeEvent.layout.height)
          if (h > 0 && contentHeight !== h) setContentHeight(h)
        }}
      >
        {isMobile ? renderContent() : null}
      </View>
    </CardWrap>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 2,
  },
  footerStripe: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.md,
    marginBottom: -spacing.md,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    borderLeftWidth: 6,
    borderLeftColor: colors.primary,
  },
  footerChevron: {
    position: "absolute",
    top: 3,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  contentMeasure: {
    position: "absolute",
    top: -10000,
    left: 0,
    opacity: 0,
    zIndex: -1,
  },
  rows: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  rowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skillName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: 0.1,
  },
  skillNameMuted: {
    color: colors.textSecondary,
  },
  cefrBadge: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  cefrText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  emptyBadge: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
})

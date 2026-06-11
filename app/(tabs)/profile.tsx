import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useNavigation, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { requestNotificationsRefresh } from "../../src/lib/notifications-refresh"
import { useAuth } from "../../src/context/AuthContext"
import { ProfileAvatar } from "../../src/components/ProfileAvatar"
import { ProfileSkeleton } from "../../src/components/skeletons/Layouts"
import { studentsApi, orgApi, testResultsApi, uploadsApi } from "../../src/lib/api"
import { ApiError } from "../../src/lib/api-client"
import {
  buildLearningProgressSummary,
  getLearningProgress,
} from "../../src/lib/learned-vocabulary"
import {
  clearSpeakingAudioCache,
  formatSpeakingAudioCacheSize,
  getSpeakingAudioCacheSizeBytes,
} from "../../src/lib/speaking-audio-cache"
import { clearImageCache } from "../../src/lib/image-cache"
import type { StudentLevel } from "../../src/types/gamification"
import { colors, radius, shadow, spacing } from "../../src/theme/tokens"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const HERO_HEIGHT = 118
const COLLAPSE_DISTANCE = 80
const HERO_BLOCK_HEIGHT = HERO_HEIGHT + spacing.lg
const HERO_AVATAR_SIZE = 64
const HEADER_AVATAR_SIZE = 32
const HEADER_REVEAL_START = COLLAPSE_DISTANCE * 0.5
const HEADER_REVEAL_END = COLLAPSE_DISTANCE * 0.9

type Achievement = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  iconBg: string
  iconColor: string
  unlocked: boolean
}

type SettingsItem = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  iconBg: string
  iconColor: string
  value?: string
  destructive?: boolean
  onPress: () => void
}

function formatStat(value: number | string | null | undefined): string {
  if (value == null) return "—"
  if (typeof value === "number") return value.toLocaleString()
  return value
}

function buildAchievements(data: {
  completedHomework: number
  wordsLearned: number
  level: number
  tier: string
  testsCount: number
  rank: number | null
}): Achievement[] {
  return [
    {
      id: "first_steps",
      label: "First Steps",
      icon: "medal-outline",
      iconBg: colors.warningBg,
      iconColor: colors.warning,
      unlocked: data.completedHomework > 0,
    },
    {
      id: "word_collector",
      label: "Word Collector",
      icon: "book-outline",
      iconBg: colors.primaryLight,
      iconColor: colors.primary,
      unlocked: data.wordsLearned >= 10,
    },
    {
      id: "level_up",
      label: "Level Up",
      icon: "flame-outline",
      iconBg: colors.successBg,
      iconColor: colors.success,
      unlocked: data.level >= 3,
    },
    {
      id: "tier_rise",
      label: "Tier Rise",
      icon: "ribbon-outline",
      iconBg: "#EDE9FE",
      iconColor: colors.indigo,
      unlocked: data.tier !== "bronze",
    },
    {
      id: "test_taker",
      label: "Test Taker",
      icon: "document-text-outline",
      iconBg: "#E0F2FE",
      iconColor: "#0369A1",
      unlocked: data.testsCount > 0,
    },
    {
      id: "top_ten",
      label: "Top Ten",
      icon: "moon-outline",
      iconBg: "#E0F7FE",
      iconColor: colors.brand,
      unlocked: data.rank != null && data.rank <= 10,
    },
  ]
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function AchievementBadge({ item }: { item: Achievement }) {
  return (
    <View style={styles.achievementItem}>
      <View
        style={[
          styles.achievementIcon,
          item.unlocked
            ? { backgroundColor: item.iconBg, borderColor: item.iconColor }
            : styles.achievementIconLocked,
        ]}
      >
        <Ionicons
          name={item.icon}
          size={22}
          color={item.unlocked ? item.iconColor : colors.textMuted}
        />
      </View>
      <Text
        style={[styles.achievementLabel, !item.unlocked && styles.achievementLabelLocked]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </View>
  )
}

function ProfileHeaderIdentity({
  name,
  avatarUrl,
  scrollY,
}: {
  name: string
  avatarUrl?: string | null
  scrollY: Animated.Value
}) {
  const opacity = scrollY.interpolate({
    inputRange: [HEADER_REVEAL_START, HEADER_REVEAL_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })
  const scale = scrollY.interpolate({
    inputRange: [HEADER_REVEAL_START, HEADER_REVEAL_END],
    outputRange: [0.9, 1],
    extrapolate: "clamp",
  })
  const translateY = scrollY.interpolate({
    inputRange: [HEADER_REVEAL_START, HEADER_REVEAL_END],
    outputRange: [8, 0],
    extrapolate: "clamp",
  })

  return (
    <Animated.View
      style={[
        styles.headerIdentity,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      <ProfileAvatar
        name={name}
        avatarUrl={avatarUrl}
        size={HEADER_AVATAR_SIZE}
      />
      <Text style={styles.headerName} numberOfLines={1}>
        {name}
      </Text>
    </Animated.View>
  )
}

function SettingsRow({ item, isLast }: { item: SettingsItem; isLast?: boolean }) {
  return (
    <Pressable
      style={[styles.settingsRow, !isLast && styles.settingsRowBorder]}
      onPress={item.onPress}
    >
      <View style={[styles.settingsIconWrap, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={18} color={item.iconColor} />
      </View>
      <Text style={[styles.settingsLabel, item.destructive && styles.settingsLabelDestructive]}>
        {item.label}
      </Text>
      <View style={styles.settingsRight}>
        {item.value ? <Text style={styles.settingsValue}>{item.value}</Text> : null}
        {!item.destructive ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        ) : null}
      </View>
    </Pressable>
  )
}

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuth()
  const router = useRouter()
  const navigation = useNavigation()
  const scrollY = useRef(new Animated.Value(0)).current
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null)
  const [groupName, setGroupName] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string | null>(null)
  const [wordsLearned, setWordsLearned] = useState(0)
  const [rank, setRank] = useState<number | null>(null)
  const [testsCount, setTestsCount] = useState(0)
  const [cacheSizeLabel, setCacheSizeLabel] = useState("0 KB")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const refreshCacheSize = useCallback(() => {
    setCacheSizeLabel(formatSpeakingAudioCacheSize())
  }, [])

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [ctx, level, leaderboard, progress, testResults] = await Promise.all([
        studentsApi.context(user.id),
        studentsApi.level(user.id),
        orgApi.leaderboard(),
        getLearningProgress(user.id),
        testResultsApi.list(),
      ])
      setGroupName(ctx.groupName)
      setTeacherName(ctx.teacherName)
      setStudentLevel(level)
      const me = leaderboard.find((entry) => entry.studentId === user.id)
      setRank(me?.rank ?? null)
      const summary = buildLearningProgressSummary(progress, new Map())
      setWordsLearned(summary.wordsLearned)
      setTestsCount(testResults.length)
    } catch {
      setGroupName(null)
      setTeacherName(null)
      setStudentLevel(null)
      setRank(null)
      setWordsLearned(0)
      setTestsCount(0)
    } finally {
      refreshCacheSize()
    }
  }, [user, refreshCacheSize])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  useFocusEffect(
    useCallback(() => {
      requestNotificationsRefresh()
      refreshCacheSize()
    }, [refreshCacheSize]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const achievements = useMemo(
    () =>
      buildAchievements({
        completedHomework: studentLevel?.breakdown.completedHomework ?? 0,
        wordsLearned,
        level: studentLevel?.level ?? 1,
        tier: studentLevel?.tier ?? "bronze",
        testsCount,
        rank,
      }),
    [studentLevel, wordsLearned, testsCount, rank],
  )

  const unlockedCount = achievements.filter((item) => item.unlocked).length

  const canUploadAvatar = !user?.avatarUrl

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout()
          router.replace("/login")
        },
      },
    ])
  }

  const handleAvatarUpload = async () => {
    if (!user || user.avatarUrl || avatarUploading) return

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        "Photo access",
        "Allow access to your photo library to set a profile photo.",
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })

    if (result.canceled || !result.assets[0]?.uri) return

    const asset = result.assets[0]
    setAvatarUploading(true)
    try {
      const mimeType = asset.mimeType ?? "image/jpeg"
      const { user: updatedUser } = await uploadsApi.avatar(asset.uri, mimeType)
      setUser(updatedUser)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not upload profile photo. Please try again."
      Alert.alert("Upload failed", message)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleClearCache = () => {
    const bytes = getSpeakingAudioCacheSizeBytes()
    if (bytes <= 0) {
      Alert.alert(
        "Cache",
        "Clear cached profile photos and other images? Voice recordings are already empty.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear images",
            style: "destructive",
            onPress: async () => {
              await clearImageCache()
              refreshCacheSize()
            },
          },
        ],
      )
      return
    }
    Alert.alert(
      "Clear cache",
      `Remove ${formatSpeakingAudioCacheSize()} of cached voice recordings and all cached images?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            clearSpeakingAudioCache()
            await clearImageCache()
            refreshCacheSize()
          },
        },
      ],
    )
  }

  const showSkeleton = loading || refreshing

  useLayoutEffect(() => {
    if (!user || showSkeleton) {
      navigation.setOptions({
        headerLeft: () => null,
        headerLeftContainerStyle: undefined,
      })
      return
    }

    navigation.setOptions({
      headerLeft: () => (
        <ProfileHeaderIdentity
          name={user.name}
          avatarUrl={user.avatarUrl}
          scrollY={scrollY}
        />
      ),
      headerLeftContainerStyle: { paddingLeft: spacing.screen },
    })
  }, [navigation, user, scrollY, showSkeleton])

  const heroContentOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE * 0.75],
    outputRange: [1, 0],
    extrapolate: "clamp",
  })
  const heroContentScale = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [1, 0.88],
    extrapolate: "clamp",
  })
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [0, -16],
    extrapolate: "clamp",
  })
  const heroEmailOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE * 0.4],
    outputRange: [1, 0],
    extrapolate: "clamp",
  })
  const contentLift = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [0, -HERO_BLOCK_HEIGHT],
    extrapolate: "clamp",
  })

  if (!user) return null

  const settingsItems: SettingsItem[] = [
    {
      id: "notifications",
      label: "Notifications",
      icon: "notifications-outline",
      iconBg: colors.warningBg,
      iconColor: colors.warning,
      onPress: () =>
        Alert.alert("Notifications", "Open the bell icon in the top-right corner of any tab."),
    },
    {
      id: "language",
      label: "Language & Goal",
      icon: "globe-outline",
      iconBg: colors.primaryLight,
      iconColor: colors.primary,
      value: studentLevel?.unlockedCefrLevels?.slice(-1)[0] ?? "A1",
      onPress: () =>
        Alert.alert(
          "Language & Goal",
          studentLevel?.unlockedCefrLevels?.length
            ? `Unlocked levels: ${studentLevel.unlockedCefrLevels.join(", ")}`
            : "Complete exercises to unlock higher CEFR levels.",
        ),
    },
    {
      id: "subscription",
      label: "Subscription",
      icon: "card-outline",
      iconBg: colors.successBg,
      iconColor: colors.success,
      value: user.isPremium ? "Premium" : "Free",
      onPress: () =>
        Alert.alert(
          "Subscription",
          user.isPremium
            ? "You have an active Premium subscription."
            : "You are on the Free plan. Contact your teacher for Premium access.",
        ),
    },
    {
      id: "account",
      label: "Account",
      icon: "person-circle-outline",
      iconBg: "#EDE9FE",
      iconColor: colors.indigo,
      onPress: () =>
        Alert.alert(
          "Account",
          [
            user.name,
            user.email,
            user.login ? `Login: ${user.login}` : null,
            groupName ? `Group: ${groupName}` : null,
            teacherName ? `Teacher: ${teacherName}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        ),
    },
    {
      id: "help",
      label: "Help & Support",
      icon: "help-circle-outline",
      iconBg: colors.borderLight,
      iconColor: colors.textSecondary,
      onPress: () =>
        Alert.alert(
          "Help & Support",
          teacherName
            ? `Contact your teacher (${teacherName}) or your school administrator for help.`
            : "Contact your school administrator for help.",
        ),
    },
    {
      id: "cache",
      label: "Cache",
      icon: "folder-outline",
      iconBg: "#E0F2FE",
      iconColor: "#0369A1",
      value: cacheSizeLabel,
      onPress: handleClearCache,
    },
    {
      id: "logout",
      label: "Log out",
      icon: "log-out-outline",
      iconBg: colors.errorBg,
      iconColor: colors.error,
      destructive: true,
      onPress: handleLogout,
    },
  ]

  return (
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEventThrottle={16}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true },
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {showSkeleton ? (
        <ProfileSkeleton />
      ) : (
        <>
          <Animated.View style={[styles.hero, { height: HERO_BLOCK_HEIGHT }]}>
            <Animated.View
              style={{
                alignItems: "center",
                opacity: heroContentOpacity,
                transform: [{ translateY: heroTranslateY }, { scale: heroContentScale }],
              }}
            >
              <ProfileAvatar
                name={user.name}
                avatarUrl={user.avatarUrl}
                size={HERO_AVATAR_SIZE}
                borderRadius={32}
                canUpload={canUploadAvatar}
                uploading={avatarUploading}
                onPress={handleAvatarUpload}
              />
              {canUploadAvatar ? (
                <Text style={styles.avatarHint}>Tap to add a profile photo (once)</Text>
              ) : null}
              <Text style={styles.name}>{user.name}</Text>
              <Animated.Text style={[styles.email, { opacity: heroEmailOpacity }]}>
                {user.email}
              </Animated.Text>
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateY: contentLift }] }}>
            <View style={styles.statsBar}>
              <StatCell
                value={formatStat(studentLevel?.totalPoints ?? 0)}
                label="Total XP"
              />
              <StatCell
                value={formatStat(studentLevel?.level ?? 1)}
                label="Level"
              />
              <StatCell value={formatStat(wordsLearned)} label="Words" />
              <StatCell value={rank != null ? `#${rank}` : "—"} label="Rank" />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <Text style={styles.sectionMeta}>
                {unlockedCount}/{achievements.length} unlocked
              </Text>
            </View>
            <View style={styles.achievementsCard}>
              <View style={styles.achievementsRow}>
                {achievements.map((item) => (
                  <AchievementBadge key={item.id} item={item} />
                ))}
              </View>
            </View>

            <View style={styles.settingsCard}>
              {settingsItems.map((item, index) => (
                <SettingsRow
                  key={item.id}
                  item={item}
                  isLast={index === settingsItems.length - 1}
                />
              ))}
            </View>
          </Animated.View>
        </>
      )}
    </Animated.ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 40 },
  hero: {
    alignItems: "center",
    overflow: "hidden",
  },
  headerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: SCREEN_WIDTH - spacing.screen * 2 - 56,
  },
  headerName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  name: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 10 },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statsBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  statCell: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  sectionMeta: { fontSize: 12, color: colors.textSecondary },
  achievementsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  achievementsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  achievementItem: { flex: 1, alignItems: "center", minWidth: 0 },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 6,
  },
  achievementIconLocked: {
    borderColor: colors.border,
    backgroundColor: colors.borderLight,
  },
  achievementLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  achievementLabelLocked: { color: colors.textMuted },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadow.card,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settingsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  settingsLabelDestructive: { color: colors.error },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  settingsValue: {
    fontSize: 13,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
})

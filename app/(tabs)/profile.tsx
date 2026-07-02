import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useFocusEffect, useNavigation, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { requestNotificationsRefresh } from "../../src/lib/notifications-refresh"
import { useAuth } from "../../src/context/AuthContext"
import { GuestAuthBanner } from "../../src/components/GuestAuthBanner"
import { isGuestUser, isStudentUser } from "../../src/lib/guest"
import {
  isPushMessagingSupported,
  promptForPushNotifications,
  sendDebugPushTokens,
} from "../../src/lib/push-notifications"
import { ProfileAvatar } from "../../src/components/ProfileAvatar"
import { CacheManagerSheet } from "../../src/components/CacheManagerSheet"
import { ProfileSkeleton } from "../../src/components/skeletons/Layouts"
import { studentsApi, orgApi, testResultsApi, uploadsApi } from "../../src/lib/api"
import { getUserFacingErrorMessage } from "../../src/lib/api-client"
import {
  buildLearningProgressSummary,
  getLearningProgress,
} from "../../src/lib/learned-vocabulary"
import {
  formatAppCacheSize,
  prefetchAppMediaAssets,
} from "../../src/lib/app-cache"
import type { StudentLevel } from "../../src/types/gamification"
import { colors, radius, shadow, spacing } from "../../src/theme/tokens"
import {
  formatLessonSchedule,
  normalizeLessonSchedule,
  type LessonSchedule,
} from "../../src/lib/lesson-schedule"
import {
  getProfileScreenSnapshot,
  resolveProfileBootstrap,
  setProfileScreenSnapshot,
  type ProfileScreenSnapshot,
} from "../../src/lib/profile-screen-cache"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const HERO_AVATAR_SIZE = 64
const HEADER_AVATAR_SIZE = 32
const HEADER_REVEAL_START = 48
const HEADER_REVEAL_END = 96
const HERO_FADE_DISTANCE = 100

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

function ClassInfoIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.classInfoIconSlot}>
      <Ionicons name={name} size={14} color={colors.textSecondary} />
    </View>
  )
}

function DeveloperCredit({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.developerCredit, style]}>
      <View style={styles.developerCreditPill}>
        <Text style={styles.developerCreditText}>
          Developed by <Text style={styles.developerCreditBrand}>AOne</Text>
        </Text>
      </View>
    </View>
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
  const initialBootstrap = user ? resolveProfileBootstrap(user.id) : null
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(
    initialBootstrap?.studentLevel ?? null,
  )
  const [groupName, setGroupName] = useState<string | null>(initialBootstrap?.groupName ?? null)
  const [teacherName, setTeacherName] = useState<string | null>(
    initialBootstrap?.teacherName ?? null,
  )
  const [lessonSchedule, setLessonSchedule] = useState<LessonSchedule | null>(
    initialBootstrap?.lessonSchedule ?? null,
  )
  const [wordsLearned, setWordsLearned] = useState(initialBootstrap?.wordsLearned ?? 0)
  const [rank, setRank] = useState<number | null>(initialBootstrap?.rank ?? null)
  const [testsCount, setTestsCount] = useState(initialBootstrap?.testsCount ?? 0)
  const [cacheSizeLabel, setCacheSizeLabel] = useState("0 KB")
  const [loading, setLoading] = useState(!initialBootstrap)
  const [refreshing, setRefreshing] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [cacheSheetVisible, setCacheSheetVisible] = useState(false)
  const [debugPushSending, setDebugPushSending] = useState(false)

  const refreshCacheSize = useCallback(() => {
    setCacheSizeLabel(formatAppCacheSize())
  }, [])

  const applySnapshot = useCallback((snap: ProfileScreenSnapshot) => {
    setStudentLevel(snap.studentLevel)
    setGroupName(snap.groupName)
    setTeacherName(snap.teacherName)
    setLessonSchedule(snap.lessonSchedule)
    setWordsLearned(snap.wordsLearned)
    setRank(snap.rank)
    setTestsCount(snap.testsCount)
    setLoading(false)
  }, [])

  const buildSnapshot = useCallback(
    (
      ctxResult: PromiseSettledResult<Awaited<ReturnType<typeof studentsApi.context>>>,
      levelResult: PromiseSettledResult<StudentLevel>,
      leaderboardResult: PromiseSettledResult<Awaited<ReturnType<typeof orgApi.leaderboard>>>,
      progressResult: PromiseSettledResult<Awaited<ReturnType<typeof getLearningProgress>>>,
      testResultsResult: PromiseSettledResult<Awaited<ReturnType<typeof testResultsApi.list>>>,
    ): ProfileScreenSnapshot => {
      if (!user) {
        return {
          studentLevel: null,
          groupName: null,
          teacherName: null,
          lessonSchedule: null,
          wordsLearned: 0,
          rank: null,
          testsCount: 0,
        }
      }

      let nextGroupName: string | null = null
      let nextTeacherName: string | null = null
      let nextLessonSchedule: LessonSchedule | null = null

      if (ctxResult.status === "fulfilled") {
        nextGroupName = ctxResult.value.groupName
        nextTeacherName = ctxResult.value.teacherName
        nextLessonSchedule = normalizeLessonSchedule(ctxResult.value.lessonSchedule)
      }

      let nextRank: number | null = null
      if (leaderboardResult.status === "fulfilled") {
        const me = leaderboardResult.value.find((entry) => entry.studentId === user.id)
        nextRank = me?.rank ?? null
      }

      let nextWordsLearned = 0
      if (progressResult.status === "fulfilled") {
        nextWordsLearned = buildLearningProgressSummary(progressResult.value, new Map()).wordsLearned
      }

      return {
        studentLevel: levelResult.status === "fulfilled" ? levelResult.value : null,
        groupName: nextGroupName,
        teacherName: nextTeacherName,
        lessonSchedule: nextLessonSchedule,
        wordsLearned: nextWordsLearned,
        rank: nextRank,
        testsCount:
          testResultsResult.status === "fulfilled" ? testResultsResult.value.length : 0,
      }
    },
    [user],
  )

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!user || isGuestUser(user)) return

      const [ctxResult, levelResult, leaderboardResult, progressResult, testResultsResult] =
        await Promise.allSettled([
          studentsApi.context(user.id, opts),
          studentsApi.level(user.id, opts),
          orgApi.leaderboard(opts),
          getLearningProgress(user.id),
          testResultsApi.list(opts),
        ])

      const next = buildSnapshot(
        ctxResult,
        levelResult,
        leaderboardResult,
        progressResult,
        testResultsResult,
      )
      applySnapshot(next)
      setProfileScreenSnapshot(user.id, next)
      refreshCacheSize()
    },
    [user, applySnapshot, buildSnapshot, refreshCacheSize],
  )

  useFocusEffect(
    useCallback(() => {
      if (!user || isGuestUser(user)) return

      requestNotificationsRefresh()
      refreshCacheSize()
      prefetchAppMediaAssets({ imageUrls: [user.avatarUrl] })

      const snap = getProfileScreenSnapshot(user.id)
      if (snap) {
        applySnapshot(snap)
        return
      }

      const boot = resolveProfileBootstrap(user.id)
      if (boot) {
        applySnapshot(boot)
        setProfileScreenSnapshot(user.id, boot)
        void load()
        return
      }

      setLoading(true)
      void load().finally(() => setLoading(false))
    }, [user, load, applySnapshot, refreshCacheSize]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load({ force: true })
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

  const handleDeleteAccount = () => {
    if (!user || deletingAccount) return

    Alert.alert(
      "Delete account",
      "Your profile will be deactivated and you will lose access to homework, progress, and class features. This action cannot be undone from the app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm deletion",
              "Are you absolutely sure? Your account will be marked as inactive.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete account",
                  style: "destructive",
                  onPress: async () => {
                    setDeletingAccount(true)
                    try {
                      await studentsApi.deleteAccount(user.id)
                      await logout()
                      router.replace("/login")
                    } catch (err) {
                      Alert.alert(
                        "Could not delete account",
                        getUserFacingErrorMessage(
                          err,
                          "Please try again or contact your school administrator.",
                        ),
                      )
                    } finally {
                      setDeletingAccount(false)
                    }
                  },
                },
              ],
            )
          },
        },
      ],
    )
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
      Alert.alert(
        "Upload failed",
        getUserFacingErrorMessage(err, "Could not upload profile photo. Please try again."),
      )
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleOpenCache = () => {
    setCacheSheetVisible(true)
  }

  const handleDebugPushPress = async () => {
    if (debugPushSending) return

    if (!isPushMessagingSupported()) {
      Alert.alert(
        "Debug",
        "Push notifications are not available in Expo Go. Install the app from TestFlight or the App Store.",
      )
      return
    }

    setDebugPushSending(true)
    try {
      await sendDebugPushTokens()
      Alert.alert("Debug", "Push tokens sent to the server. Check server logs.")
    } catch (err) {
      Alert.alert(
        "Debug failed",
        getUserFacingErrorMessage(err, "Could not send push tokens. Please try again."),
      )
    } finally {
      setDebugPushSending(false)
    }
  }

  const handleNotificationsPress = async () => {
    if (!user || !isStudentUser(user)) return

    if (!isPushMessagingSupported()) {
      Alert.alert(
        "Notifications",
        "Push notifications are not available in Expo Go. Install the app from TestFlight or the App Store.",
      )
      return
    }

    const result = await promptForPushNotifications(user)

    if (result === "granted") {
      requestNotificationsRefresh()
      Alert.alert("Notifications", "Push notifications are enabled.")
      return
    }

    if (result === "denied") {
      Alert.alert(
        "Notifications disabled",
        "Enable notifications in your device settings to receive homework reminders and updates.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      )
    }
  }

  const showSkeleton = loading

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
    inputRange: [0, HERO_FADE_DISTANCE * 0.75],
    outputRange: [1, 0],
    extrapolate: "clamp",
  })
  const heroContentScale = scrollY.interpolate({
    inputRange: [0, HERO_FADE_DISTANCE],
    outputRange: [1, 0.92],
    extrapolate: "clamp",
  })
  const heroEmailOpacity = scrollY.interpolate({
    inputRange: [0, HERO_FADE_DISTANCE * 0.45],
    outputRange: [1, 0],
    extrapolate: "clamp",
  })

  if (!user) return null

  if (isGuestUser(user)) {
    return (
      <View style={[styles.container, styles.guestContainer]}>
        <GuestAuthBanner
          variant="screen"
          title="Create your student profile"
          message="Sign in to save progress, receive homework, view your class schedule, and unlock the full Learnix experience."
        />
        <Pressable
          style={styles.guestExitBtn}
          onPress={async () => {
            await logout()
            router.replace("/login")
          }}
        >
          <Text style={styles.guestExitText}>Exit guest mode</Text>
        </Pressable>
        <DeveloperCredit style={styles.developerCreditGuest} />
      </View>
    )
  }

  const settingsItems: SettingsItem[] = [
    {
      id: "notifications",
      label: "Notifications",
      icon: "notifications-outline",
      iconBg: colors.warningBg,
      iconColor: colors.warning,
      onPress: () => void handleNotificationsPress(),
    },
    {
      id: "debug",
      label: debugPushSending ? "Debug…" : "Debug",
      icon: "bug-outline",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      onPress: () => void handleDebugPushPress(),
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      icon: "shield-checkmark-outline",
      iconBg: "#EDE9FE",
      iconColor: colors.indigo,
      onPress: () => router.push("/privacy-policy" as never),
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
      onPress: handleOpenCache,
    },
    {
      id: "delete-account",
      label: deletingAccount ? "Deleting account…" : "Delete account",
      icon: "trash-outline",
      iconBg: colors.errorBg,
      iconColor: colors.error,
      destructive: true,
      onPress: handleDeleteAccount,
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
    <>
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
          <View style={styles.hero}>
            <Animated.View
              style={{
                alignItems: "center",
                opacity: heroContentOpacity,
                transform: [{ scale: heroContentScale }],
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
              <Animated.View style={[styles.classInfo, { opacity: heroEmailOpacity }]}>
                {groupName ? (
                  <>
                    <View style={styles.classInfoRow}>
                      <ClassInfoIcon name="people-outline" />
                      <Text style={styles.classInfoText}>{groupName}</Text>
                    </View>
                    {teacherName ? (
                      <View style={styles.classInfoRow}>
                        <ClassInfoIcon name="person-outline" />
                        <Text style={styles.classInfoText}>{teacherName}</Text>
                      </View>
                    ) : null}
                    {lessonSchedule ? (
                      <View style={styles.classInfoRow}>
                        <ClassInfoIcon name="time-outline" />
                        <Text style={styles.classInfoText}>
                          {formatLessonSchedule(lessonSchedule)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.classInfoMuted}>No lesson schedule yet</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.classInfoMuted}>Not assigned to a group yet</Text>
                )}
              </Animated.View>
            </Animated.View>
          </View>

          <View style={styles.body}>
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
              <View style={styles.achievementsSoonOverlay} pointerEvents="none">
                <View style={styles.achievementsSoonBadge}>
                  <Text style={styles.achievementsSoonLabel}>Soon</Text>
                </View>
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

            <DeveloperCredit />
          </View>
        </>
      )}
    </Animated.ScrollView>

      <CacheManagerSheet
        visible={cacheSheetVisible}
        onClose={() => setCacheSheetVisible(false)}
        onCacheChanged={refreshCacheSize}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 40 },
  hero: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  body: {
    gap: 0,
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
  classInfo: {
    alignSelf: "center",
    alignItems: "center",
    maxWidth: "100%",
    marginTop: spacing.md,
    gap: 6,
  },
  classInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 8,
    maxWidth: "100%",
  },
  classInfoIconSlot: {
    width: 16,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  classInfoText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: "center",
  },
  classInfoMuted: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
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
    overflow: "hidden",
    position: "relative",
    ...shadow.card,
  },
  achievementsSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementsSoonBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  achievementsSoonLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.primaryDark,
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
  guestExitBtn: {
    alignSelf: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  guestContainer: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  developerCreditGuest: {
    marginTop: "auto",
  },
  guestExitText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  developerCredit: {
    alignSelf: "flex-end",
    marginTop: spacing.xl,
  },
  developerCreditPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brand + "33",
  },
  developerCreditText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  developerCreditBrand: {
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 0.8,
  },
})

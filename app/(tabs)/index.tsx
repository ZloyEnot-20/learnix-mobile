import React, { useCallback, useLayoutEffect, useRef, useState } from "react"
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useNavigation } from "expo-router"
import { useIsFocused } from "@react-navigation/native"
import { useAuth } from "../../src/context/AuthContext"
import { GuestAuthBanner } from "../../src/components/GuestAuthBanner"
import { isGuestUser } from "../../src/lib/guest"
import { ContinueLearningBanner } from "../../src/components/ContinueLearningBanner"
import { NextLessonBanner } from "../../src/components/NextLessonBanner"
import { NotificationsBell } from "../../src/components/NotificationsBell"
import { NotificationBanner } from "../../src/components/NotificationBanner"
import { IeltsMockTestBanner } from "../../src/components/IeltsMockTestBanner"
import { VocabularyReviewBanner } from "../../src/components/VocabularyReviewBanner"
import { LevelScale } from "../../src/components/LevelScale"
import { FadeInDown } from "../../src/components/ui/FadeInDown"
import { HomeSkeleton } from "../../src/components/skeletons/Layouts"
import { studentsApi, testResultsApi } from "../../src/lib/api"
import {
  normalizeLessonSchedule,
  type LessonSchedule,
} from "../../src/lib/lesson-schedule"
import {
  getVocabularyReviewPreview,
  type VocabularyReviewPreview,
} from "../../src/lib/learned-vocabulary"
import {
  resolveContinueLearning,
  type ContinueLearningItem,
} from "../../src/lib/continue-learning"
import {
  getHomeScreenSnapshot,
  patchHomeScreenSnapshot,
  setHomeScreenSnapshot,
  type HomeScreenSnapshot,
} from "../../src/lib/home-screen-cache"
import { requestNotificationsRefresh } from "../../src/lib/notifications-refresh"
import { useLessonCountdown } from "../../src/hooks/useLessonCountdown"
import { LessonCountdownText } from "../../src/components/LessonCountdownText"
import type { TestResult } from "../../src/types/domain"
import { colors, radius, shadow, spacing, typography, subjectColors } from "../../src/theme/tokens"

const TEST_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  reading: "book-outline",
  listening: "headset-outline",
  writing: "create-outline",
  speaking: "mic-outline",
}

const LESSON_TIME_ICON = "#01AEF9"
const LESSON_TIME_TEXT = "#2563EB"

function HomeHeaderGreeting({
  firstName,
  scrollY,
  revealAt,
}: {
  firstName: string
  scrollY: Animated.Value
  revealAt: number
}) {
  const opacity = scrollY.interpolate({
    inputRange: [Math.max(0, revealAt - 16), revealAt + 24],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })
  const translateY = scrollY.interpolate({
    inputRange: [Math.max(0, revealAt - 16), revealAt + 24],
    outputRange: [6, 0],
    extrapolate: "clamp",
  })

  return (
    <Animated.View style={[styles.headerGreetingWrap, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.headerGreeting} numberOfLines={1}>
        Hello, {firstName}
      </Text>
      <Text
        style={styles.headerSubGreeting}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        Track your progress and level
      </Text>
    </Animated.View>
  )
}

function HomeHeaderRight({
  schedule,
  scrollY,
  bannerRevealAt,
}: {
  schedule: LessonSchedule | null
  scrollY: Animated.Value
  bannerRevealAt: number
}) {
  const { countdownMs, duringLesson, hasSchedule } = useLessonCountdown(schedule)

  const opacity = scrollY.interpolate({
    inputRange: [Math.max(0, bannerRevealAt - 12), bannerRevealAt + 8],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })
  const translateY = scrollY.interpolate({
    inputRange: [Math.max(0, bannerRevealAt - 12), bannerRevealAt + 8],
    outputRange: [4, 0],
    extrapolate: "clamp",
  })

  return (
    <View style={styles.headerRight}>
      {hasSchedule ? (
        <Animated.View
          style={[
            styles.headerLessonChip,
            { opacity, transform: [{ translateY }] },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="time-outline" size={18} color={LESSON_TIME_ICON} />
          {duringLesson ? (
            <Text style={styles.headerLessonTime} numberOfLines={1}>
              In class
            </Text>
          ) : (
            <LessonCountdownText
              ms={countdownMs}
              primaryStyle={styles.headerLessonTime}
              secondsStyle={styles.headerLessonSeconds}
            />
          )}
        </Animated.View>
      ) : null}
      <NotificationsBell />
    </View>
  )
}

export default function HomeScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const guest = isGuestUser(user)
  const scrollY = useRef(new Animated.Value(0)).current
  const [headerRevealAt, setHeaderRevealAt] = useState(120)
  const [bannerRevealAt, setBannerRevealAt] = useState(88)
  const firstName = user?.name.split(" ")[0] ?? ""
  const initialSnapshot = user ? getHomeScreenSnapshot(user.id) : null
  const [results, setResults] = useState<TestResult[]>(initialSnapshot?.results ?? [])
  const [continueItem, setContinueItem] = useState<ContinueLearningItem | null>(
    initialSnapshot?.continueItem ?? null,
  )
  const [vocabPreview, setVocabPreview] = useState<VocabularyReviewPreview | null>(
    initialSnapshot?.vocabPreview ?? null,
  )
  const [lessonSchedule, setLessonSchedule] = useState<LessonSchedule | null>(
    initialSnapshot?.lessonSchedule ?? null,
  )
  const [scheduleLoading, setScheduleLoading] = useState(!initialSnapshot)
  const [loading, setLoading] = useState(!initialSnapshot)
  const [notificationScrollLocked, setNotificationScrollLocked] = useState(false)
  const isHomeFocused = useIsFocused()

  const applySnapshot = useCallback((snap: HomeScreenSnapshot) => {
    setResults(snap.results)
    setContinueItem(snap.continueItem)
    setVocabPreview(snap.vocabPreview)
    setLessonSchedule(snap.lessonSchedule)
    setLoading(false)
    setScheduleLoading(false)
  }, [])

  const fetchLessonSchedule = useCallback(async (studentId: string): Promise<LessonSchedule | null> => {
    try {
      const ctx = await studentsApi.context(studentId)
      return normalizeLessonSchedule(ctx.lessonSchedule)
    } catch {
      return null
    }
  }, [])

  const load = useCallback(async (): Promise<HomeScreenSnapshot | null> => {
    if (!user) return null

    setScheduleLoading(true)
    const scheduleTask = fetchLessonSchedule(user.id)

    const [dataResult, contResult, reviewResult, scheduleResult] = await Promise.allSettled([
      testResultsApi.list(),
      resolveContinueLearning(user.id),
      getVocabularyReviewPreview(user.id),
      scheduleTask,
    ])

    const next: HomeScreenSnapshot = {
      results: dataResult.status === "fulfilled" ? dataResult.value : [],
      continueItem: contResult.status === "fulfilled" ? contResult.value : null,
      vocabPreview: reviewResult.status === "fulfilled" ? reviewResult.value : null,
      lessonSchedule: scheduleResult.status === "fulfilled" ? scheduleResult.value : null,
      scheduleChecked: scheduleResult.status === "fulfilled",
    }

    applySnapshot(next)
    setScheduleLoading(false)
    setHomeScreenSnapshot(user.id, next)
    return next
  }, [user, applySnapshot, fetchLessonSchedule])

  const refreshLessonSchedule = useCallback(
    async (studentId: string) => {
      setScheduleLoading(true)
      try {
        const schedule = await fetchLessonSchedule(studentId)
        setLessonSchedule(schedule)
        patchHomeScreenSnapshot(studentId, {
          lessonSchedule: schedule,
          scheduleChecked: true,
        })
      } finally {
        setScheduleLoading(false)
      }
    },
    [fetchLessonSchedule],
  )

  useFocusEffect(
    useCallback(() => {
      if (!user) return

      requestNotificationsRefresh()

      const snap = getHomeScreenSnapshot(user.id)
      if (snap) {
        applySnapshot(snap)
        if (!snap.scheduleChecked) {
          void refreshLessonSchedule(user.id)
        }
        return
      }

      setLoading(true)
      setScheduleLoading(true)
      void load()
    }, [user, load, applySnapshot, refreshLessonSchedule]),
  )

  useLayoutEffect(() => {
    if (!user) return

    navigation.setOptions({
      headerTitleAlign: "left",
      headerTitle: guest
        ? undefined
        : () => (
            <HomeHeaderGreeting
              firstName={firstName}
              scrollY={scrollY}
              revealAt={headerRevealAt}
            />
          ),
      headerRight: guest
        ? undefined
        : () => (
            <HomeHeaderRight
              schedule={lessonSchedule}
              scrollY={scrollY}
              bannerRevealAt={bannerRevealAt}
            />
          ),
      headerLeft: () => null,
      headerTitleContainerStyle: guest
        ? undefined
        : {
            left: spacing.screen,
            right: 148,
            alignItems: "flex-start",
            maxWidth: undefined,
          },
      headerStyle: { backgroundColor: colors.background, minHeight: 56 },
    })
  }, [navigation, user, guest, firstName, scrollY, headerRevealAt, lessonSchedule, bannerRevealAt])

  const handleGreetingLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderRevealAt(event.nativeEvent.layout.y)
  }, [])

  const handleBannerLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout
    setBannerRevealAt(y + height)
  }, [])

  if (!user) return null

  if (guest) {
    return (
      <Animated.ScrollView
        style={[styles.container, styles.scrollOverflowVisible]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FadeInDown index={0}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>Hello, Guest</Text>
            <Text style={styles.subGreeting}>Explore a preview of Learnix materials</Text>
          </View>
        </FadeInDown>

        <FadeInDown index={1}>
          <IeltsMockTestBanner />
        </FadeInDown>

        <FadeInDown index={2}>
          <GuestAuthBanner />
        </FadeInDown>
      </Animated.ScrollView>
    )
  }

  return (
    <Animated.ScrollView
      style={[styles.container, styles.scrollOverflowVisible]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      scrollEnabled={!notificationScrollLocked}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      })}
    >
      <FadeInDown index={0}>
        <View style={styles.greetingBlock} onLayout={handleGreetingLayout}>
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.subGreeting}>Track your progress and level</Text>
        </View>
      </FadeInDown>

      <FadeInDown index={1}>
        <NextLessonBanner
          schedule={lessonSchedule}
          loading={scheduleLoading}
          onLayout={handleBannerLayout}
        />
      </FadeInDown>

      <FadeInDown index={2} style={styles.notificationBannerWrap}>
        <NotificationBanner
          isFocused={isHomeFocused}
          loading={loading}
          onScrollLockChange={setNotificationScrollLocked}
        />
      </FadeInDown>

      {loading ? (
        <HomeSkeleton />
      ) : (
        <>
          {continueItem ? (
            <FadeInDown index={3}>
              <ContinueLearningBanner item={continueItem} />
            </FadeInDown>
          ) : null}

          {vocabPreview ? (
            <FadeInDown index={continueItem ? 4 : 3}>
              <VocabularyReviewBanner preview={vocabPreview} />
            </FadeInDown>
          ) : null}

          <FadeInDown
            index={continueItem && vocabPreview ? 5 : continueItem || vocabPreview ? 4 : 3}
            style={styles.section}
          >
            <LevelScale studentId={user.id} />
          </FadeInDown>

          <FadeInDown
            index={continueItem && vocabPreview ? 6 : continueItem || vocabPreview ? 5 : 4}
          >
            <IeltsMockTestBanner />
          </FadeInDown>

          {results.length > 0 && (
            <FadeInDown
              index={continueItem && vocabPreview ? 7 : continueItem || vocabPreview ? 6 : 5}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Recent results</Text>
              {results.slice(0, 5).map((r) => (
                <View key={r.id} style={styles.resultCard}>
                  <View
                    style={[
                      styles.resultIcon,
                      { backgroundColor: (subjectColors[r.testType] ?? colors.border) + "33" },
                    ]}
                  >
                    <Ionicons
                      name={TEST_ICONS[r.testType] ?? "document-outline"}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.resultBody}>
                    <Text style={styles.resultType}>
                      {r.testType.charAt(0).toUpperCase() + r.testType.slice(1)}
                    </Text>
                    <Text style={styles.resultDate}>
                      {new Date(r.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.resultBand}>Band {r.bandScore}</Text>
                </View>
              ))}
            </FadeInDown>
          )}
        </>
      )}
    </Animated.ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollOverflowVisible: { overflow: "visible" },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    overflow: "visible",
  },
  greetingBlock: {
    alignSelf: "stretch",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  greeting: { ...typography.h2, color: colors.text, textAlign: "left" },
  subGreeting: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "left",
  },
  headerGreetingWrap: {
    alignSelf: "stretch",
    width: "100%",
    justifyContent: "center",
  },
  headerGreeting: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    textAlign: "left",
  },
  headerSubGreeting: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    marginTop: 1,
    textAlign: "left",
    width: "100%",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: spacing.screen,
  },
  headerLessonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 132,
    flexShrink: 1,
  },
  headerLessonTime: {
    fontSize: 14,
    fontWeight: "700",
    color: LESSON_TIME_TEXT,
    fontVariant: ["tabular-nums"],
  },
  headerLessonSeconds: {
    fontSize: 11,
    fontWeight: "600",
  },
  notificationBannerWrap: {
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, fontSize: 18, color: colors.text, marginBottom: spacing.md },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBody: { flex: 1 },
  resultType: { ...typography.label, color: colors.text, textTransform: "capitalize" },
  resultDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  resultBand: { fontSize: 16, fontWeight: "700", color: colors.text },
})

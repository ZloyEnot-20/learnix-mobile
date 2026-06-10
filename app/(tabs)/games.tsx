import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { requestNotificationsRefresh } from "../../src/lib/notifications-refresh"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi, studentsApi } from "../../src/lib/api"
import { LevelScale } from "../../src/components/LevelScale"
import { GamesHistorySection } from "../../src/components/GamesHistorySection"
import { GamesSkeleton } from "../../src/components/skeletons/Layouts"
import {
  buildDeckProgressMap,
  buildGameHistory,
  buildLearningProgressSummary,
  buildTopicProgressMap,
  getLearningProgress,
  type DeckProgress,
  type GameHistoryEntry,
  type LearningProgressSummary,
  type TopicProgress,
} from "../../src/lib/learned-vocabulary"
import {
  buildTopicSummaries,
  clampToFixedLevel,
  primaryLevel,
} from "../../src/lib/utils"
import {
  isCefrUnlocked,
  requiredLevelFor,
  type StudentLevel,
} from "../../src/types/gamification"
import type { GrammarExercise } from "../../src/types/grammar"
import type { TopicSummary, VocabDeck } from "../../src/types/vocabulary"
import { Ionicons } from "@expo/vector-icons"
import { FadeInDown } from "../../src/components/ui/FadeInDown"
import { colors, radius, shadow, spacing, typography } from "../../src/theme/tokens"

const LEVELS = [
  { key: "A1", label: "Beginner" },
  { key: "A2", label: "Elementary" },
  { key: "B1", label: "Intermediate" },
  { key: "B2", label: "Upper-Intermediate" },
  { key: "C1", label: "Advanced" },
  { key: "C2", label: "Expert" },
]

const LEVEL_COLORS: Record<string, string> = {
  A1: "#10B981",
  A2: "#84CC16",
  B1: "#0EA5E9",
  B2: "#F59E0B",
  C1: "#F43F5E",
  C2: "#A855F7",
}

type GameItem = {
  id: string
  title: string
  subtitle: string
  route: string
  kind: "vocab" | "topic"
  topic?: string
  deckSlug?: string
}

type Tab = "play" | "history"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function animateExpand() {
  LayoutAnimation.configureNext(LayoutAnimation.create(280, "easeInEaseOut", "opacity"))
}

function progressLabel(
  kind: GameItem["kind"],
  topicProgress: Map<string, TopicProgress>,
  deckProgress: Map<string, DeckProgress>,
  item: GameItem,
): { text: string; tone: "done" | "progress" } | null {
  if (item.kind === "topic" && item.topic) {
    const progress = topicProgress.get(item.topic)
    if (!progress || progress.status === "not_started") return null
    if (progress.status === "completed") {
      return { text: "Completed", tone: "done" }
    }
    return {
      text: `${progress.passedRounds}/${progress.totalRounds} rounds`,
      tone: "progress",
    }
  }

  if (item.kind === "vocab" && item.deckSlug) {
    const progress = deckProgress.get(item.deckSlug)
    if (!progress) return null
    if (progress.completed) {
      return {
        text:
          progress.wordsLearned >= progress.totalWords
            ? "Quiz done"
            : `${progress.wordsLearned}/${progress.totalWords} words`,
        tone: progress.wordsLearned >= progress.totalWords ? "done" : "progress",
      }
    }
    if (progress.wordsLearned > 0) {
      return {
        text: `${progress.wordsLearned}/${progress.totalWords} words`,
        tone: "progress",
      }
    }
  }

  return null
}

function ProgressSummary({ summary }: { summary: LearningProgressSummary }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{summary.wordsLearned}</Text>
        <Text style={styles.summaryLabel}>Words learned</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{summary.topicsCompleted}</Text>
        <Text style={styles.summaryLabel}>Topics done</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{summary.decksCompleted}</Text>
        <Text style={styles.summaryLabel}>Decks played</Text>
      </View>
    </View>
  )
}

export default function GamesScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("play")
  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>([])
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [history, setHistory] = useState<GameHistoryEntry[]>([])
  const [summary, setSummary] = useState<LearningProgressSummary>({
    wordsLearned: 0,
    topicsCompleted: 0,
    topicsInProgress: 0,
    decksCompleted: 0,
    totalGameSessions: 0,
  })
  const [topicProgress, setTopicProgress] = useState<Map<string, TopicProgress>>(new Map())
  const [deckProgress, setDeckProgress] = useState<Map<string, DeckProgress>>(new Map())

  const loadProgress = useCallback(
    async (
      exerciseList: GrammarExercise[] = exercises,
      decks: VocabDeck[] = vocabDecks,
    ) => {
      if (!user) return
      try {
        const progress = await getLearningProgress(user.id)
        const nextTopicProgress = buildTopicProgressMap(progress.gameResults, exerciseList)
        const nextDeckProgress = buildDeckProgressMap(progress, decks)
        setTopicProgress(nextTopicProgress)
        setDeckProgress(nextDeckProgress)
        setSummary(buildLearningProgressSummary(progress, nextTopicProgress))
        setHistory(buildGameHistory(progress))
      } catch {
        setHistory([])
        setTopicProgress(new Map())
        setDeckProgress(new Map())
        setSummary({
          wordsLearned: 0,
          topicsCompleted: 0,
          topicsInProgress: 0,
          decksCompleted: 0,
          totalGameSessions: 0,
        })
      }
    },
    [user, exercises, vocabDecks],
  )

  const loadContent = async () => {
    try {
      const [exerciseList, metas, decks] = await Promise.all([
        exercisesApi.list(),
        exercisesApi.topics(),
        exercisesApi.vocab(),
      ])
      setExercises(exerciseList as GrammarExercise[])
      setTopics(buildTopicSummaries(exerciseList as GrammarExercise[], metas))
      setVocabDecks(decks)
      return {
        exerciseList: exerciseList as GrammarExercise[],
        decks,
      }
    } catch {
      return { exerciseList: [] as GrammarExercise[], decks: [] as VocabDeck[] }
    }
  }

  const load = async () => {
    const { exerciseList, decks } = await loadContent()
    await loadProgress(exerciseList, decks)
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading) void loadProgress()
  }, [exercises, vocabDecks, loadProgress, loading])

  useFocusEffect(
    useCallback(() => {
      requestNotificationsRefresh()
      void loadProgress()
    }, [loadProgress]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  useEffect(() => {
    if (!user) return
    studentsApi
      .level(user.id)
      .then(setStudentLevel)
      .catch(() => setStudentLevel(null))
  }, [user])

  const currentLevel = studentLevel?.level ?? 1

  const playableTopics = useMemo(
    () =>
      topics.filter(
        (t) =>
          (t.category === "grammar" ||
            t.category === "vocabulary" ||
            t.category === "speaking") &&
          t.exerciseCount > 0 &&
          !t.comingSoon,
      ),
    [topics],
  )

  const gamesByLevel = useMemo(() => {
    const map = new Map<string, GameItem[]>()

    for (const { key } of LEVELS) {
      const decks = vocabDecks
        .filter((d) => clampToFixedLevel(primaryLevel([d.level])) === key)
        .map((d) => ({
          id: `deck-${d.slug}`,
          title: d.title,
          subtitle: `${d.words.length} words · Flashcards & Quiz`,
          route: `/vocabulary/${d.slug}`,
          kind: "vocab" as const,
          deckSlug: d.slug,
        }))

      const topicGames = playableTopics
        .filter((t) => clampToFixedLevel(primaryLevel(t.levels)) === key)
        .map((t) => ({
          id: `topic-${t.topic}`,
          title: t.title,
          subtitle: `${t.exerciseCount} rounds · ${t.questionCount} questions`,
          route: `/exercises/${t.topic}`,
          kind: "topic" as const,
          topic: t.topic,
        }))

      map.set(key, [...decks, ...topicGames])
    }

    return map
  }, [vocabDecks, playableTopics])

  const toggleLevel = (key: string) => {
    animateExpand()
    setSelectedLevel((prev) => (prev === key ? null : key))
  }

  if (!user) return null

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {loading ? (
        <GamesSkeleton />
      ) : (
        <>
          <FadeInDown index={0}>
            <Text style={styles.subtitle}>Practise vocabulary and grammar by level</Text>
          </FadeInDown>

          <FadeInDown index={1} style={styles.section}>
            <ProgressSummary summary={summary} />
          </FadeInDown>

          <FadeInDown index={2} style={styles.section}>
            <LevelScale studentId={user.id} compact />
          </FadeInDown>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setTab("play")}
              style={[styles.tab, tab === "play" && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === "play" && styles.tabTextActive]}>Play</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("history")}
              style={[styles.tab, tab === "history" && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>
                History {history.length > 0 ? `(${history.length})` : ""}
              </Text>
            </Pressable>
          </View>

          {tab === "history" ? (
            <GamesHistorySection history={history} />
          ) : (
            <>
              <Text style={styles.pickTitle}>Choose a level</Text>
              <View style={styles.levelGrid}>
                {LEVELS.map(({ key, label }) => {
                  const unlocked = isCefrUnlocked(key, currentLevel)
                  const req = requiredLevelFor(key)
                  const expanded = selectedLevel === key
                  const accent = LEVEL_COLORS[key]
                  const games = gamesByLevel.get(key) ?? []
                  const levelCompleted = games.filter((game) => {
                    const badge = progressLabel(game.kind, topicProgress, deckProgress, game)
                    return badge?.tone === "done"
                  }).length

                  return (
                    <View
                      key={key}
                      style={[
                        styles.levelBlock,
                        { borderLeftColor: accent },
                        expanded && { borderColor: accent + "44" },
                        !unlocked && styles.levelLocked,
                      ]}
                    >
                      <Pressable
                        disabled={!unlocked}
                        onPress={() => unlocked && toggleLevel(key)}
                        style={[
                          styles.levelCard,
                          expanded && styles.levelCardExpanded,
                          expanded && { backgroundColor: accent + "0D" },
                        ]}
                      >
                        <View style={styles.levelHeader}>
                          <View style={styles.levelTextWrap}>
                            <Text style={styles.levelKey}>{key}</Text>
                            <Text style={styles.levelLabel}>{label}</Text>
                            {unlocked && games.length > 0 ? (
                              <Text style={styles.levelProgress}>
                                {levelCompleted}/{games.length} completed
                              </Text>
                            ) : null}
                            {!unlocked && (
                              <View style={styles.lockRow}>
                                <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                                <Text style={styles.lockText}>Level {req}</Text>
                              </View>
                            )}
                          </View>
                          {unlocked ? (
                            <Ionicons
                              name={expanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color={expanded ? accent : colors.textMuted}
                            />
                          ) : null}
                        </View>
                      </Pressable>

                      {expanded ? (
                        <View style={[styles.gamesPanel, { backgroundColor: accent + "08" }]}>
                          {games.length === 0 ? (
                            <Text style={styles.empty}>No games available for this level yet.</Text>
                          ) : (
                            games.map((game, index) => {
                              const badge = progressLabel(
                                game.kind,
                                topicProgress,
                                deckProgress,
                                game,
                              )

                              return (
                                <FadeInDown key={game.id} index={index} delay={40}>
                                  <Pressable
                                    style={({ pressed }) => [
                                      styles.gameCard,
                                      pressed && styles.gameCardPressed,
                                      badge?.tone === "done" && styles.gameCardDone,
                                    ]}
                                    onPress={() => router.push(game.route as never)}
                                  >
                                    <View
                                      style={[styles.gameIconWrap, { backgroundColor: accent + "22" }]}
                                    >
                                      <Ionicons
                                        name={
                                          game.kind === "vocab"
                                            ? "library-outline"
                                            : "school-outline"
                                        }
                                        size={20}
                                        color={accent}
                                      />
                                    </View>
                                    <View style={styles.gameBody}>
                                      <View style={styles.gameTitleRow}>
                                        <Text style={styles.gameTitle}>{game.title}</Text>
                                        {badge ? (
                                          <View
                                            style={[
                                              styles.progressBadge,
                                              badge.tone === "done" && styles.progressBadgeDone,
                                              badge.tone === "progress" && styles.progressBadgeActive,
                                            ]}
                                          >
                                            {badge.tone === "done" ? (
                                              <Ionicons
                                                name="checkmark"
                                                size={10}
                                                color={colors.success}
                                              />
                                            ) : null}
                                            <Text
                                              style={[
                                                styles.progressBadgeText,
                                                badge.tone === "done" && styles.progressBadgeTextDone,
                                                badge.tone === "progress" &&
                                                  styles.progressBadgeTextActive,
                                              ]}
                                            >
                                              {badge.text}
                                            </Text>
                                          </View>
                                        ) : null}
                                      </View>
                                      <Text style={styles.gameSubtitle}>{game.subtitle}</Text>
                                    </View>
                                    <Text style={styles.gameArrow}>›</Text>
                                  </Pressable>
                                </FadeInDown>
                              )
                            })
                          )}
                        </View>
                      ) : null}
                    </View>
                  )
                })}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.section },
  section: { marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: spacing.sm },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    ...shadow.card,
  },
  summaryValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: radius.button,
    padding: 4,
    marginBottom: spacing.section,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.button - 2,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.card,
    ...shadow.card,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: colors.text },
  pickTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  levelGrid: { gap: 10 },
  levelBlock: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    overflow: "hidden",
    ...shadow.card,
  },
  levelCard: {
    padding: spacing.section,
  },
  levelCardExpanded: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  levelTextWrap: { flex: 1, minWidth: 0 },
  levelLocked: { opacity: 0.55 },
  levelKey: { fontSize: 20, fontWeight: "800", color: colors.text },
  levelLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  levelProgress: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: "600" },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  lockText: { fontSize: 11, color: colors.textMuted },
  gamesPanel: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  empty: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadow.card,
  },
  gameCardDone: {
    borderWidth: 1,
    borderColor: colors.success + "44",
  },
  gameCardPressed: { opacity: 0.94 },
  gameIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  gameBody: { flex: 1 },
  gameTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  gameTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  gameSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  gameArrow: { fontSize: 22, color: colors.textMuted },
  progressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.borderLight,
  },
  progressBadgeDone: { backgroundColor: colors.successBg },
  progressBadgeActive: { backgroundColor: "#FEF3C7" },
  progressBadgeText: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  progressBadgeTextDone: { color: colors.success },
  progressBadgeTextActive: { color: "#B45309" },
})

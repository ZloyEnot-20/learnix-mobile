import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { requestNotificationsRefresh } from "../../src/lib/notifications-refresh"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi, studentsApi } from "../../src/lib/api"
import { loadGamesContentCache, saveGamesContentCache } from "../../src/lib/games-content-cache"
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
import type { TopicMeta, TopicSummary, VocabDeck } from "../../src/types/vocabulary"
import { Ionicons } from "@expo/vector-icons"
import { Collapsible } from "../../src/components/ui/Collapsible"
import { FadeInDown } from "../../src/components/ui/FadeInDown"
import { SwipeableTabs } from "../../src/components/ui/SwipeableTabs"
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
  category?: "grammar" | "vocabulary" | "speaking"
}

type GameCategory = "vocabulary" | "grammar"

type Tab = "play" | "history"

function gamesForCategory(games: GameItem[], category: GameCategory): GameItem[] {
  if (category === "vocabulary") {
    return games.filter((game) => game.kind === "vocab" || game.category === "vocabulary")
  }
  return games.filter(
    (game) => game.kind === "topic" && game.category !== "vocabulary",
  )
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

type LevelBlockProps = {
  levelKey: string
  label: string
  unlocked: boolean
  expanded: boolean
  games: GameItem[]
  completed: number
  total: number
  completionPct: number
  accent: string
  req: number
  topicProgress: Map<string, TopicProgress>
  deckProgress: Map<string, DeckProgress>
  onToggle: (key: string) => void
  onGamePress: (route: string) => void
}

const LevelBlock = React.memo(function LevelBlock({
  levelKey,
  label,
  unlocked,
  expanded,
  games,
  completed,
  total,
  completionPct,
  accent,
  req,
  topicProgress,
  deckProgress,
  onToggle,
  onGamePress,
}: LevelBlockProps) {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | null>(null)

  useEffect(() => {
    if (!expanded) setSelectedCategory(null)
  }, [expanded])

  const vocabularyGames = useMemo(() => gamesForCategory(games, "vocabulary"), [games])
  const grammarGames = useMemo(() => gamesForCategory(games, "grammar"), [games])
  const visibleGames =
    selectedCategory === "vocabulary"
      ? vocabularyGames
      : selectedCategory === "grammar"
        ? grammarGames
        : []

  return (
    <View
      style={[
        styles.levelBlock,
        { borderLeftColor: accent },
        expanded && { borderColor: accent + "44" },
        !unlocked && styles.levelLocked,
      ]}
    >
      <Pressable
        disabled={!unlocked}
        onPress={() => unlocked && onToggle(levelKey)}
        style={[
          styles.levelCard,
          expanded && styles.levelCardExpanded,
          expanded && { backgroundColor: accent + "0D" },
        ]}
      >
        <View style={styles.levelHeader}>
          <View style={styles.levelTextWrap}>
            <Text style={styles.levelKey}>{levelKey}</Text>
            <Text style={styles.levelLabel}>{label}</Text>
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
        {unlocked && total > 0 ? (
          <View style={styles.levelStatusSection}>
            <View style={styles.levelStatusTrack}>
              <View
                style={[
                  styles.levelStatusFill,
                  {
                    width: `${completionPct > 0 ? Math.max(completionPct, 4) : 0}%`,
                    backgroundColor: accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.levelProgress}>
              {completed}/{total} completed
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Collapsible
        expanded={expanded}
        style={[styles.gamesPanel, { backgroundColor: accent + "08" }]}
      >
        {vocabularyGames.length === 0 && grammarGames.length === 0 ? (
          <Text style={styles.empty}>No games available for this level yet.</Text>
        ) : (
          <>
            <View style={styles.categoryRow}>
              <Pressable
                onPress={() => setSelectedCategory("vocabulary")}
                style={({ pressed }) => [
                  styles.categoryBtn,
                  selectedCategory === "vocabulary" && [
                    styles.categoryBtnActive,
                    { borderColor: accent, backgroundColor: accent + "14" },
                  ],
                  pressed && styles.categoryBtnPressed,
                ]}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: "#8B5CF622" }]}>
                  <Ionicons name="library-outline" size={18} color="#8B5CF6" />
                </View>
                <View style={styles.categoryTextWrap}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={[
                      styles.categoryLabel,
                      selectedCategory === "vocabulary" && { color: accent },
                    ]}
                  >
                    Vocabulary
                  </Text>
                  <Text style={styles.categoryCount} numberOfLines={1}>
                    {vocabularyGames.length} game{vocabularyGames.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedCategory("grammar")}
                style={({ pressed }) => [
                  styles.categoryBtn,
                  selectedCategory === "grammar" && [
                    styles.categoryBtnActive,
                    { borderColor: accent, backgroundColor: accent + "14" },
                  ],
                  pressed && styles.categoryBtnPressed,
                ]}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: "#F59E0B22" }]}>
                  <Ionicons name="school-outline" size={18} color="#F59E0B" />
                </View>
                <View style={styles.categoryTextWrap}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={[
                      styles.categoryLabel,
                      selectedCategory === "grammar" && { color: accent },
                    ]}
                  >
                    Grammar
                  </Text>
                  <Text style={styles.categoryCount} numberOfLines={1}>
                    {grammarGames.length} game{grammarGames.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </Pressable>
            </View>

            {selectedCategory ? (
              visibleGames.length === 0 ? (
                <Text style={styles.empty}>
                  No {selectedCategory} games for this level yet.
                </Text>
              ) : (
                visibleGames.map((game) => {
                  const badge = progressLabel(game.kind, topicProgress, deckProgress, game)

                  return (
                    <Pressable
                      key={game.id}
                      style={({ pressed }) => [
                        styles.gameCard,
                        pressed && styles.gameCardPressed,
                        badge?.tone === "done" && styles.gameCardDone,
                      ]}
                      onPress={() => onGamePress(game.route)}
                    >
                      <View style={[styles.gameIconWrap, { backgroundColor: accent + "22" }]}>
                        <Ionicons
                          name={game.kind === "vocab" ? "library-outline" : "school-outline"}
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
                                <Ionicons name="checkmark" size={10} color={colors.success} />
                              ) : null}
                              <Text
                                style={[
                                  styles.progressBadgeText,
                                  badge.tone === "done" && styles.progressBadgeTextDone,
                                  badge.tone === "progress" && styles.progressBadgeTextActive,
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
                  )
                })
              )
            ) : (
              <Text style={styles.categoryHint}>Choose vocabulary or grammar to see games</Text>
            )}
          </>
        )}
      </Collapsible>
    </View>
  )
})

export default function GamesScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("play")
  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>([])
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null)
  const [studentLevelLoading, setStudentLevelLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [historyMounted, setHistoryMounted] = useState(false)
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

  const applyContent = useCallback(
    (exerciseList: GrammarExercise[], metas: TopicMeta[], decks: VocabDeck[]) => {
      setExercises(exerciseList)
      setTopics(buildTopicSummaries(exerciseList, metas))
      setVocabDecks(decks)
    },
    [],
  )

  const loadContent = async (opts?: { force?: boolean }) => {
    try {
      const [exerciseList, metas, decks] = await Promise.all([
        exercisesApi.list(undefined, opts),
        exercisesApi.topics(opts),
        exercisesApi.vocab(opts),
      ])
      const exercises = exerciseList as GrammarExercise[]
      applyContent(exercises, metas, decks)
      await saveGamesContentCache(exercises, metas, decks)
      return { exerciseList: exercises, decks }
    } catch {
      return null
    }
  }

  const load = async (opts?: { force?: boolean }) => {
    const result = await loadContent(opts)
    if (result) {
      await loadProgress(result.exerciseList, result.decks)
    }
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const cached = await loadGamesContentCache()
      if (cancelled) return

      if (cached) {
        applyContent(cached.exercises, cached.topicMetas, cached.vocabDecks)
        setLoading(false)
        void loadProgress(cached.exercises, cached.vocabDecks)
      } else {
        setLoading(true)
      }

      const result = await loadContent({ force: !cached })
      if (cancelled) return

      if (result) {
        await loadProgress(result.exerciseList, result.decks)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      requestNotificationsRefresh()
      void loadProgress()
    }, [loadProgress]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load({ force: true })
    setRefreshing(false)
  }

  useEffect(() => {
    if (!user) {
      setStudentLevel(null)
      setStudentLevelLoading(false)
      return
    }

    let cancelled = false
    setStudentLevelLoading(true)
    studentsApi
      .level(user.id)
      .then((res) => {
        if (!cancelled) setStudentLevel(res)
      })
      .catch(() => {
        if (!cancelled) setStudentLevel(null)
      })
      .finally(() => {
        if (!cancelled) setStudentLevelLoading(false)
      })

    return () => {
      cancelled = true
    }
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
          category: t.category,
        }))

      map.set(key, [...decks, ...topicGames])
    }

    return map
  }, [vocabDecks, playableTopics])

  const levelStats = useMemo(() => {
    const stats = new Map<string, { completed: number; total: number; completionPct: number }>()

    for (const { key } of LEVELS) {
      const games = gamesByLevel.get(key) ?? []
      const completed = games.filter((game) => {
        const badge = progressLabel(game.kind, topicProgress, deckProgress, game)
        return badge?.tone === "done"
      }).length
      const total = games.length
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
      stats.set(key, { completed, total, completionPct })
    }

    return stats
  }, [gamesByLevel, topicProgress, deckProgress])

  const toggleLevel = useCallback((key: string) => {
    setSelectedLevel((prev) => (prev === key ? null : key))
  }, [])

  const handleGamePress = useCallback(
    (route: string) => {
      router.push(route as never)
    },
    [router],
  )

  useEffect(() => {
    if (tab === "history") setHistoryMounted(true)
  }, [tab])

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
            <LevelScale
              studentId={user.id}
              compact
              levelData={studentLevel}
              levelLoading={studentLevelLoading}
            />
          </FadeInDown>

          <SwipeableTabs
            tabs={[
              { key: "play", label: "Play" },
              {
                key: "history",
                label: `History ${history.length > 0 ? `(${history.length})` : ""}`,
              },
            ]}
            activeTab={tab}
            onTabChange={setTab}
            barStyle={styles.tabsBar}
          >
            <>
              <Text style={styles.pickTitle}>Choose a level</Text>
              <View style={styles.levelGrid}>
                {LEVELS.map(({ key, label }) => {
                  const stats = levelStats.get(key) ?? { completed: 0, total: 0, completionPct: 0 }

                  return (
                    <LevelBlock
                      key={key}
                      levelKey={key}
                      label={label}
                      unlocked={isCefrUnlocked(key, currentLevel)}
                      expanded={selectedLevel === key}
                      games={gamesByLevel.get(key) ?? []}
                      completed={stats.completed}
                      total={stats.total}
                      completionPct={stats.completionPct}
                      accent={LEVEL_COLORS[key]}
                      req={requiredLevelFor(key)}
                      topicProgress={topicProgress}
                      deckProgress={deckProgress}
                      onToggle={toggleLevel}
                      onGamePress={handleGamePress}
                    />
                  )
                })}
              </View>
            </>
            {historyMounted ? <GamesHistorySection history={history} /> : <View />}
          </SwipeableTabs>
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
  tabsBar: { marginBottom: spacing.section },
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  levelTextWrap: { flex: 1, minWidth: 0 },
  levelLocked: { opacity: 0.55 },
  levelKey: { fontSize: 20, fontWeight: "800", color: colors.text },
  levelLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  levelStatusSection: { marginTop: spacing.sm, gap: 6 },
  levelStatusTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },
  levelStatusFill: {
    height: "100%",
    borderRadius: 999,
  },
  levelProgress: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
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
  categoryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  categoryBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadow.card,
  },
  categoryBtnActive: {
    borderWidth: 1.5,
  },
  categoryBtnPressed: {
    opacity: 0.94,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTextWrap: {
    width: "100%",
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  categoryCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  categoryHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
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

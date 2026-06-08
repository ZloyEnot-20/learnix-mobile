import React, { useEffect, useMemo, useState } from "react"
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
import { useRouter } from "expo-router"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi, studentsApi } from "../../src/lib/api"
import { LevelScale } from "../../src/components/LevelScale"
import { GamesSkeleton } from "../../src/components/skeletons/Layouts"
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
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function animateExpand() {
  LayoutAnimation.configureNext(LayoutAnimation.create(280, "easeInEaseOut", "opacity"))
}

export default function GamesScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>([])
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const [exercises, metas, decks] = await Promise.all([
        exercisesApi.list(),
        exercisesApi.topics(),
        exercisesApi.vocab(),
      ])
      setTopics(buildTopicSummaries(exercises as GrammarExercise[], metas))
      setVocabDecks(decks)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [])

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
          (t.category === "grammar" || t.category === "vocabulary") &&
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
        }))

      const topicGames = playableTopics
        .filter((t) => clampToFixedLevel(primaryLevel(t.levels)) === key)
        .map((t) => ({
          id: `topic-${t.topic}`,
          title: t.title,
          subtitle: `${t.exerciseCount} rounds · ${t.questionCount} questions`,
          route: `/exercises/${t.topic}`,
          kind: "topic" as const,
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
            <LevelScale studentId={user.id} compact />
          </FadeInDown>

          <Text style={styles.pickTitle}>Choose a level</Text>
          <View style={styles.levelGrid}>
            {LEVELS.map(({ key, label }) => {
              const unlocked = isCefrUnlocked(key, currentLevel)
              const req = requiredLevelFor(key)
              const expanded = selectedLevel === key
              const accent = LEVEL_COLORS[key]
              const games = gamesByLevel.get(key) ?? []

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
                        games.map((game, index) => (
                          <FadeInDown key={game.id} index={index} delay={40}>
                            <Pressable
                              style={({ pressed }) => [
                                styles.gameCard,
                                pressed && styles.gameCardPressed,
                              ]}
                              onPress={() => router.push(game.route as never)}
                            >
                              <View style={[styles.gameIconWrap, { backgroundColor: accent + "22" }]}>
                                <Ionicons
                                  name={game.kind === "vocab" ? "library-outline" : "school-outline"}
                                  size={20}
                                  color={accent}
                                />
                              </View>
                              <View style={styles.gameBody}>
                                <Text style={styles.gameTitle}>{game.title}</Text>
                                <Text style={styles.gameSubtitle}>{game.subtitle}</Text>
                              </View>
                              <Text style={styles.gameArrow}>›</Text>
                            </Pressable>
                          </FadeInDown>
                        ))
                      )}
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.section },
  section: { marginBottom: 20 },
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
  gameCardPressed: { opacity: 0.94 },
  gameIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  gameBody: { flex: 1 },
  gameTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  gameSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  gameArrow: { fontSize: 22, color: colors.textMuted },
})

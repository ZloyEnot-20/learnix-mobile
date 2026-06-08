import React, { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi, studentsApi } from "../../src/lib/api"
import { LevelScale } from "../../src/components/LevelScale"
import {
  buildTopicSummaries,
  clampToFixedLevel,
  primaryLevel,
} from "../../src/lib/utils"
import {
  CEFR_ORDER,
  isCefrUnlocked,
  requiredLevelFor,
  type StudentLevel,
} from "../../src/types/gamification"
import type { GrammarExercise } from "../../src/types/grammar"
import type { TopicSummary, VocabDeck } from "../../src/types/vocabulary"
import { colors } from "../../src/theme/colors"

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

export default function GamesScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>([])
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

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

  const gamesForLevel = useMemo(() => {
    if (!selectedLevel) return []
    const decks = vocabDecks
      .filter((d) => clampToFixedLevel(primaryLevel([d.level])) === selectedLevel)
      .map((d) => ({
        id: `deck-${d.slug}`,
        title: d.title,
        subtitle: `${d.words.length} words · Flashcards & Quiz`,
        route: `/vocabulary/${d.slug}`,
        kind: "vocab" as const,
      }))
    const topicGames = playableTopics
      .filter((t) => clampToFixedLevel(primaryLevel(t.levels)) === selectedLevel)
      .map((t) => ({
        id: `topic-${t.topic}`,
        title: t.title,
        subtitle: `${t.exerciseCount} rounds · ${t.questionCount} questions`,
        route: `/exercises/${t.topic}`,
        kind: "topic" as const,
      }))
    return [...decks, ...topicGames]
  }, [selectedLevel, vocabDecks, playableTopics])

  if (!user) return null

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🎮 Game Station</Text>
      <Text style={styles.subtitle}>Practise vocabulary and grammar by level</Text>

      <View style={styles.section}>
        <LevelScale studentId={user.id} compact />
      </View>

      {!selectedLevel ? (
        <>
          <Text style={styles.pickTitle}>Choose a level</Text>
          <View style={styles.levelGrid}>
            {LEVELS.map(({ key, label }) => {
              const unlocked = isCefrUnlocked(key, currentLevel)
              const req = requiredLevelFor(key)
              return (
                <Pressable
                  key={key}
                  disabled={!unlocked}
                  onPress={() => setSelectedLevel(key)}
                  style={[
                    styles.levelCard,
                    { borderLeftColor: LEVEL_COLORS[key] },
                    !unlocked && styles.levelLocked,
                  ]}
                >
                  <Text style={styles.levelKey}>{key}</Text>
                  <Text style={styles.levelLabel}>{label}</Text>
                  {!unlocked && (
                    <Text style={styles.lockText}>🔒 Level {req}</Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        </>
      ) : (
        <>
          <Pressable onPress={() => setSelectedLevel(null)} style={styles.backBtn}>
            <Text style={styles.backText}>← All levels</Text>
          </Pressable>
          <Text style={styles.pickTitle}>{selectedLevel} games</Text>
          {gamesForLevel.length === 0 ? (
            <Text style={styles.empty}>No games available for this level yet.</Text>
          ) : (
            gamesForLevel.map((game) => (
              <Pressable
                key={game.id}
                style={styles.gameCard}
                onPress={() => router.push(game.route as never)}
              >
                <Text style={styles.gameEmoji}>
                  {game.kind === "vocab" ? "📚" : "📝"}
                </Text>
                <View style={styles.gameBody}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.gameSubtitle}>{game.subtitle}</Text>
                </View>
                <Text style={styles.gameArrow}>›</Text>
              </Pressable>
            ))
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  section: { marginBottom: 20 },
  pickTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  levelGrid: { gap: 10 },
  levelCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: 16,
  },
  levelLocked: { opacity: 0.55 },
  levelKey: { fontSize: 20, fontWeight: "800", color: colors.text },
  levelLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  lockText: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  empty: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 24 },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  gameEmoji: { fontSize: 28 },
  gameBody: { flex: 1 },
  gameTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  gameSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  gameArrow: { fontSize: 22, color: colors.textMuted },
})

import React, { useCallback, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import { useAuth } from "../../src/context/AuthContext"
import { ContinueLearningBanner } from "../../src/components/ContinueLearningBanner"
import { IeltsMockTestBanner } from "../../src/components/IeltsMockTestBanner"
import { VocabularyReviewBanner } from "../../src/components/VocabularyReviewBanner"
import { LevelScale } from "../../src/components/LevelScale"
import { FadeInDown } from "../../src/components/ui/FadeInDown"
import { HomeSkeleton } from "../../src/components/skeletons/Layouts"
import { testResultsApi } from "../../src/lib/api"
import {
  getVocabularyReviewPreview,
  type VocabularyReviewPreview,
} from "../../src/lib/learned-vocabulary"
import {
  resolveContinueLearning,
  type ContinueLearningItem,
} from "../../src/lib/continue-learning"
import { requestNotificationsRefresh } from "../../src/lib/notifications-refresh"
import type { TestResult } from "../../src/types/domain"
import { colors, radius, shadow, spacing, typography, subjectColors } from "../../src/theme/tokens"

const TEST_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  reading: "book-outline",
  listening: "headset-outline",
  writing: "create-outline",
  speaking: "mic-outline",
}

export default function HomeScreen() {
  const { user } = useAuth()
  const [results, setResults] = useState<TestResult[]>([])
  const [continueItem, setContinueItem] = useState<ContinueLearningItem | null>(null)
  const [vocabPreview, setVocabPreview] = useState<VocabularyReviewPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [data, cont, review] = await Promise.all([
        testResultsApi.list(),
        resolveContinueLearning(user.id),
        getVocabularyReviewPreview(user.id),
      ])
      setResults(data)
      setContinueItem(cont)
      setVocabPreview(review)
    } catch {
      setResults([])
      setContinueItem(null)
      setVocabPreview(null)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      requestNotificationsRefresh()
      setLoading(true)
      load().finally(() => setLoading(false))
    }, [load]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (!user) return null

  const showSkeleton = loading || refreshing

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <FadeInDown index={0}>
        <Text style={styles.greeting}>Hello, {user.name.split(" ")[0]}</Text>
        <Text style={styles.subGreeting}>Track your progress and level</Text>
      </FadeInDown>

      {showSkeleton ? (
        <HomeSkeleton />
      ) : (
        <>
          {continueItem ? (
            <FadeInDown index={1}>
              <ContinueLearningBanner item={continueItem} />
            </FadeInDown>
          ) : null}

          {vocabPreview ? (
            <FadeInDown index={continueItem ? 2 : 1}>
              <VocabularyReviewBanner preview={vocabPreview} />
            </FadeInDown>
          ) : null}

          <FadeInDown
            index={continueItem && vocabPreview ? 3 : continueItem || vocabPreview ? 2 : 1}
            style={styles.section}
          >
            <LevelScale studentId={user.id} />
          </FadeInDown>

          <FadeInDown
            index={continueItem && vocabPreview ? 4 : continueItem || vocabPreview ? 3 : 2}
          >
            <IeltsMockTestBanner />
          </FadeInDown>

          {results.length > 0 && (
            <FadeInDown
              index={continueItem && vocabPreview ? 5 : continueItem || vocabPreview ? 4 : 3}
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
  greeting: { ...typography.h2, color: colors.text },
  subGreeting: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
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

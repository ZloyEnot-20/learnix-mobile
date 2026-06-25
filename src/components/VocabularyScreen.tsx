import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FlashcardSwipe } from "./FlashcardSwipe"
import { ResultStatusIcon, resultVariant } from "./exercise/shared"
import { BackButton } from "./ui/BackButton"
import {
  HomeworkExerciseLayout,
  HomeworkFooterButton,
  HomeworkResultsLayout,
  HomeworkSourceCard,
} from "./homework/HomeworkExerciseLayout"
import { controlWorkApi, homeworkApi } from "../lib/api"
import {
  getWantToLearn,
  recordVocabDeckCompletion,
  toggleWantToLearn,
} from "../lib/learned-vocabulary"
import { shuffle } from "../lib/utils"
import {
  wordTranslation,
  type TranslationLang,
  type VocabDeck,
  type VocabWord,
} from "../types/vocabulary"
import { colors } from "../theme/colors"
import { radius, shadow, spacing } from "../theme/tokens"
import type { IssueReportPayload } from "../types/issue-report"

type Mode = "menu" | "flashcards" | "quiz" | "results"

interface VocabScreenProps {
  deck: VocabDeck
  homeworkId?: string
  controlWorkId?: string
  stepIndex?: number
  isStudent: boolean
  homeworkMode?: boolean
  studentId?: string
  onQuizActiveChange?: (active: boolean) => void
  onSessionEnd?: () => void
}

export function VocabularyScreen({
  deck,
  homeworkId,
  controlWorkId,
  stepIndex,
  isStudent,
  homeworkMode = false,
  studentId,
  onQuizActiveChange,
  onSessionEnd,
}: VocabScreenProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(homeworkMode ? "quiz" : "menu")
  const [lang, setLang] = useState<TranslationLang>("uz")
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 })

  useEffect(() => {
    if (homeworkId && isStudent && !homeworkMode) {
      void homeworkApi.start(homeworkId).catch(() => {})
    }
  }, [homeworkId, isStudent, homeworkMode])

  useEffect(() => {
    onQuizActiveChange?.(mode === "quiz")
  }, [mode, onQuizActiveChange])

  const handleQuizComplete = (correct: number, total: number, wordAnswers: { term: string; correct: boolean; deckSlug: string }[]) => {
    onQuizActiveChange?.(false)
    onSessionEnd?.()
    setQuizScore({ correct, total })
    setMode("results")
    if (studentId) {
      void recordVocabDeckCompletion(
        studentId,
        deck,
        correct,
        total,
        homeworkMode ? "homework" : "game",
        wordAnswers,
      )
    }
    if (controlWorkId != null && stepIndex != null && isStudent) {
      void controlWorkApi
        .completeStep(controlWorkId, stepIndex, {
          totalQuestions: total,
          correctCount: correct,
          mistakes: [],
        })
        .catch(() => {})
    } else if (homeworkId && isStudent) {
      void homeworkApi
        .recordAttempt(homeworkId, {
          totalQuestions: total,
          correctCount: correct,
          mistakes: [],
        })
        .catch(() => {})
    }
  }

  if (mode === "menu" && !homeworkMode) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <BackButton onPress={() => router.back()} style={styles.back} />
        <Text style={styles.deckTitle}>{deck.title}</Text>
        <Text style={styles.deckDesc}>{deck.description}</Text>
        <View style={styles.langRow}>
          {(["uz", "ru"] as const).map((l) => (
            <Pressable
              key={l}
              onPress={() => setLang(l)}
              style={[styles.langBtn, lang === l && styles.langBtnActive]}
            >
              <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                {l.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.modeCard} onPress={() => setMode("flashcards")}>
          <View style={styles.modeIconWrap}>
            <Ionicons name="albums-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.modeTitle}>Flashcards</Text>
          <Text style={styles.modeDesc}>{deck.words.length} words · Swipe & flip</Text>
        </Pressable>
        <Pressable style={styles.modeCard} onPress={() => setMode("quiz")}>
          <View style={styles.modeIconWrap}>
            <Ionicons name="help-circle-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.modeTitle}>Quiz</Text>
          <Text style={styles.modeDesc}>Test yourself with multiple choice</Text>
        </Pressable>
      </ScrollView>
    )
  }

  if (mode === "flashcards") {
    return (
      <Flashcards
        deck={deck}
        lang={lang}
        studentId={studentId}
        onExit={() => setMode("menu")}
        onQuiz={() => setMode("quiz")}
      />
    )
  }

  if (mode === "quiz") {
    return (
      <Quiz
        deck={deck}
        lang={lang}
        homeworkMode={homeworkMode}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        onExit={() => setMode(homeworkMode ? "quiz" : "menu")}
        onComplete={handleQuizComplete}
      />
    )
  }

  const passed = quizScore.correct >= Math.ceil(quizScore.total * 0.6)

  if (homeworkMode) {
    return (
      <HomeworkResultsLayout
        footer={<HomeworkFooterButton label="Done" onPress={() => router.back()} />}
      >
        <View style={styles.homeworkResultsHero}>
          <ResultStatusIcon variant={resultVariant(false, passed)} />
          <Text style={styles.homeworkResultsTitle}>Quiz complete!</Text>
          <Text style={styles.homeworkResultsScore}>
            {quizScore.correct}/{quizScore.total} correct
          </Text>
        </View>
      </HomeworkResultsLayout>
    )
  }

  return (
    <View style={styles.resultsWrap}>
      <View style={styles.resultsBody}>
        <ResultStatusIcon variant={resultVariant(false, passed)} />
        <Text style={styles.resultsTitle}>Quiz complete!</Text>
        <Text style={styles.resultsScore}>
          {quizScore.correct}/{quizScore.total} correct
        </Text>
        <Pressable
          style={styles.resultsBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  )
}

function Flashcards({
  deck,
  lang,
  studentId,
  onExit,
  onQuiz,
}: {
  deck: VocabDeck
  lang: TranslationLang
  studentId?: string
  onExit: () => void
  onQuiz: () => void
}) {
  const [index, setIndex] = useState(0)
  const [wantToLearn, setWantToLearn] = useState(false)
  const [wantLoading, setWantLoading] = useState(false)
  const insets = useSafeAreaInsets()
  const words = deck.words
  const word = words[index]

  const loadWantState = useCallback(async () => {
    if (!studentId || !word) {
      setWantToLearn(false)
      return
    }
    const state = await getWantToLearn(studentId, word.term, deck.slug)
    setWantToLearn(state)
  }, [studentId, word, deck.slug])

  useEffect(() => {
    void loadWantState()
  }, [loadWantState])

  const next = () => {
    setIndex((i) => (i + 1 >= words.length ? 0 : i + 1))
  }

  const prev = () => {
    setIndex((i) => (i - 1 < 0 ? words.length - 1 : i - 1))
  }

  const handleToggleWant = async () => {
    if (!studentId || !word || wantLoading) return
    setWantLoading(true)
    try {
      const nextState = await toggleWantToLearn(studentId, word, deck)
      setWantToLearn(nextState)
    } finally {
      setWantLoading(false)
    }
  }

  if (!word) return null

  return (
    <View style={styles.container}>
      <View style={styles.fcHeader}>
        <BackButton onPress={onExit} />
        <Text style={styles.fcCounter}>
          {index + 1} / {words.length}
        </Text>
        <View style={styles.fcHeaderSpacer} />
      </View>

      <View style={styles.fcBody}>
        <FlashcardSwipe
          cardKey={`${deck.slug}-${word.id}-${index}`}
          onSwipeLeft={next}
          onSwipeRight={prev}
          front={
            <>
              <Text style={styles.fcPos}>{word.partOfSpeech}</Text>
              <Text style={styles.fcTerm} numberOfLines={3} adjustsFontSizeToFit>
                {word.term}
              </Text>
              <Text style={styles.fcHint}>Tap to see translation</Text>
            </>
          }
          back={
            <>
              <Text style={styles.fcPos}>{word.partOfSpeech}</Text>
              <Text style={styles.fcTerm} numberOfLines={2} adjustsFontSizeToFit>
                {wordTranslation(word, lang)}
              </Text>
              <Text style={styles.fcDef} numberOfLines={3}>
                {word.definition}
              </Text>
              <Text style={styles.fcExample} numberOfLines={2}>
                “{word.example}”
              </Text>
            </>
          }
        />
      </View>

      <View style={[styles.fcFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {studentId ? (
          <Pressable
            style={[styles.wantBtn, wantToLearn && styles.wantBtnActive]}
            onPress={() => void handleToggleWant()}
            disabled={wantLoading}
          >
            <Ionicons
              name={wantToLearn ? "bookmark" : "bookmark-outline"}
              size={18}
              color={wantToLearn ? "#6D28D9" : colors.textSecondary}
            />
            <Text style={[styles.wantBtnText, wantToLearn && styles.wantBtnTextActive]}>
              {wantToLearn ? "Learning — appears in review" : "I want to learn this word"}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.fcNav}>
          <Pressable style={styles.navBtn} onPress={prev}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={styles.navBtnText}>Prev</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={next}>
            <Text style={styles.navBtnText}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>
        <Pressable style={styles.quizLink} onPress={onQuiz}>
          <Text style={styles.quizLinkText}>Start quiz</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  )
}

function Quiz({
  deck,
  lang,
  homeworkMode,
  homeworkId,
  controlWorkId,
  stepIndex,
  onExit,
  onComplete,
}: {
  deck: VocabDeck
  lang: TranslationLang
  homeworkMode?: boolean
  homeworkId?: string
  controlWorkId?: string
  stepIndex?: number
  onExit: () => void
  onComplete: (
    correct: number,
    total: number,
    wordAnswers: { term: string; correct: boolean; deckSlug: string }[],
  ) => void
}) {
  const questions = useMemo(() => shuffle(deck.words), [deck.words])
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [wordAnswers, setWordAnswers] = useState<{ term: string; correct: boolean; deckSlug: string }[]>([])

  const word = questions[index]
  const options = useMemo(() => {
    if (!word) return []
    const others = deck.words.filter((w) => w.id !== word.id)
    const distractors = shuffle(others).slice(0, 3).map((w) => wordTranslation(w, lang))
    return shuffle([wordTranslation(word, lang), ...distractors])
  }, [word, deck.words, lang])

  if (!word) return null

  const handleCheck = () => {
    if (selected == null || checked) return
    const isCorrect = selected === wordTranslation(word, lang)
    const nextCorrect = isCorrect ? correct + 1 : correct
    const answer = { term: word.term, correct: isCorrect, deckSlug: deck.slug }
    const nextAnswers = [...wordAnswers, answer]
    setWordAnswers(nextAnswers)
    if (isCorrect) setCorrect((c) => c + 1)

    if (homeworkMode) {
      Keyboard.dismiss()
      if (index + 1 >= questions.length) {
        onComplete(nextCorrect, questions.length, nextAnswers)
      } else {
        setIndex((i) => i + 1)
        setSelected(null)
      }
      return
    }

    setChecked(true)
  }

  const handleNext = () => {
    Keyboard.dismiss()
    if (index + 1 >= questions.length) {
      onComplete(correct, questions.length, wordAnswers)
      return
    }
    if (checked) {
      setIndex((i) => i + 1)
      setSelected(null)
      setChecked(false)
    }
  }

  const correctAnswer = wordTranslation(word, lang)

  const optionsBlock = (
    <View style={homeworkMode ? styles.homeworkMcOptions : styles.options}>
      {options.map((opt, optIndex) => (
        <Pressable
          key={`${index}-opt-${optIndex}`}
          disabled={checked}
          onPress={() => setSelected(opt)}
          style={[
            homeworkMode ? styles.homeworkMcOption : styles.option,
            selected === opt && !checked && (homeworkMode ? styles.homeworkOptionSelected : styles.optionSelected),
            !homeworkMode && checked && opt === correctAnswer && styles.optionCorrect,
            !homeworkMode && checked && selected === opt && opt !== correctAnswer && styles.optionWrong,
          ]}
        >
          <Text style={homeworkMode ? styles.homeworkMcOptionText : styles.optionText}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  )

  const actionButton = homeworkMode ? (
    <Pressable
      style={[styles.homeworkBtn, selected == null && styles.btnDisabled]}
      onPress={handleCheck}
      disabled={selected == null}
    >
      <Text style={styles.homeworkBtnText}>
        {index + 1 >= questions.length ? "See results" : "Next"}
      </Text>
    </Pressable>
  ) : !checked ? (
    <Pressable
      style={[styles.primaryBtn, selected == null && styles.btnDisabled]}
      onPress={handleCheck}
      disabled={selected == null}
    >
      <Text style={styles.primaryBtnText}>Check</Text>
    </Pressable>
  ) : (
    <Pressable style={styles.primaryBtn} onPress={handleNext}>
      <Text style={styles.primaryBtnText}>
        {index + 1 >= questions.length ? "See results" : "Next"}
      </Text>
    </Pressable>
  )

  if (homeworkMode) {
    const reportIssue: IssueReportPayload | undefined =
      homeworkId || controlWorkId
        ? {
            homeworkId,
            controlWorkId,
            stepIndex,
            exerciseSlug: deck.slug,
            exerciseTitle: deck.title,
            exerciseKind: "vocabulary",
            questionIndex: index,
            questionPrompt: word.term,
          }
        : undefined

    return (
      <HomeworkExerciseLayout
        index={index}
        total={questions.length}
        instruction="Choose the correct translation."
        footer={actionButton}
        reportIssue={reportIssue}
      >
        <HomeworkSourceCard source={word.term} />
        {optionsBlock}
      </HomeworkExerciseLayout>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!homeworkMode && <BackButton onPress={onExit} style={styles.back} />}
      <View style={styles.quizProgressRow}>
        <Text style={styles.quizProgress}>
          Question {index + 1}/{questions.length}
        </Text>
        <View style={styles.quizCorrectRow}>
          <Ionicons name="checkmark" size={12} color={colors.success} />
          <Text style={styles.quizCorrectText}>{correct}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.quizTerm}>{word.term}</Text>
        <Text style={styles.quizDef}>{word.definition}</Text>
        {optionsBlock}
        {actionButton}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  back: { marginBottom: 12 },
  deckTitle: { fontSize: 24, fontWeight: "700", color: colors.text },
  deckDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 16 },
  langRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langBtnActive: { backgroundColor: "#EDE9FE", borderColor: "#8B5CF6" },
  langText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  langTextActive: { color: "#6D28D9" },
  modeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 12,
  },
  modeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  modeTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modeDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  fcHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  fcHeaderSpacer: { width: 44 },
  fcCounter: { fontSize: 15, color: colors.textSecondary, fontWeight: "600" },
  fcBody: { flex: 1, minHeight: 0 },
  fcFooter: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  wantBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.section,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  wantBtnActive: {
    borderColor: "#C4B5FD",
    backgroundColor: "#F5F3FF",
  },
  wantBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flexShrink: 1,
  },
  wantBtnTextActive: {
    color: "#6D28D9",
  },
  fcPos: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6D28D9",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "#EDE9FE",
    overflow: "hidden",
  },
  fcTerm: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    width: "100%",
  },
  fcHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  fcDef: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    width: "100%",
  },
  fcExample: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 20,
    width: "100%",
  },
  fcNav: { flexDirection: "row", gap: spacing.md },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  navBtnText: { fontSize: 15, fontWeight: "600", color: colors.text },
  quizLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
  },
  quizLinkText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  quizProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  quizProgress: { fontSize: 14, color: colors.textSecondary },
  quizCorrectRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  quizCorrectText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  quizTerm: { fontSize: 22, fontWeight: "700", color: colors.text },
  quizDef: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 16 },
  options: { gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  optionSelected: { borderColor: colors.indigo, backgroundColor: "#EEF2FF" },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.error, backgroundColor: colors.errorBg },
  optionText: { fontSize: 16, color: colors.text },
  primaryBtn: {
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  resultsWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    width: "100%",
  },
  resultsBody: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  resultsBtn: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 24,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
    textAlign: "center",
  },
  resultsScore: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  homeworkMcOptions: {
    gap: 8,
    marginTop: 16,
  },
  homeworkMcOption: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    width: "100%",
  },
  homeworkOptionSelected: {
    borderColor: "#01AEF9",
    backgroundColor: "#E8F6FF",
  },
  homeworkMcOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 22,
  },
  homeworkBtn: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: "#01AEF9",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  homeworkBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  homeworkResultsHero: {
    width: "100%",
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 16,
  },
  homeworkResultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginTop: 8,
  },
  homeworkResultsScore: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
})

import React, { useEffect, useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { ResultStatusIcon, resultVariant } from "./exercise/shared"
import { BackButton } from "./ui/BackButton"
import { controlWorkApi, homeworkApi } from "../lib/api"
import { recordVocabDeckCompletion } from "../lib/learned-vocabulary"
import { shuffle } from "../lib/utils"
import {
  wordTranslation,
  type TranslationLang,
  type VocabDeck,
  type VocabWord,
} from "../types/vocabulary"
import { colors } from "../theme/colors"

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

  const handleQuizComplete = (correct: number, total: number) => {
    onQuizActiveChange?.(false)
    setQuizScore({ correct, total })
    setMode("results")
    if (studentId) {
      void recordVocabDeckCompletion(
        studentId,
        deck,
        correct,
        total,
        homeworkMode ? "homework" : "game",
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
        onExit={() => setMode(homeworkMode ? "quiz" : "menu")}
        onComplete={handleQuizComplete}
      />
    )
  }

  const passed = quizScore.correct >= Math.ceil(quizScore.total * 0.6)

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
  onExit,
  onQuiz,
}: {
  deck: VocabDeck
  lang: TranslationLang
  onExit: () => void
  onQuiz: () => void
}) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const words = deck.words
  const word = words[index]

  const next = () => {
    setFlipped(false)
    setIndex((i) => (i + 1 >= words.length ? 0 : i + 1))
  }

  const prev = () => {
    setFlipped(false)
    setIndex((i) => (i - 1 < 0 ? words.length - 1 : i - 1))
  }

  if (!word) return null

  return (
    <View style={styles.container}>
      <View style={styles.fcHeader}>
        <BackButton onPress={onExit} />
        <Text style={styles.fcCounter}>
          {index + 1}/{words.length}
        </Text>
      </View>
      <Pressable style={styles.flashcard} onPress={() => setFlipped(!flipped)}>
        <Text style={styles.fcPos}>{word.partOfSpeech}</Text>
        <Text style={styles.fcTerm}>{flipped ? wordTranslation(word, lang) : word.term}</Text>
        {!flipped && <Text style={styles.fcDef}>{word.definition}</Text>}
        {flipped && <Text style={styles.fcExample}>{word.example}</Text>}
        <Text style={styles.fcHint}>Tap to flip</Text>
      </Pressable>
      <View style={styles.fcNav}>
        <Pressable style={styles.navBtn} onPress={prev}>
          <Text style={styles.navBtnText}>← Prev</Text>
        </Pressable>
        <Pressable style={styles.navBtn} onPress={next}>
          <Text style={styles.navBtnText}>Next →</Text>
        </Pressable>
      </View>
      <Pressable style={styles.quizLink} onPress={onQuiz}>
        <Text style={styles.quizLinkText}>Start quiz →</Text>
      </Pressable>
    </View>
  )
}

function Quiz({
  deck,
  lang,
  homeworkMode,
  onExit,
  onComplete,
}: {
  deck: VocabDeck
  lang: TranslationLang
  homeworkMode?: boolean
  onExit: () => void
  onComplete: (correct: number, total: number) => void
}) {
  const questions = useMemo(() => shuffle(deck.words), [deck.words])
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

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
    if (isCorrect) setCorrect((c) => c + 1)
    setChecked(true)
  }

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      onComplete(correct, questions.length)
      return
    }
    if (checked) {
      setIndex((i) => i + 1)
      setSelected(null)
      setChecked(false)
    }
  }

  const correctAnswer = wordTranslation(word, lang)

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
        <View style={styles.options}>
          {options.map((opt, optIndex) => (
            <Pressable
              key={`${index}-opt-${optIndex}`}
              disabled={checked}
              onPress={() => setSelected(opt)}
              style={[
                styles.option,
                selected === opt && !checked && styles.optionSelected,
                checked && opt === correctAnswer && styles.optionCorrect,
                checked && selected === opt && opt !== correctAnswer && styles.optionWrong,
              ]}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </Pressable>
          ))}
        </View>
        {!checked ? (
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
        )}
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
    justifyContent: "space-between",
    padding: 16,
  },
  fcCounter: { fontSize: 14, color: colors.textSecondary, fontWeight: "600" },
  flashcard: {
    margin: 16,
    backgroundColor: "#EDE9FE",
    borderRadius: 20,
    padding: 32,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  fcPos: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6D28D9",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  fcTerm: { fontSize: 28, fontWeight: "700", color: colors.text, textAlign: "center" },
  fcDef: { fontSize: 15, color: colors.textSecondary, marginTop: 12, textAlign: "center" },
  fcExample: { fontSize: 14, color: colors.textSecondary, marginTop: 12, fontStyle: "italic", textAlign: "center" },
  fcHint: { fontSize: 12, color: colors.textMuted, marginTop: 20 },
  fcNav: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  navBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navBtnText: { fontSize: 15, fontWeight: "600", color: colors.text },
  quizLink: { alignItems: "center", marginTop: 20 },
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
})

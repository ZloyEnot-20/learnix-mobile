import React, { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { LearnedWord } from "../lib/learned-vocabulary"
import { shuffle } from "../lib/utils"
import { wordTranslation, type TranslationLang, type VocabWord } from "../types/vocabulary"
import { ResultStatusIcon, resultVariant } from "./exercise/shared"
import { colors, radius, shadow, spacing, typography } from "../theme/tokens"

interface VocabularyReviewQuizProps {
  words: LearnedWord[]
  onDone: () => void
}

function asVocabWord(word: LearnedWord): VocabWord {
  return {
    id: word.term,
    term: word.term,
    partOfSpeech: word.partOfSpeech as VocabWord["partOfSpeech"],
    definition: word.definition,
    example: word.example,
    translation: word.translation,
    translationUz: word.translationUz,
  }
}

export function VocabularyReviewQuiz({ words, onDone }: VocabularyReviewQuizProps) {
  const [lang] = useState<TranslationLang>("uz")
  const questions = useMemo(() => shuffle(words), [words])
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [finished, setFinished] = useState(false)

  const word = questions[index]
  const options = useMemo(() => {
    if (!word) return []
    const others = questions.filter((w) => w.term !== word.term)
    const distractors = shuffle(others)
      .slice(0, 3)
      .map((w) => wordTranslation(asVocabWord(w), lang))
    return shuffle([wordTranslation(asVocabWord(word), lang), ...distractors])
  }, [word, questions, lang, index])

  if (finished) {
    const passed = correct >= Math.ceil(questions.length * 0.6)
    const scorePct = Math.round((correct / questions.length) * 100)

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.resultsScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultsCard}>
          <ResultStatusIcon variant={resultVariant(false, passed)} />
          <Text style={styles.resultsTitle}>Review complete!</Text>
          <Text style={styles.resultsScore}>
            {correct}/{questions.length} correct ({scorePct}%)
          </Text>
          <Text style={styles.resultsMeta}>
            {passed ? "Great recall — keep it up!" : "Review again soon to strengthen memory"}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.resultsBtn, pressed && styles.resultsBtnPressed]}
            onPress={onDone}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    )
  }

  if (!word) return null

  const correctAnswer = wordTranslation(asVocabWord(word), lang)

  const handleCheck = () => {
    if (selected == null || checked) return
    if (selected === correctAnswer) setCorrect((c) => c + 1)
    setChecked(true)
  }

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setChecked(false)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          Question {index + 1}/{questions.length}
        </Text>
        <View style={styles.correctRow}>
          <Ionicons name="checkmark" size={12} color={colors.success} />
          <Text style={styles.correctText}>{correct}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.term}>{word.term}</Text>
        <Text style={styles.definition}>{word.definition}</Text>
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
            disabled={selected == null}
            onPress={handleCheck}
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
  content: { padding: spacing.screen, paddingBottom: spacing.xl },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  progressText: { fontSize: 14, color: colors.textSecondary },
  correctRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  correctText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.section,
  },
  term: { fontSize: 22, fontWeight: "700", color: colors.text },
  definition: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: spacing.md },
  options: { gap: spacing.sm },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    padding: 14,
  },
  optionSelected: { borderColor: colors.indigo, backgroundColor: "#EEF2FF" },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.error, backgroundColor: colors.errorBg },
  optionText: { fontSize: 16, color: colors.text },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  resultsScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.screen,
    paddingBottom: spacing.xl,
  },
  resultsCard: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    ...shadow.card,
  },
  resultsTitle: {
    ...typography.h2,
    fontSize: 24,
    color: colors.text,
    textAlign: "center",
    marginTop: 4,
  },
  resultsScore: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  resultsMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  resultsBtn: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: spacing.lg,
  },
  resultsBtnPressed: { opacity: 0.92, backgroundColor: colors.primaryDark },
})

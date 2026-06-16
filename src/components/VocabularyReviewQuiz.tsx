import React, { useMemo, useRef, useState } from "react"
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useKeyboardHeight } from "../hooks/useKeyboardHeight"
import {
  CORRECT_FOR_TYPED_REVIEW,
  buildReviewOptionWords,
  matchesTypedTerm,
  needsTypedReview,
  recordReviewAnswer,
  studyWordKey,
  type StudyWord,
} from "../lib/learned-vocabulary"
import { shuffle } from "../lib/utils"
import { wordTranslation, type TranslationLang, type VocabWord } from "../types/vocabulary"
import { ResultStatusIcon, resultVariant } from "./exercise/shared"
import { WordMasteredCelebration } from "./WordMasteredCelebration"
import { WordMasteryBar } from "./WordMasteryBar"
import { colors, radius, shadow, spacing, typography } from "../theme/tokens"

interface VocabularyReviewQuizProps {
  words: StudyWord[]
  distractorPool: StudyWord[]
  userId: string
  onDone: () => void
}

function asVocabWord(word: StudyWord): VocabWord {
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

function LangToggle({
  lang,
  onChange,
}: {
  lang: TranslationLang
  onChange: (lang: TranslationLang) => void
}) {
  return (
    <View style={styles.langRow}>
      {(["uz", "ru"] as const).map((l) => (
        <Pressable
          key={l}
          onPress={() => onChange(l)}
          style={[styles.langBtn, lang === l && styles.langBtnActive]}
        >
          <Text style={[styles.langText, lang === l && styles.langTextActive]}>
            {l.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function VocabularyReviewQuiz({
  words,
  distractorPool,
  userId,
  onDone,
}: VocabularyReviewQuizProps) {
  const [lang, setLang] = useState<TranslationLang>("uz")
  const [questions] = useState(() => shuffle(words))
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState("")
  const [checked, setChecked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [celebrationWord, setCelebrationWord] = useState<string | null>(null)
  const [wordLineHeight, setWordLineHeight] = useState(28)
  const [progressByKey, setProgressByKey] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const w of words) map[studyWordKey(w)] = w.correctCount
    return map
  })
  /** Progress snapshot when each question is first shown — mode must not flip mid-question. */
  const questionStartProgressRef = useRef<Record<number, number>>({})
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()

  const word = questions[index]
  const wordKey = word ? studyWordKey(word) : ""
  const wordProgress = word ? (progressByKey[wordKey] ?? word.correctCount) : 0

  if (word && questionStartProgressRef.current[index] === undefined) {
    questionStartProgressRef.current[index] = wordProgress
  }
  const questionStartProgress = word ? (questionStartProgressRef.current[index] ?? wordProgress) : 0
  const typedMode = needsTypedReview(questionStartProgress)

  const options = useMemo(() => {
    if (!word || typedMode) return []
    return buildReviewOptionWords(word, distractorPool)
  }, [word, distractorPool, typedMode])

  const handleLangChange = (next: TranslationLang) => {
    setLang(next)
  }

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
            {passed ? "Great recall — keep it up!" : "Review again tomorrow to strengthen memory"}
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

  const correctWordKey = studyWordKey(word)
  const canCheck = typedMode ? typedAnswer.trim().length > 0 : selectedKey != null

  const handleCheck = async () => {
    if (!canCheck || checked) return

    const isCorrect = typedMode
      ? matchesTypedTerm(typedAnswer, word.term)
      : selectedKey === correctWordKey

    if (isCorrect) setCorrect((c) => c + 1)

    const result = await recordReviewAnswer(
      userId,
      word.term,
      word.deckSlug,
      isCorrect,
    )

    if (result) {
      setProgressByKey((prev) => ({ ...prev, [wordKey]: result.correctCount }))
      if (result.newlyMastered) {
        setCelebrationWord(word.term)
      }
    }

    setChecked(true)
  }

  const handleNext = () => {
    if (celebrationWord) return
    if (index + 1 >= questions.length) {
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
    setSelectedKey(null)
    setTypedAnswer("")
    setChecked(false)
  }

  const footerPaddingBottom =
    keyboardHeight > 0 ? keyboardHeight + spacing.sm : Math.max(insets.bottom, spacing.md)

  const actionButton = !checked ? (
    <Pressable
      style={[styles.primaryBtn, !canCheck && styles.btnDisabled]}
      disabled={!canCheck}
      onPress={() => void handleCheck()}
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

  return (
    <>
      <View style={styles.root}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={Keyboard.dismiss} style={styles.dismissArea}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Question {index + 1}/{questions.length}
              </Text>
              <View style={styles.progressRight}>
                <LangToggle lang={lang} onChange={handleLangChange} />
                <View style={styles.correctRow}>
                  <Ionicons name="checkmark" size={12} color={colors.success} />
                  <Text style={styles.correctText}>{correct}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              {typedMode ? (
                <>
                  <View style={styles.wordMain}>
                    <Text style={styles.prompt}>Type the English word for this translation:</Text>
                    <View style={styles.wordWithMastery}>
                      <Text
                        style={styles.typedPrompt}
                        onLayout={(event) => setWordLineHeight(event.nativeEvent.layout.height)}
                      >
                        {wordTranslation(asVocabWord(word), lang)}
                      </Text>
                      <WordMasteryBar progress={wordProgress} height={wordLineHeight} />
                    </View>
                  </View>
                  <Text style={styles.definition}>{word.definition}</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      checked &&
                        (matchesTypedTerm(typedAnswer, word.term)
                          ? styles.textInputCorrect
                          : styles.textInputWrong),
                    ]}
                    value={typedAnswer}
                    onChangeText={setTypedAnswer}
                    editable={!checked}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Enter the word in English"
                    placeholderTextColor={colors.textMuted}
                  />
                  {checked && !matchesTypedTerm(typedAnswer, word.term) ? (
                    <Text style={styles.revealAnswer}>
                      Correct answer: <Text style={styles.revealTerm}>{word.term}</Text>
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={[styles.wordWithMastery, styles.wordWithMasteryBlock]}>
                    <Text
                      style={styles.term}
                      numberOfLines={3}
                      onLayout={(event) => setWordLineHeight(event.nativeEvent.layout.height)}
                    >
                      {word.term}
                    </Text>
                    <WordMasteryBar progress={wordProgress} height={wordLineHeight} />
                  </View>
                  <Text style={styles.definition}>{word.definition}</Text>
                  {questionStartProgress >= CORRECT_FOR_TYPED_REVIEW - 1 &&
                  !typedMode ? (
                    <Text style={styles.modeHint}>
                      Next correct answer unlocks typing mode
                    </Text>
                  ) : null}
                  <View style={styles.options}>
                    {options.map((optionWord) => {
                      const optionKey = studyWordKey(optionWord)
                      const label = wordTranslation(asVocabWord(optionWord), lang)
                      return (
                        <Pressable
                          key={optionKey}
                          disabled={checked}
                          onPress={() => setSelectedKey(optionKey)}
                          style={[
                            styles.option,
                            selectedKey === optionKey && !checked && styles.optionSelected,
                            checked && optionKey === correctWordKey && styles.optionCorrect,
                            checked &&
                              selectedKey === optionKey &&
                              optionKey !== correctWordKey &&
                              styles.optionWrong,
                          ]}
                        >
                          <Text style={styles.optionText}>{label}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </>
              )}
            </View>
          </Pressable>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>{actionButton}</View>
      </View>

      <WordMasteredCelebration
        visible={celebrationWord != null}
        word={celebrationWord ?? ""}
        onDismiss={() => setCelebrationWord(null)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.screen,
    paddingBottom: spacing.md,
  },
  dismissArea: { flexGrow: 1 },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  progressRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  progressText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  correctRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  correctText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  langRow: { flexDirection: "row", gap: 6 },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  langBtnActive: { backgroundColor: "#EDE9FE", borderColor: "#8B5CF6" },
  langText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  langTextActive: { color: "#6D28D9" },
  wordWithMastery: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  wordMain: {
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.section,
  },
  prompt: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  typedPrompt: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  wordWithMasteryBlock: {
    marginBottom: spacing.sm,
  },
  term: { fontSize: 22, fontWeight: "700", color: colors.text, flexShrink: 1 },
  definition: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },
  modeHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
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
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  textInputCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  textInputWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  revealAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  revealTerm: {
    fontWeight: "700",
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
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

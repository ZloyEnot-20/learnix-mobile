import React, { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import type { IeltsReadingQuestion, IeltsReadingQuestionSection } from "../../types/ielts"
import {
  extractReadingOptionValue,
  formatReadingChoiceLabel,
} from "../../lib/ielts-reading"
import { normalizeInlineBlankContent } from "../../lib/inline-blanks"
import { colors, radius, spacing } from "../../theme/tokens"

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"] as const

function isChoiceSelected(option: string, answer: string): boolean {
  if (!answer) return false
  const optionKey = extractReadingOptionValue(option)
  return answer === option || answer.toLowerCase() === optionKey.toLowerCase()
}

function InlineBlank({
  questionId,
  answer,
  onChange,
}: {
  questionId: number
  answer: string
  onChange: (value: string) => void
}) {
  return (
    <View style={styles.inlineBlankWrap}>
      <Text style={styles.inlineBlankNum}>{questionId}</Text>
      <TextInput
        value={answer}
        onChangeText={onChange}
        placeholder="…"
        placeholderTextColor={colors.textMuted}
        style={styles.inlineBlankInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

function LetterBlank({
  questionId,
  answer,
  focused,
  onFocus,
}: {
  questionId: number
  answer: string
  focused: boolean
  onFocus: () => void
}) {
  return (
    <Pressable
      onPress={onFocus}
      style={[styles.letterBlank, focused && styles.letterBlankFocused]}
    >
      <Text style={styles.letterBlankNum}>{questionId}</Text>
      <Text style={[styles.letterBlankValue, !answer && styles.letterBlankEmpty]}>
        {answer.trim() || "—"}
      </Text>
    </Pressable>
  )
}

function ContentLine({
  line,
  answers,
  onAnswerChange,
  letterMode,
  focusedBlank,
  onFocusBlank,
}: {
  line: string
  answers: Record<number, string>
  onAnswerChange: (questionId: number, value: string) => void
  letterMode: boolean
  focusedBlank: number | null
  onFocusBlank: (qid: number) => void
}) {
  const parts = line.split(/(\[\d+\])/)
  const hasBlank = parts.some((part) => /^\[\d+\]$/.test(part))

  if (!hasBlank) {
    if (line === "→") {
      return <Text style={styles.arrowLine}>↓</Text>
    }
    return <Text style={styles.contentLine}>{line}</Text>
  }

  return (
    <View style={styles.contentLineRow}>
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/)
        if (!match) {
          if (!part) return null
          return (
            <Text key={`t-${index}`} style={styles.contentLine}>
              {part}
            </Text>
          )
        }
        const qid = Number.parseInt(match[1], 10)
        if (letterMode) {
          return (
            <LetterBlank
              key={`b-${qid}`}
              questionId={qid}
              answer={answers[qid] ?? ""}
              focused={focusedBlank === qid}
              onFocus={() => onFocusBlank(qid)}
            />
          )
        }
        return (
          <InlineBlank
            key={`b-${qid}`}
            questionId={qid}
            answer={answers[qid] ?? ""}
            onChange={(value) => onAnswerChange(qid, value)}
          />
        )
      })}
    </View>
  )
}

function renderSectionBody(
  content: string,
  answers: Record<number, string>,
  onAnswerChange: (questionId: number, value: string) => void,
  letterMode: boolean,
  focusedBlank: number | null,
  onFocusBlank: (qid: number) => void,
) {
  const lines = normalizeInlineBlankContent(content).split("\n").filter(Boolean)
  return (
    <View style={styles.contentBody}>
      {lines.map((line, index) => (
        <ContentLine
          key={`line-${index}`}
          line={line}
          answers={answers}
          onAnswerChange={onAnswerChange}
          letterMode={letterMode}
          focusedBlank={focusedBlank}
          onFocusBlank={onFocusBlank}
        />
      ))}
    </View>
  )
}

function StatementQuestion({
  question,
  answer,
  onChange,
}: {
  question: IeltsReadingQuestion
  answer: string
  onChange: (value: string) => void
}) {
  if (question.type === "true-false-not-given" || question.type === "yes-no-not-given") {
    const options =
      question.type === "yes-no-not-given"
        ? (["YES", "NO", "NOT GIVEN"] as const)
        : TFNG_OPTIONS
    return (
      <View style={styles.qBlock}>
        <Text style={styles.qPrompt}>
          <Text style={styles.qNum}>{question.id}. </Text>
          {question.question}
        </Text>
        <View style={styles.optionRow}>
          {options.map((opt) => {
            const selected = answer.toUpperCase() === opt
            return (
              <Pressable
                key={opt}
                onPress={() => onChange(opt)}
                style={[styles.optionPill, selected && styles.optionPillSelected]}
              >
                <Text style={[styles.optionPillText, selected && styles.optionPillTextSelected]}>
                  {opt === "NOT GIVEN" ? "N/G" : opt[0] + opt.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  if (question.type === "multiple-choice" && question.options?.length) {
    return (
      <View style={styles.qBlock}>
        {question.question ? (
          <Text style={styles.qPrompt}>
            <Text style={styles.qNum}>{question.id}. </Text>
            {question.question}
          </Text>
        ) : (
          <Text style={styles.qPrompt}>
            <Text style={styles.qNum}>{question.id}.</Text>
          </Text>
        )}
        <View style={styles.choiceList}>
          {question.options.map((opt, index) => {
            const selected = isChoiceSelected(opt, answer)
            const optionValue = extractReadingOptionValue(opt)
            return (
              <Pressable
                key={`${index}-${opt}`}
                onPress={() => onChange(optionValue)}
                style={[styles.choiceCard, selected && styles.choiceCardSelected]}
              >
                <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                  {formatReadingChoiceLabel(opt, index)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  if (!question.question) return null

  return (
    <View style={styles.qBlock}>
      <Text style={styles.qPrompt}>
        <Text style={styles.qNum}>{question.id}. </Text>
        {question.question}
      </Text>
      <TextInput
        value={answer}
        onChangeText={onChange}
        placeholder="Your answer"
        placeholderTextColor={colors.textMuted}
        style={styles.textInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

export function ReadingSectionContent({
  section,
  answers,
  onAnswerChange,
}: {
  section: IeltsReadingQuestionSection
  answers: Record<number, string>
  onAnswerChange: (questionId: number, value: string) => void
}) {
  const hasInlineContent = Boolean(section.content?.includes("["))
  const sharedOptions = section.options ?? []
  /** Shared A–J bank with inline `[N]` blanks (summary / notes with letters). */
  const letterMode = sharedOptions.length > 0 && hasInlineContent
  /**
   * Matching sentence endings / features: stems listed as questions + shared
   * ending bank (no inline content). Pick a letter for the focused stem.
   */
  const matchingBankMode =
    sharedOptions.length > 0 &&
    !hasInlineContent &&
    section.questions.some((q) => Boolean(q.question?.trim()))

  const blankIds = useMemo(() => {
    if (hasInlineContent && section.content) {
      return [...section.content.matchAll(/\[(\d+)\]/g)].map((m) => Number.parseInt(m[1], 10))
    }
    if (matchingBankMode) return section.questions.map((q) => q.id)
    return [] as number[]
  }, [hasInlineContent, matchingBankMode, section.content, section.questions])

  const [focusedBlank, setFocusedBlank] = useState<number | null>(blankIds[0] ?? null)

  const listQuestions = useMemo(() => {
    if (matchingBankMode) return [] as IeltsReadingQuestion[]
    if (hasInlineContent) {
      return section.questions.filter(
        (q) =>
          (q.type === "true-false-not-given" ||
            q.type === "yes-no-not-given" ||
            (q.type === "multiple-choice" && !letterMode)) &&
          Boolean(q.question?.trim()),
      )
    }
    return section.questions
  }, [hasInlineContent, letterMode, matchingBankMode, section.questions])

  const showOptionsBank = (letterMode || matchingBankMode) && sharedOptions.length > 0

  return (
    <View style={styles.root}>
      {section.instruction ? (
        <Text style={styles.instruction}>{section.instruction}</Text>
      ) : null}

      {section.content ? (
        <View style={styles.contentCard}>
          {renderSectionBody(
            section.content,
            answers,
            onAnswerChange,
            letterMode,
            focusedBlank,
            setFocusedBlank,
          )}
        </View>
      ) : null}

      {matchingBankMode
        ? section.questions.map((question) => (
            <Pressable
              key={question.id}
              onPress={() => setFocusedBlank(question.id)}
              style={[
                styles.matchingStem,
                focusedBlank === question.id && styles.matchingStemFocused,
              ]}
            >
              <Text style={styles.matchingStemText}>
                <Text style={styles.qNum}>{question.id}. </Text>
                {question.question}
              </Text>
              <LetterBlank
                questionId={question.id}
                answer={answers[question.id] ?? ""}
                focused={focusedBlank === question.id}
                onFocus={() => setFocusedBlank(question.id)}
              />
            </Pressable>
          ))
        : null}

      {showOptionsBank ? (
        <View style={styles.optionsBank}>
          <Text style={styles.optionsBankLabel}>
            Options{focusedBlank != null ? ` · ${focusedBlank}` : ""}
          </Text>
          <View style={styles.choiceList}>
            {sharedOptions.map((opt, index) => {
              const letter = extractReadingOptionValue(opt)
              const used = section.questions.some(
                (q) => (answers[q.id] ?? "").toUpperCase() === letter.toUpperCase(),
              )
              return (
                <Pressable
                  key={`${index}-${opt}`}
                  onPress={() => {
                    const target =
                      focusedBlank ??
                      blankIds.find((id) => !(answers[id] ?? "").trim()) ??
                      blankIds[0]
                    if (target == null) return
                    onAnswerChange(target, letter)
                    const nextEmpty = blankIds.find(
                      (id) => id !== target && !(answers[id] ?? "").trim(),
                    )
                    setFocusedBlank(nextEmpty ?? target)
                  }}
                  style={[styles.choiceCard, used && styles.choiceCardSelected]}
                >
                  <Text style={[styles.choiceLabel, used && styles.choiceLabelSelected]}>
                    {formatReadingChoiceLabel(opt, index)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}

      {listQuestions.map((question) => (
        <StatementQuestion
          key={question.id}
          question={question}
          answer={answers[question.id] ?? ""}
          onChange={(value) => onAnswerChange(question.id, value)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  instruction: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  contentCard: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  contentBody: { gap: 4 },
  contentLine: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  contentLineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  arrowLine: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginVertical: 2,
  },
  inlineBlankWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineBlankNum: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
    minWidth: 16,
  },
  inlineBlankInput: {
    minWidth: 88,
    maxWidth: 160,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontSize: 13,
    color: colors.text,
  },
  letterBlank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginHorizontal: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  letterBlankFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  letterBlankNum: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  letterBlankValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
    minWidth: 14,
    textAlign: "center",
  },
  letterBlankEmpty: { color: colors.textMuted },
  matchingStem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  matchingStemFocused: {
    backgroundColor: colors.primaryLight,
  },
  matchingStemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 19,
  },
  optionsBank: { gap: 6 },
  optionsBankLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  qBlock: {
    gap: 8,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  qNum: { fontWeight: "800", color: colors.primaryDark },
  qPrompt: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 19,
  },
  optionRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  optionPill: {
    flexGrow: 1,
    minWidth: "28%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  optionPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionPillText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  optionPillTextSelected: { color: colors.primaryDark },
  choiceList: { gap: 6 },
  choiceCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  choiceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  choiceLabel: { fontSize: 12, color: colors.text, lineHeight: 17 },
  choiceLabelSelected: { color: colors.primaryDark, fontWeight: "600" },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
})

import React, { useMemo, useState } from "react"

import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import type { IeltsListeningContentBlock } from "../../types/ielts"

import { normalizeListeningDisplayText, parseCorrectVariants } from "../../lib/ielts-listening"

import { CachedImage } from "../CachedImage"

import { ListeningNotes } from "./ListeningNotes"

import { colors, radius, spacing } from "../../theme/tokens"



interface ListeningContentProps {

  content?: string

  contentBlocks?: IeltsListeningContentBlock[]

  questionPrompts?: Record<number, string>

  answers: Record<number, string>

  onAnswerChange: (questionId: number, answer: string) => void

}



function LetterPills({

  letters,

  answer,

  multiSelect,

  maxSelections,

  onChange,

}: {

  letters: string[]

  answer: string

  multiSelect?: boolean

  maxSelections?: number

  onChange: (value: string) => void

}) {

  const selected = useMemo(() => {

    if (!answer) return new Set<string>()

    return new Set(parseCorrectVariants(answer.replace(/,/g, " / ")).map((v) => v.toUpperCase()))

  }, [answer])



  const toggle = (letter: string) => {

    if (!multiSelect) {

      onChange(letter)

      return

    }

    const next = new Set(selected)

    if (next.has(letter)) {

      next.delete(letter)

    } else {

      if (maxSelections && next.size >= maxSelections) return

      next.add(letter)

    }

    onChange(Array.from(next).sort().join(" / "))

  }



  return (

    <View style={styles.letterRow}>

      {letters.map((letter) => {

        const isSelected = selected.has(letter)

        return (

          <Pressable

            key={letter}

            onPress={() => toggle(letter)}

            style={[styles.letterPill, isSelected && styles.letterPillSelected]}

          >

            <Text style={[styles.letterPillText, isSelected && styles.letterPillTextSelected]}>

              {letter}

            </Text>

          </Pressable>

        )

      })}

    </View>

  )

}



function InlineContent({

  text,

  answers,

  onAnswerChange,

  compact,

  questionPrompts,

}: {

  text: string

  answers: Record<number, string>

  onAnswerChange: (questionId: number, answer: string) => void

  compact?: boolean

  questionPrompts?: Record<number, string>

}) {

  const normalizedText = useMemo(() => normalizeListeningDisplayText(text), [text])
  const parts = normalizedText.split(/(\[\d+\])/)



  return (

    <View style={[styles.inlineWrap, compact && styles.inlineWrapCompact]}>

      {parts.map((part, index) => {

        const match = part.match(/\[(\d+)\]/)

        if (match) {

          const questionId = Number.parseInt(match[1], 10)

          const leadingText = (parts[index - 1] ?? "").trim()

          const prompt = !leadingText ? questionPrompts?.[questionId] : undefined

          return (

            <React.Fragment key={`${index}-${questionId}`}>

              {prompt ? (

                <Text style={[styles.text, compact && styles.textCompact]}>{prompt}</Text>

              ) : null}

              <TextInput

              key={`${index}-${questionId}`}

              value={answers[questionId] ?? ""}

              onChangeText={(value) => onAnswerChange(questionId, value)}

              placeholder={match[1]}

              placeholderTextColor={colors.textMuted}

              style={[styles.inlineInput, compact && styles.inlineInputCompact]}

              autoCapitalize="none"

              autoCorrect={false}

            />

            </React.Fragment>

          )

        }

        if (!part) return null

        return (

          <Text key={index} style={[styles.text, compact && styles.textCompact]}>

            {part}

          </Text>

        )

      })}

    </View>

  )

}



function resolveColumnFlex(columnCount: number, index: number): number {

  if (columnCount === 4) return [1.05, 0.95, 0.75, 2.25][index] ?? 1

  if (columnCount === 3) return [1, 1.1, 1.9][index] ?? 1

  return 1

}



function ListeningTable({

  headers,

  rows,

  answers,

  onAnswerChange,

}: {

  headers: string[]

  rows: string[][]

  answers: Record<number, string>

  onAnswerChange: (questionId: number, answer: string) => void

}) {

  return (

    <View style={styles.table}>

      <View style={[styles.tableRow, styles.tableHeaderRow]}>

        {headers.map((header, index) => (

          <View

            key={`header-${index}`}

            style={[

              styles.tableCell,

              styles.tableHeaderCell,

              { flex: resolveColumnFlex(headers.length, index) },

              index === headers.length - 1 && styles.tableCellLast,

            ]}

          >

            <Text style={styles.tableHeaderText}>{header}</Text>

          </View>

        ))}

      </View>



      {rows.map((row, rowIndex) => (

        <View

          key={`row-${rowIndex}`}

          style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}

        >

          {row.map((cell, cellIndex) => (

            <View

              key={`cell-${rowIndex}-${cellIndex}`}

              style={[

                styles.tableCell,

                { flex: resolveColumnFlex(headers.length, cellIndex) },

                cellIndex === row.length - 1 && styles.tableCellLast,

              ]}

            >

              <InlineContent

                text={cell}

                answers={answers}

                onAnswerChange={onAnswerChange}

                compact

              />

            </View>

          ))}

        </View>

      ))}

    </View>

  )

}



function ListeningImage({ url, alt }: { url: string; alt?: string }) {

  const [loading, setLoading] = useState(true)



  return (

    <View style={styles.imageWrap}>

      {loading ? (

        <View style={styles.imageSkeleton}>

          <ActivityIndicator size="small" color={colors.primary} />

        </View>

      ) : null}

      <CachedImage

        uri={url}

        accessibilityLabel={alt ?? "Diagram"}

        contentFit="contain"

        style={styles.image}

        onLoad={() => setLoading(false)}

        onError={() => setLoading(false)}

      />

    </View>

  )

}



function MultipleChoiceQuestion({
  questionId,
  prompt,
  options,
  imageUrl,
  answers,
  onAnswerChange,
}: {
  questionId: number
  prompt: string
  options: string[]
  imageUrl?: string
  answers: Record<number, string>
  onAnswerChange: (questionId: number, answer: string) => void
}) {
  const answer = answers[questionId] ?? ""

  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionLabel}>Q{questionId}</Text>
      <Text style={styles.questionPrompt}>{prompt}</Text>
      {imageUrl ? (
        <CachedImage
          uri={imageUrl}
          accessibilityLabel={`Question ${questionId} illustration`}
          contentFit="contain"
          style={styles.questionImage}
        />
      ) : null}
      <View style={styles.choiceList}>
        {options.map((option) => {
          const letterMatch = option.trim().match(/^([A-H])\./i)
          const letter = letterMatch?.[1]?.toUpperCase() ?? option
          const selected = answer.toUpperCase() === letter

          return (
            <Pressable
              key={option}
              onPress={() => onAnswerChange(questionId, letter)}
              style={[styles.choiceCard, selected && styles.choiceCardSelected]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function MultiSelectGroup({

  questionIds,

  label,

  prompt,

  options,

  answers,

  onAnswerChange,

}: {

  questionIds: number[]

  label?: string

  prompt: string

  options: string[]

  answers: Record<number, string>

  onAnswerChange: (questionId: number, answer: string) => void

}) {

  const primaryId = questionIds[0]

  const answer = answers[primaryId] ?? ""



  const setGroupAnswer = (value: string) => {

    for (const questionId of questionIds) {

      onAnswerChange(questionId, value)

    }

  }



  const selected = useMemo(() => {

    if (!answer) return new Set<string>()

    return new Set(parseCorrectVariants(answer.replace(/,/g, " / ")).map((v) => v.toUpperCase()))

  }, [answer])



  const toggle = (letter: string) => {

    const next = new Set(selected)

    if (next.has(letter)) next.delete(letter)

    else {

      if (next.size >= questionIds.length) return

      next.add(letter)

    }

    setGroupAnswer(Array.from(next).sort().join(" / "))

  }



  return (

    <View style={styles.questionCard}>

      <Text style={styles.questionLabel}>Q{label ?? questionIds.join("–")}</Text>

      <Text style={styles.questionPrompt}>{prompt}</Text>

      <View style={styles.choiceList}>

        {options.map((option) => {

          const letterMatch = option.trim().match(/^([A-H])\./i)

          const letter = letterMatch?.[1]?.toUpperCase() ?? option

          const isSelected = selected.has(letter)



          return (

            <Pressable

              key={option}

              onPress={() => toggle(letter)}

              style={[styles.choiceCard, isSelected && styles.choiceCardSelected]}

            >

              <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>

                {option}

              </Text>

            </Pressable>

          )

        })}

      </View>

    </View>

  )

}



function MatchingGrid({

  columns,

  rows,

  answers,

  onAnswerChange,

}: {

  columns: string[]

  rows: { questionId: number; label: string }[]

  answers: Record<number, string>

  onAnswerChange: (questionId: number, answer: string) => void

}) {

  return (

    <View style={styles.matchingGrid}>

      <View style={[styles.matchingHeaderRow, styles.matchingRow]}>

        <View style={styles.matchingLabelCol}>

          <Text style={styles.matchingHeaderText}> </Text>

        </View>

        {columns.map((col) => (

          <View key={col} style={styles.matchingCol}>

            <Text style={styles.matchingHeaderText}>{col}</Text>

          </View>

        ))}

      </View>

      {rows.map((row) => (

        <View key={row.questionId} style={styles.matchingRow}>

          <View style={styles.matchingLabelCol}>

            <Text style={styles.matchingRowLabel}>

              <Text style={styles.matchingRowNumber}>{row.questionId} </Text>

              {row.label}

            </Text>

          </View>

          {columns.map((col) => {

            const selected = (answers[row.questionId] ?? "").toUpperCase() === col

            return (

              <Pressable

                key={`${row.questionId}-${col}`}

                onPress={() => onAnswerChange(row.questionId, col)}

                style={[styles.matchingCol, styles.matchingCell, selected && styles.matchingCellSelected]}

              >

                <View style={[styles.matchingDot, selected && styles.matchingDotSelected]} />

              </Pressable>

            )

          })}

        </View>

      ))}

    </View>

  )

}



function FlowChart({

  title,

  steps,

  options,

  answers,

  onAnswerChange,

}: {

  title?: string

  steps: { stepLabel: string; questionId: number }[]

  options: string[]

  answers: Record<number, string>

  onAnswerChange: (questionId: number, answer: string) => void

}) {

  const letters = useMemo(

    () =>

      options

        .map((opt) => opt.trim().match(/^([A-H])\./i)?.[1]?.toUpperCase())

        .filter((v): v is string => Boolean(v)),

    [options],

  )



  return (

    <View style={styles.flowChart}>

      {title ? <Text style={styles.flowChartTitle}>{title}</Text> : null}

      {steps.map((step, index) => (

        <View key={step.questionId} style={styles.flowStep}>

          <Text style={styles.flowStepLabel}>{step.stepLabel}</Text>

          <View style={styles.flowStepAnswer}>

            <Text style={styles.flowStepNumber}>{step.questionId}</Text>

            <LetterPills

              letters={letters}

              answer={answers[step.questionId] ?? ""}

              onChange={(value) => onAnswerChange(step.questionId, value)}

            />

          </View>

          {index < steps.length - 1 ? <View style={styles.flowArrow} /> : null}

        </View>

      ))}

      <View style={styles.optionsBank}>

        <Text style={styles.optionsBankTitle}>Options</Text>

        {options.map((option) => (

          <Text key={option} style={styles.optionsBankItem}>

            {option}

          </Text>

        ))}

      </View>

    </View>

  )

}



function renderBlock(

  block: IeltsListeningContentBlock,

  index: number,

  answers: Record<number, string>,

  onAnswerChange: (questionId: number, answer: string) => void,

  questionPrompts?: Record<number, string>,

) {

  switch (block.type) {

    case "text":

      return (

        <InlineContent

          key={`text-${index}`}

          text={block.text}

          answers={answers}

          onAnswerChange={onAnswerChange}

        />

      )

    case "table":

      return (

        <ListeningTable

          key={`table-${index}`}

          headers={block.headers}

          rows={block.rows}

          answers={answers}

          onAnswerChange={onAnswerChange}

        />

      )

    case "image":

      return <ListeningImage key={`image-${index}`} url={block.url} alt={block.alt} />

    case "multi-select-group":

      return (

        <MultiSelectGroup

          key={`multi-${index}`}

          questionIds={block.questionIds}

          label={block.label}

          prompt={block.prompt}

          options={block.options}

          answers={answers}

          onAnswerChange={onAnswerChange}

        />

      )

    case "multiple-choice":

      return (

        <MultipleChoiceQuestion

          key={`mc-${block.questionId}`}

          questionId={block.questionId}

          prompt={block.prompt}

          options={block.options}

          imageUrl={block.imageUrl}

          answers={answers}

          onAnswerChange={onAnswerChange}

        />

      )

    case "matching-grid":

      return (

        <MatchingGrid

          key={`matching-${index}`}

          columns={block.columns}

          rows={block.rows}

          answers={answers}

          onAnswerChange={onAnswerChange}

        />

      )

    case "flow-chart":

      return (

        <FlowChart

          key={`flow-${index}`}

          title={block.title}

          steps={block.steps}

          options={block.options}

          answers={answers}

          onAnswerChange={onAnswerChange}

        />

      )

    case "notes":

      return (

        <ListeningNotes

          key={`notes-${index}`}

          intro={block.intro}

          title={block.title}

          sections={block.sections}

          answers={answers}

          onAnswerChange={onAnswerChange}

        />

      )

  }

}



export function ListeningContent({

  content,

  contentBlocks,

  questionPrompts,

  answers,

  onAnswerChange,

}: ListeningContentProps) {

  if (contentBlocks?.length) {

    return (

      <View style={styles.blocks}>

        {contentBlocks.map((block, index) =>
          renderBlock(block, index, answers, onAnswerChange, questionPrompts),
        )}

      </View>

    )

  }



  return (

    <InlineContent
      text={content ?? ""}
      answers={answers}
      onAnswerChange={onAnswerChange}
      questionPrompts={questionPrompts}
    />

  )

}



const styles = StyleSheet.create({

  blocks: {

    gap: spacing.sm,

  },

  inlineWrap: {

    flexDirection: "row",

    flexWrap: "wrap",

    alignItems: "center",

    gap: 2,

  },

  inlineWrapCompact: {

    alignItems: "flex-start",

  },

  text: {

    fontSize: 13,

    lineHeight: 19,

    color: colors.text,

  },

  textCompact: {

    fontSize: 11,

    lineHeight: 15,

  },

  inlineInput: {

    minWidth: 44,

    maxWidth: 72,

    borderWidth: 0,

    borderBottomWidth: 1.5,

    borderBottomColor: colors.primary,

    borderRadius: 0,

    paddingHorizontal: 2,

    paddingVertical: 2,

    fontSize: 12,

    color: colors.text,

    textAlign: "center",

    backgroundColor: "transparent",

    marginVertical: 1,

  },

  inlineInputCompact: {

    minWidth: 32,

    maxWidth: 48,

    paddingHorizontal: 2,

    paddingVertical: 1,

    fontSize: 11,

    borderWidth: 0,

    borderBottomWidth: 1,

    marginVertical: 0,

  },

  table: {

    width: "100%",

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.sm,

    overflow: "hidden",

    backgroundColor: colors.card,

  },

  tableRow: {

    flexDirection: "row",

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: colors.border,

  },

  tableRowAlt: {

    backgroundColor: "#F8FAFC",

  },

  tableHeaderRow: {

    backgroundColor: "#EEF2FF",

  },

  tableCell: {

    paddingHorizontal: 4,

    paddingVertical: 5,

    borderRightWidth: StyleSheet.hairlineWidth,

    borderRightColor: colors.border,

    justifyContent: "center",

    minWidth: 0,

  },

  tableCellLast: {

    borderRightWidth: 0,

  },

  tableHeaderCell: {

    paddingVertical: 6,

  },

  tableHeaderText: {

    fontSize: 10,

    fontWeight: "700",

    color: colors.text,

    textTransform: "capitalize",

  },

  imageWrap: {

    width: "100%",

    borderRadius: radius.sm,

    overflow: "hidden",

    backgroundColor: "#F1F5F9",

  },

  imageSkeleton: {

    position: "absolute",

    top: 0,

    right: 0,

    bottom: 0,

    left: 0,

    minHeight: 180,

    alignItems: "center",

    justifyContent: "center",

    zIndex: 1,

  },

  image: {

    width: "100%",

    minHeight: 180,

    aspectRatio: 4 / 3,

  },

  questionCard: {

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.md,

    padding: spacing.sm,

    backgroundColor: colors.card,

    gap: spacing.xs,

  },

  questionImage: {

    width: "100%",

    minHeight: 120,

    borderRadius: radius.sm,

    backgroundColor: colors.background,

  },

  questionLabel: {

    fontSize: 11,

    fontWeight: "700",

    color: colors.primary,

    textTransform: "uppercase",

  },

  questionPrompt: {

    fontSize: 13,

    lineHeight: 19,

    color: colors.text,

    fontWeight: "500",

  },

  choiceList: {

    gap: 6,

    marginTop: 4,

  },

  choiceCard: {

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.sm,

    paddingHorizontal: 8,

    paddingVertical: 8,

    backgroundColor: "#FAFAFA",

  },

  choiceCardSelected: {

    borderColor: colors.primary,

    backgroundColor: "#EEF2FF",

  },

  choiceText: {

    fontSize: 12,

    lineHeight: 17,

    color: colors.text,

  },

  choiceTextSelected: {

    color: colors.primary,

    fontWeight: "600",

  },

  letterRow: {

    flexDirection: "row",

    flexWrap: "wrap",

    gap: 6,

  },

  letterPill: {

    minWidth: 32,

    height: 32,

    borderRadius: radius.sm,

    borderWidth: 1,

    borderColor: colors.border,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: colors.card,

  },

  letterPillSelected: {

    borderColor: colors.primary,

    backgroundColor: colors.primary,

  },

  letterPillText: {

    fontSize: 13,

    fontWeight: "600",

    color: colors.text,

  },

  letterPillTextSelected: {

    color: "#fff",

  },

  matchingGrid: {

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.sm,

    overflow: "hidden",

    backgroundColor: colors.card,

  },

  matchingRow: {

    flexDirection: "row",

    alignItems: "center",

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: colors.border,

  },

  matchingHeaderRow: {

    backgroundColor: "#EEF2FF",

  },

  matchingLabelCol: {

    flex: 2.2,

    paddingHorizontal: 6,

    paddingVertical: 6,

    borderRightWidth: StyleSheet.hairlineWidth,

    borderRightColor: colors.border,

    minWidth: 0,

  },

  matchingCol: {

    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    paddingVertical: 4,

    borderRightWidth: StyleSheet.hairlineWidth,

    borderRightColor: colors.border,

    minWidth: 0,

  },

  matchingHeaderText: {

    fontSize: 9,

    fontWeight: "700",

    color: colors.text,

    textAlign: "center",

  },

  matchingRowLabel: {

    fontSize: 10,

    lineHeight: 14,

    color: colors.text,

  },

  matchingRowNumber: {

    fontWeight: "700",

    color: colors.primary,

  },

  matchingCell: {

    minHeight: 36,

  },

  matchingCellSelected: {

    backgroundColor: "#EEF2FF",

  },

  matchingDot: {

    width: 14,

    height: 14,

    borderRadius: 7,

    borderWidth: 1.5,

    borderColor: colors.border,

    backgroundColor: colors.card,

  },

  matchingDotSelected: {

    borderColor: colors.primary,

    backgroundColor: colors.primary,

  },

  flowChart: {

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.md,

    padding: spacing.sm,

    backgroundColor: colors.card,

    gap: spacing.xs,

  },

  flowChartTitle: {

    fontSize: 13,

    fontWeight: "600",

    color: colors.text,

    marginBottom: 4,

  },

  flowStep: {

    gap: 4,

  },

  flowStepLabel: {

    fontSize: 12,

    fontWeight: "600",

    color: colors.text,

  },

  flowStepAnswer: {

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    flexWrap: "wrap",

  },

  flowStepNumber: {

    fontSize: 12,

    fontWeight: "700",

    color: colors.primary,

    minWidth: 20,

  },

  flowArrow: {

    alignSelf: "center",

    width: 2,

    height: 12,

    backgroundColor: colors.border,

    marginVertical: 2,

  },

  optionsBank: {

    marginTop: spacing.sm,

    paddingTop: spacing.sm,

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: colors.border,

    gap: 4,

  },

  optionsBankTitle: {

    fontSize: 11,

    fontWeight: "700",

    color: colors.textMuted,

    textTransform: "uppercase",

    marginBottom: 2,

  },

  optionsBankItem: {

    fontSize: 11,

    lineHeight: 16,

    color: colors.text,

  },

})


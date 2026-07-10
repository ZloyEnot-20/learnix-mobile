import React from "react"
import { StyleSheet, Text, TextInput, View } from "react-native"
import type { IeltsListeningNoteLine, IeltsListeningNoteSection } from "../../types/ielts"
import { normalizeListeningDisplayText } from "../../lib/ielts-listening"
import { colors, spacing } from "../../theme/tokens"

interface ListeningNotesProps {
  intro?: string
  title?: string
  sections: IeltsListeningNoteSection[]
  answers: Record<number, string>
  onAnswerChange: (questionId: number, answer: string) => void
}

function noteInputWidth(answer: string): number {
  const len = Math.max(answer.length, 2)
  return Math.min(96, Math.max(44, len * 9 + 16))
}

function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function hasListMarker(text: string): boolean {
  return /^[-+•]/.test(text)
}

function InlineWords({ text }: { text: string }) {
  const words = normalizeInlineText(text).split(/\s+/).filter(Boolean)
  if (!words.length) return null

  return (
    <>
      {words.map((word, index) => (
        <Text key={`${word}-${index}`} style={styles.noteText}>
          {word}{index < words.length - 1 ? " " : ""}
        </Text>
      ))}
    </>
  )
}

function NoteBlankLine({
  questionId,
  before,
  after,
  answer,
  onAnswerChange,
}: {
  questionId: number
  before?: string
  after: string
  answer: string
  onAnswerChange: (value: string) => void
}) {
  const beforeText = normalizeInlineText(before ?? "")
  const afterText = normalizeInlineText(after)
  const isContinuation = !beforeText
  const showBullet = !isContinuation && !hasListMarker(beforeText)

  return (
    <View style={[styles.noteItem, isContinuation && styles.noteContinuation]}>
      {showBullet ? <Text style={styles.noteBullet}>•</Text> : <View style={styles.noteBulletSpacer} />}
      <View style={styles.noteInlineRow}>
        {!isContinuation ? <InlineWords text={beforeText} /> : null}
        <TextInput
          value={answer}
          onChangeText={onAnswerChange}
          placeholder={String(questionId)}
          placeholderTextColor={colors.textMuted}
          style={[styles.noteInput, { width: noteInputWidth(answer) }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {afterText ? <InlineWords text={afterText} /> : null}
      </View>
    </View>
  )
}

function NoteTextLine({ text, bullet }: { text: string; bullet?: boolean }) {
  const normalized = normalizeInlineText(text)

  if (bullet === false || hasListMarker(normalized)) {
    return <Text style={styles.notePlain}>{normalized}</Text>
  }

  return (
    <View style={styles.noteItem}>
      <Text style={styles.noteBullet}>•</Text>
      <Text style={[styles.noteText, styles.noteItemBody]}>{normalized}</Text>
    </View>
  )
}

function renderLine(
  line: IeltsListeningNoteLine,
  index: number,
  answers: Record<number, string>,
  onAnswerChange: (questionId: number, answer: string) => void,
) {
  if (line.kind === "text") {
    return <NoteTextLine key={`text-${index}`} text={line.text} bullet={line.bullet} />
  }

  return (
    <NoteBlankLine
      key={`blank-${line.questionId}`}
      questionId={line.questionId}
      before={line.before}
      after={line.after}
      answer={answers[line.questionId] ?? ""}
      onAnswerChange={(value) => onAnswerChange(line.questionId, value)}
    />
  )
}

export function ListeningNotes({
  intro,
  title,
  sections,
  answers,
  onAnswerChange,
}: ListeningNotesProps) {
  return (
    <View style={styles.notes}>
      {intro ? <Text style={styles.intro}>{normalizeListeningDisplayText(intro)}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {sections.map((section, sectionIndex) => (
        <View key={`section-${sectionIndex}`} style={styles.section}>
          {section.heading ? <Text style={styles.sectionHeading}>{section.heading}</Text> : null}
          {section.lines.map((line, lineIndex) =>
            renderLine(line, lineIndex, answers, onAnswerChange),
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  notes: {
    gap: spacing.sm,
  },
  intro: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  section: {
    gap: 6,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  notePlain: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    marginTop: 2,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  noteContinuation: {
    marginTop: -2,
  },
  noteBullet: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    width: 12,
    marginTop: 1,
  },
  noteBulletSpacer: {
    width: 12,
  },
  noteItemBody: {
    flex: 1,
    minWidth: 0,
  },
  noteInlineRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 0,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  noteInput: {
    minHeight: 22,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingHorizontal: 2,
    paddingVertical: 0,
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
    backgroundColor: "transparent",
    marginHorizontal: 2,
    marginVertical: 0,
  },
})

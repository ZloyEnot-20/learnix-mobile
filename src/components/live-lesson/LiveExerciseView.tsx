import React from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import type { BookExerciseRaw, LessonStep } from "../../lib/books/types"
import { colors, radius, spacing, typography } from "../../theme/tokens"

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  )
}

function ChipRow({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <Chip key={item} label={item} />
      ))}
    </View>
  )
}

function Block({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      {title ? <Text style={styles.blockTitle}>{title}</Text> : null}
      {children}
    </View>
  )
}

function renderBody(raw: BookExerciseRaw, uiType: LessonStep["uiType"]) {
  switch (uiType) {
    case "vocab-checklist":
    case "word-formation":
    case "answer-list": {
      const items = asStringArray(raw.items)
      const answers = asStringArray(raw.answers)
      return <ChipRow items={items.length ? items : answers} />
    }
    case "vocab-table": {
      const table = isRecord(raw.table) ? raw.table : {}
      return (
        <View style={styles.gap}>
          <ChipRow items={asStringArray(raw.items)} />
          {Object.keys(table).map((col) => (
            <Block key={col} title={col}>
              <Text style={styles.muted}>Sort the words into this column</Text>
            </Block>
          ))}
        </View>
      )
    }
    case "prefix-choice":
    case "classification": {
      const answers = isRecord(raw.answers) ? raw.answers : {}
      return (
        <View style={styles.gap}>
          <ChipRow items={asStringArray(raw.items)} />
          {Object.keys(answers).map((bucket) => (
            <Block key={bucket} title={bucket}>
              <Text style={styles.muted}>Place matching items here</Text>
            </Block>
          ))}
        </View>
      )
    }
    case "fill-blank-sentences": {
      const items = Array.isArray(raw.items) ? raw.items : []
      return (
        <View style={styles.gap}>
          {items.map((it, i) => {
            if (!isRecord(it)) return null
            return (
              <Block key={i}>
                <Text style={styles.body}>
                  {i + 1}. {String(it.sentence ?? "")}
                </Text>
              </Block>
            )
          })}
        </View>
      )
    }
    case "reading-tfng": {
      const questions = Array.isArray(raw.questions) ? raw.questions : []
      return (
        <View style={styles.gap}>
          <Block title="Passage">
            <Text style={styles.body}>{String(raw.passage ?? "")}</Text>
          </Block>
          {questions.map((q) => {
            if (!isRecord(q)) return null
            return (
              <Block key={String(q.number)}>
                <Text style={styles.body}>
                  {String(q.number)}. {String(q.statement ?? "")}
                </Text>
                <Text style={styles.hint}>True / False / Not given</Text>
              </Block>
            )
          })}
        </View>
      )
    }
    case "paraphrase-pairs": {
      const rows = Array.isArray(raw.paraphrases)
        ? raw.paraphrases
        : Array.isArray(raw.items)
          ? raw.items
          : []
      return (
        <View style={styles.gap}>
          {rows.map((row, i) => {
            if (!isRecord(row)) return null
            return (
              <Block key={i}>
                <Text style={styles.body}>{String(row.original ?? "")}</Text>
                <Text style={styles.hint}>Find a paraphrase in the passage / audio</Text>
              </Block>
            )
          })}
        </View>
      )
    }
    case "listening-notes": {
      const notes = isRecord(raw.notes) ? raw.notes : {}
      const body = asStringArray(notes.body)
      return (
        <View style={styles.gap}>
          {raw.audio_track != null ? (
            <Text style={styles.hint}>Audio track {String(raw.audio_track)}</Text>
          ) : null}
          <Block title={typeof notes.title === "string" ? notes.title : "Notes"}>
            {body.map((line, i) => (
              <Text key={i} style={styles.body}>
                {line}
              </Text>
            ))}
          </Block>
        </View>
      )
    }
    case "discussion-questions":
      return (
        <View style={styles.gap}>
          {asStringArray(raw.questions).map((q, i) => (
            <Block key={i}>
              <Text style={styles.body}>
                {i + 1}. {q}
              </Text>
            </Block>
          ))}
        </View>
      )
    case "listening-structured": {
      const items = Array.isArray(raw.items) ? raw.items : []
      return (
        <View style={styles.gap}>
          {raw.audio_track != null ? (
            <Text style={styles.hint}>Audio track {String(raw.audio_track)}</Text>
          ) : null}
          {items.map((it, i) => {
            if (!isRecord(it)) return null
            return (
              <Block key={i} title={`Speaker ${String(it.speaker ?? i + 1)}`}>
                <Text style={styles.muted}>Listen and note who / which adjectives</Text>
              </Block>
            )
          })}
        </View>
      )
    }
    case "listening-match":
      return (
        <View style={styles.gap}>
          {raw.audio_track != null ? (
            <Text style={styles.hint}>Audio track {String(raw.audio_track)}</Text>
          ) : null}
          <Block title="Speaker 1">
            <Text style={styles.muted}>Match to a question</Text>
          </Block>
          <Block title="Speaker 2">
            <Text style={styles.muted}>Match to a question</Text>
          </Block>
        </View>
      )
    case "expression-notes":
      return (
        <Block title="Expressions">
          <Text style={styles.muted}>Listen again and note time expressions</Text>
        </Block>
      )
    case "summary-completion":
      return (
        <View style={styles.gap}>
          {raw.audio_track != null ? (
            <Text style={styles.hint}>Audio track {String(raw.audio_track)}</Text>
          ) : null}
          <Block>
            <Text style={styles.body}>{String(raw.summary ?? "")}</Text>
          </Block>
        </View>
      )
    case "sentence-wordbox": {
      const bank = asStringArray(raw.adjectives).length
        ? asStringArray(raw.adjectives)
        : asStringArray(raw.words)
      const sentences = Array.isArray(raw.sentences) ? raw.sentences : []
      return (
        <View style={styles.gap}>
          <ChipRow items={bank} />
          {sentences.map((s, i) => {
            if (!isRecord(s)) return null
            return (
              <Block key={i}>
                <Text style={styles.body}>{String(s.sentence ?? "")}</Text>
              </Block>
            )
          })}
        </View>
      )
    }
    case "gap-fill-passage":
      return (
        <View style={styles.gap}>
          <ChipRow items={asStringArray(raw.words)} />
          <Block>
            <Text style={styles.body}>{String(raw.text ?? "")}</Text>
          </Block>
        </View>
      )
    case "speaking-topic":
      return (
        <Block title="Speaking">
          <Text style={styles.body}>{String(raw.topic ?? "")}</Text>
        </Block>
      )
    case "image-prompt":
      return (
        <Block title="Image / mind map">
          <Text style={styles.muted}>
            {typeof raw.image_description === "string"
              ? raw.image_description
              : "Use the image from the book"}
          </Text>
        </Block>
      )
    case "graph-task":
      return (
        <Block title="Graph">
          <Text style={styles.muted}>Use the graph in the book to complete the task</Text>
        </Block>
      )
    default:
      return <Text style={styles.muted}>Follow the instruction with your class</Text>
  }
}

export function LiveExerciseView({ step }: { step: LessonStep }) {
  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
      <View style={styles.metaRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{step.uiLabel}</Text>
        </View>
        <Text style={styles.meta}>Ex {step.exerciseId}</Text>
      </View>
      {step.instruction ? <Text style={styles.instruction}>{step.instruction}</Text> : null}
      {renderBody(step.raw, step.uiType)}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: spacing.xxl, gap: spacing.md },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { ...typography.caption, color: colors.primaryDark, fontWeight: "600" },
  meta: { ...typography.caption, color: colors.textMuted },
  instruction: { ...typography.body, color: colors.text, lineHeight: 22 },
  gap: { gap: spacing.sm },
  block: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  blockTitle: { ...typography.label, color: colors.text, fontWeight: "700" },
  body: { ...typography.body, color: colors.text, lineHeight: 21 },
  muted: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.primaryDark, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipText: { ...typography.caption, color: colors.text },
})

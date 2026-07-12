import React, { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import type { BookExerciseRaw, LessonStep } from "../../lib/books/types"
import { colors, radius, spacing, typography } from "../../theme/tokens"

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function Chip({
  label,
  selected,
  placed,
  onPress,
}: {
  label: string
  selected?: boolean
  placed?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        placed && styles.chipPlaced,
        !onPress && styles.chipStatic,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          placed && styles.chipTextPlaced,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function ChipRow({
  items,
  selected,
  onSelect,
}: {
  items: string[]
  selected?: string | null
  onSelect?: (item: string) => void
}) {
  if (!items.length) return null
  return (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <Chip
          key={item}
          label={item}
          selected={selected === item}
          onPress={onSelect ? () => onSelect(item) : undefined}
        />
      ))}
    </View>
  )
}

function Block({
  title,
  children,
  onPress,
  active,
}: {
  title?: string
  children: React.ReactNode
  onPress?: () => void
  active?: boolean
}) {
  const content = (
    <>
      {title ? <Text style={styles.blockTitle}>{title}</Text> : null}
      {children}
    </>
  )
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.block, active && styles.blockActive]}
      >
        {content}
      </Pressable>
    )
  }
  return <View style={styles.block}>{content}</View>
}

/** Tap a word, then tap a bucket to place it. Tap placed word to return to bank. */
function SortIntoBuckets({
  bank,
  buckets,
  exerciseKey,
}: {
  bank: string[]
  buckets: string[]
  exerciseKey: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [placement, setPlacement] = useState<Record<string, string>>({})

  useEffect(() => {
    setSelected(null)
    setPlacement({})
  }, [exerciseKey])

  const remaining = useMemo(
    () => bank.filter((w) => !placement[w]),
    [bank, placement],
  )

  const placeIn = (bucket: string) => {
    if (!selected) return
    setPlacement((prev) => ({ ...prev, [selected]: bucket }))
    setSelected(null)
  }

  const unplace = (word: string) => {
    setPlacement((prev) => {
      const next = { ...prev }
      delete next[word]
      return next
    })
    setSelected(word)
  }

  return (
    <View style={styles.gap}>
      <Text style={styles.hint}>
        {selected ? `Selected: ${selected} — tap a column` : "Tap a word, then tap a column"}
      </Text>
      <ChipRow
        items={remaining}
        selected={selected}
        onSelect={(item) => setSelected((cur) => (cur === item ? null : item))}
      />
      {buckets.map((bucket) => {
        const words = bank.filter((w) => placement[w] === bucket)
        return (
          <Block
            key={bucket}
            title={bucket}
            active={Boolean(selected)}
            onPress={() => placeIn(bucket)}
          >
            {words.length === 0 ? (
              <Text style={styles.muted}>Tap here to place the selected word</Text>
            ) : (
              <View style={styles.chipRow}>
                {words.map((w) => (
                  <Chip key={w} label={w} placed onPress={() => unplace(w)} />
                ))}
              </View>
            )}
          </Block>
        )
      })}
    </View>
  )
}

function ChecklistSelect({ items, exerciseKey }: { items: string[]; exerciseKey: string }) {
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  useEffect(() => setPicked({}), [exerciseKey])
  return (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <Chip
          key={item}
          label={item}
          selected={Boolean(picked[item])}
          onPress={() => setPicked((p) => ({ ...p, [item]: !p[item] }))}
        />
      ))}
    </View>
  )
}

function TfngQuestions({
  passage,
  questions,
  exerciseKey,
}: {
  passage: string
  questions: Array<Record<string, unknown>>
  exerciseKey: string
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  useEffect(() => setAnswers({}), [exerciseKey])
  const options = ["True", "False", "Not given"]

  return (
    <View style={styles.gap}>
      <Block title="Passage">
        <Text style={styles.body}>{passage}</Text>
      </Block>
      {questions.map((q) => {
        const num = String(q.number ?? "")
        return (
          <Block key={num}>
            <Text style={styles.body}>
              {num}. {String(q.statement ?? "")}
            </Text>
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {options.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={answers[num] === opt}
                  onPress={() => setAnswers((a) => ({ ...a, [num]: opt }))}
                />
              ))}
            </View>
          </Block>
        )
      })}
    </View>
  )
}

function renderBody(raw: BookExerciseRaw, uiType: LessonStep["uiType"], exerciseKey: string) {
  switch (uiType) {
    case "vocab-checklist":
      return <ChecklistSelect items={asStringArray(raw.items)} exerciseKey={exerciseKey} />
    case "word-formation":
    case "answer-list": {
      const items = asStringArray(raw.items)
      return <ChipRow items={items.length ? items : asStringArray(raw.answers)} />
    }
    case "vocab-table": {
      const table = isRecord(raw.table) ? raw.table : {}
      return (
        <SortIntoBuckets
          bank={asStringArray(raw.items)}
          buckets={Object.keys(table)}
          exerciseKey={exerciseKey}
        />
      )
    }
    case "prefix-choice":
    case "classification": {
      const answers = isRecord(raw.answers) ? raw.answers : {}
      const buckets = Object.keys(answers)
      return (
        <SortIntoBuckets
          bank={asStringArray(raw.items)}
          buckets={buckets.length ? buckets : ["Group A", "Group B"]}
          exerciseKey={exerciseKey}
        />
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
                <Text style={styles.hint}>Write your answer in your notebook / discuss</Text>
              </Block>
            )
          })}
        </View>
      )
    }
    case "reading-tfng": {
      const questions = Array.isArray(raw.questions)
        ? raw.questions.filter(isRecord)
        : []
      return (
        <TfngQuestions
          passage={String(raw.passage ?? "")}
          questions={questions}
          exerciseKey={exerciseKey}
        />
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

export function LiveExerciseView({
  step,
  locked = false,
}: {
  step: LessonStep
  locked?: boolean
}) {
  const exerciseKey = `${step.unitNumber}-${step.exerciseId}-${step.uiType}`
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}
        pointerEvents={locked ? "none" : "auto"}
      >
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{step.uiLabel}</Text>
          </View>
          <Text style={styles.meta}>Ex {step.exerciseId}</Text>
        </View>
        {step.instruction ? <Text style={styles.instruction}>{step.instruction}</Text> : null}
        {renderBody(step.raw, step.uiType, exerciseKey)}
      </ScrollView>
      {locked ? (
        <View style={styles.lockedBanner} pointerEvents="none">
          <Text style={styles.lockedText}>Completed — tap Change answers to edit</Text>
        </View>
      ) : null}
    </View>
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
  blockActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  blockTitle: { ...typography.label, color: colors.text, fontWeight: "700" },
  body: { ...typography.body, color: colors.text, lineHeight: 21 },
  muted: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.primaryDark, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipStatic: {},
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipPlaced: {
    backgroundColor: "#ECFDF5",
    borderColor: "#059669",
  },
  chipText: { ...typography.caption, color: colors.text },
  chipTextSelected: { color: colors.primaryDark, fontWeight: "700" },
  chipTextPlaced: { color: "#047857", fontWeight: "600" },
  lockedBanner: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    bottom: spacing.sm,
    backgroundColor: "#ECFDF5",
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  lockedText: { ...typography.caption, color: "#047857", fontWeight: "600", textAlign: "center" },
})

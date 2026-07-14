import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, Text, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { BookExerciseRaw, LessonStep } from "../lib/books/types"
import { parseNumberedGaps } from "../lib/books/gap-text"
import {
  BlankSlot,
  ChoiceChip,
  ExNum,
  Instruction,
  Section,
  TipBox,
  TextBlank,
  WordBank,
  styles,
} from "./BookPageChrome"

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function exerciseKey(step: LessonStep) {
  return `${step.unitNumber}-${step.exerciseId}-${step.uiType}`
}

function extractInlineWordBank(instruction: unknown): string[] {
  if (typeof instruction !== "string") return []
  const formOf = instruction.match(
    /(?:singular or plural\s+)?forms?\s+of\s+([^.]+?)(?:\.|$)/i,
  )
  const withWords = !formOf
    ? instruction.match(/with the words?\s+([^.]+?)(?:\.|$)/i)
    : null
  const chunk = (formOf?.[1] ?? withWords?.[1] ?? "").trim()
  if (!chunk || /^in\s+\d/i.test(chunk)) return []
  return chunk
    .split(/\s*(?:,|\/|\bor\b)\s*/i)
    .map((w) => w.replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, "").trim())
    .filter((w) => w.length > 1 && !/^\d/.test(w))
}

function wordBankFromBoxRef(instruction: unknown, unitSteps?: LessonStep[]): string[] {
  if (typeof instruction !== "string" || !unitSteps?.length) return []
  const ref = instruction.match(
    /(?:words?|adjectives|phrases)\s+in\s+the\s+box(?:\s+in)?\s+(\d+\.\d+)/i,
  )
  if (!ref?.[1]) return []
  const refStep = unitSteps.find((s) => s.exerciseId === ref[1])
  if (!refStep) return []
  const fromItems = asStringArray(refStep.raw.items)
  if (fromItems.length) return fromItems
  if (isRecord(refStep.raw.answers)) {
    return Object.values(refStep.raw.answers).flatMap((v) => asStringArray(v))
  }
  return []
}

function resolveFillBlankWordBank(
  raw: BookExerciseRaw,
  unitSteps?: LessonStep[],
): string[] {
  const fromRaw = asStringArray(raw.words).length
    ? asStringArray(raw.words)
    : asStringArray(raw.adjectives)
  if (fromRaw.length) return fromRaw
  const fromBox = wordBankFromBoxRef(raw.instruction, unitSteps)
  if (fromBox.length) return fromBox
  return extractInlineWordBank(raw.instruction)
}

/** Skip mind maps, graphs, and other image-dependent tasks. */
export function shouldSkipExercise(step: LessonStep): boolean {
  const raw = step.raw
  if (raw.has_image === true || raw.has_graph === true) return true
  if (step.uiType === "image-prompt" || step.uiType === "graph-task") return true
  // Passage-only reading block with no questions — show on dedicated page, keep
  if (step.uiType === "reading-tfng") {
    const qs = Array.isArray(raw.questions) ? raw.questions : []
    // Keep even empty if it has a passage title (page 15)
    return false
  }
  return false
}

function splitSentenceAroundBlank(sentence: string): {
  before: string
  after: string
  hasBlank: boolean
} {
  const match = sentence.match(/_{2,}|\u2026{2,}|\.{3,}|…+|\[?\s*_{1,}\s*\]?/)
  if (!match || match.index == null) {
    return { before: sentence, after: "", hasBlank: false }
  }
  return {
    before: sentence.slice(0, match.index),
    after: sentence.slice(match.index + match[0].length),
    hasBlank: true,
  }
}

function detectTfngOptions(
  questions: Array<Record<string, unknown>>,
  instruction?: string,
  hasLetterOptions?: boolean,
): string[] {
  if (hasLetterOptions) return []
  const answers = questions
    .map((q) => String(q.answer ?? ""))
    .filter(Boolean)
  if (answers.some((a) => /^YES$/i.test(a))) return ["YES", "NO", "NOT GIVEN"]
  if (instruction && /YES.*NO.*NOT GIVEN/i.test(instruction)) {
    return ["YES", "NO", "NOT GIVEN"]
  }
  return ["True", "False", "Not given"]
}

function parseGraphPhrases(instruction: string): string[] {
  const colon = instruction.indexOf(":")
  const tail = colon >= 0 ? instruction.slice(colon + 1) : instruction
  return tail
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
}

function emitChange(onChange: BookExerciseRendererProps["onChange"], payload: unknown) {
  queueMicrotask(() => onChange?.(payload))
}

type BookExerciseRendererProps = {
  step: LessonStep
  unitSteps?: LessonStep[]
  answers?: Record<string, unknown>
  onChange?: (payload: unknown) => void
}

function VocabChecklist({
  raw,
  step,
  onChange,
}: {
  raw: BookExerciseRaw
  step: LessonStep
  onChange?: (payload: unknown) => void
}) {
  const key = exerciseKey(step)
  const items = asStringArray(raw.items)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  useEffect(() => setPicked({}), [key])

  return (
    <Section>
      <Instruction exNum={step.exerciseId}>{stepInstruction(step)}</Instruction>
      <View style={styles.checkGrid}>
        {items.map((item) => {
          const on = Boolean(picked[item])
          return (
            <Pressable
              key={item}
              onPress={() => {
                const next = { ...picked, [item]: !on }
                setPicked(next)
                emitChange(onChange, {
                  kind: "checklist",
                  selected: Object.keys(next).filter((k) => next[k]),
                })
              }}
              style={styles.checkRow}
            >
              <View style={[styles.checkbox, on && styles.checkboxOn]}>
                {on ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
              </View>
              <Text style={styles.checkLabel}>{item}</Text>
            </Pressable>
          )
        })}
      </View>
    </Section>
  )
}

function SortIntoBuckets({
  bank,
  buckets,
  step,
  onChange,
}: {
  bank: string[]
  buckets: string[]
  step: LessonStep
  onChange?: (payload: unknown) => void
}) {
  const key = exerciseKey(step)
  const [selected, setSelected] = useState<string | null>(null)
  const [placement, setPlacement] = useState<Record<string, string>>({})
  useEffect(() => {
    setSelected(null)
    setPlacement({})
  }, [key])

  const remaining = bank.filter((w) => !placement[w])
  const placed = new Set(Object.keys(placement))

  const placeIn = (bucket: string) => {
    if (!selected) return
    const next = { ...placement, [selected]: bucket }
    setPlacement(next)
    setSelected(null)
    emitChange(onChange, { kind: "buckets", placement: next })
  }

  return (
    <Section>
      <Instruction exNum={step.exerciseId}>
        {stepInstruction(step)}
      </Instruction>
      <WordBank
        words={remaining}
        title="Word bank"
        onPick={(w) => setSelected((cur) => (cur === w ? null : w))}
        selected={selected}
        placed={placed}
      />
      <Text style={styles.hint}>
        {selected ? `Selected: ${selected} — tap a column` : "Tap a word, then tap a column"}
      </Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          {buckets.map((bucket) => (
            <View key={bucket} style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>{bucket}</Text>
            </View>
          ))}
        </View>
        <View style={styles.tableRow}>
          {buckets.map((bucket) => {
            const words = bank.filter((w) => placement[w] === bucket)
            return (
              <Pressable
                key={bucket}
                onPress={() => placeIn(bucket)}
                style={[styles.tableCell, selected && styles.tableCellActive]}
              >
                {words.length === 0 ? (
                  <Text style={styles.muted}>Tap to place</Text>
                ) : (
                  <View style={styles.tableCellWords}>
                    {words.map((w) => (
                      <Pressable
                        key={w}
                        onPress={() => {
                          const next = { ...placement }
                          delete next[w]
                          setPlacement(next)
                          setSelected(w)
                          emitChange(onChange, { kind: "buckets", placement: next })
                        }}
                      >
                        <Text style={styles.tableWord}>{w}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>
    </Section>
  )
}

function stepInstruction(step: LessonStep) {
  if (step.instruction) return step.instruction
  return typeof step.raw.instruction === "string" ? step.raw.instruction : ""
}

function ListeningStructuredExercise({
  raw,
  step,
  onChange,
}: {
  raw: BookExerciseRaw
  step: LessonStep
  onChange?: (payload: unknown) => void
}) {
  const key = exerciseKey(step)
  const items = Array.isArray(raw.items) ? raw.items.filter(isRecord) : []
  const [rows, setRows] = useState(() =>
    items.map(() => ({ person: "", adjectives: "" })),
  )
  useEffect(() => {
    setRows(items.map(() => ({ person: "", adjectives: "" })))
  }, [key, items.length])

  const update = (index: number, patch: Partial<{ person: string; adjectives: string }>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    setRows(next)
    emitChange(onChange, { kind: "speakers_detail", rows: next })
  }

  const pronouns = ["his", "her", "his"] as const

  return (
    <Section>
      <Instruction
        exNum={step.exerciseId}
        audioTrack={raw.audio_track != null ? String(raw.audio_track) : undefined}
      >
        {stepInstruction(step)}
      </Instruction>
      {items.map((it, i) => {
        const pronoun = pronouns[i] ?? "their"
        return (
          <View key={i} style={[styles.sentenceRow, { marginTop: 10 }]}>
            <Text style={styles.sentenceText}>
              Speaker {String(it.speaker ?? i + 1)} is describing {pronoun}{" "}
            </Text>
            <TextBlank
              value={rows[i]?.person ?? ""}
              onChangeText={(t) => update(i, { person: t })}
              placeholder="________"
            />
            <Text style={styles.sentenceText}>, who sounds </Text>
            <TextBlank
              value={rows[i]?.adjectives ?? ""}
              onChangeText={(t) => update(i, { adjectives: t })}
              placeholder="________"
            />
            <Text style={styles.sentenceText}>.</Text>
          </View>
        )
      })}
    </Section>
  )
}

/**
 * Sentences with an inline blank (_____ / …) — word bank tap-to-fill or type.
 * For replace-underlined tasks, pass `tip` / `original` so empty blank shows the phrase to replace.
 */
function InlineSentenceBlanks({
  rows,
  step,
  onChange,
  wordBank,
}: {
  rows: Array<{ sentence: string; original?: string; num?: number }>
  step: LessonStep
  onChange?: (payload: unknown) => void
  wordBank?: string[]
}) {
  const key = exerciseKey(step)
  const [values, setValues] = useState<string[]>(() => rows.map(() => ""))
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null)
  const hasBank = Boolean(wordBank?.length)

  useEffect(() => {
    setValues(rows.map(() => ""))
    setSelectedBlank(null)
  }, [key, rows.length])

  const commit = (next: string[]) => {
    setValues(next)
    emitChange(onChange, { kind: "list", values: next })
  }

  const onPickWord = (word: string) => {
    if (selectedBlank == null) return
    const next = [...values]
    next[selectedBlank] = word
    commit(next)
    const nextEmpty = next.findIndex((v, i) => i !== selectedBlank && !v.trim())
    setSelectedBlank(nextEmpty >= 0 ? nextEmpty : null)
  }

  const used = new Set(values.filter(Boolean).map((v) => v.trim().toLowerCase()))

  return (
    <View style={{ gap: 10 }}>
      {hasBank ? (
        <>
          <WordBank
            words={(wordBank ?? []).filter((w) => !used.has(w.trim().toLowerCase()))}
            title="Word bank"
            onPick={onPickWord}
          />
          <View style={styles.dock}>
            <Text style={styles.dockHint}>
              {selectedBlank != null
                ? `Blank ${selectedBlank + 1} selected — tap a word`
                : "Tap a blank in the sentence, then choose a word"}
            </Text>
          </View>
        </>
      ) : null}

      {rows.map((row, i) => {
        const cleaned = row.sentence.replace(/^\d+\.\s*/, "")
        const { before, after, hasBlank } = splitSentenceAroundBlank(cleaned)
        const num = row.num ?? i + 1
        const placeholder = row.original || "…………"
        const filled = values[i]?.trim()

        return (
          <View key={`${key}-${i}`} style={styles.sentenceRow}>
            <Text style={styles.sentNum}>{num} </Text>
            {hasBlank ? (
              <>
                <Text style={styles.sentenceText}>{before}</Text>
                {hasBank ? (
                  <BlankSlot
                    selected={selectedBlank === i}
                    value={filled}
                    underlined={placeholder}
                    onSelect={() => setSelectedBlank((c) => (c === i ? null : i))}
                  />
                ) : (
                  <TextBlank
                    value={values[i] ?? ""}
                    onChangeText={(t) => {
                      const next = [...values]
                      next[i] = t
                      commit(next)
                    }}
                    placeholder={placeholder}
                    selected={selectedBlank === i}
                    onSelect={() => setSelectedBlank((c) => (c === i ? null : i))}
                  />
                )}
                {after ? <Text style={styles.sentenceText}>{after}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.sentenceText}>{cleaned} </Text>
                {hasBank ? (
                  <BlankSlot
                    selected={selectedBlank === i}
                    value={filled}
                    underlined={placeholder}
                    onSelect={() => setSelectedBlank((c) => (c === i ? null : i))}
                  />
                ) : (
                  <TextBlank
                    value={values[i] ?? ""}
                    onChangeText={(t) => {
                      const next = [...values]
                      next[i] = t
                      commit(next)
                    }}
                    placeholder={placeholder}
                  />
                )}
              </>
            )}
          </View>
        )
      })}
    </View>
  )
}

/** Word formation: base → blank (e.g. considerate → inconsiderate) */
function WordFormationBlanks({
  items,
  step,
  onChange,
}: {
  items: string[]
  step: LessonStep
  onChange?: (payload: unknown) => void
}) {
  const key = exerciseKey(step)
  const [values, setValues] = useState<string[]>(() => items.map(() => ""))
  useEffect(() => setValues(items.map(() => "")), [key, items.length])

  return (
    <View style={{ gap: 10 }}>
      {items.map((item, i) => (
        <View key={`${key}-${i}`} style={styles.sentenceRow}>
          <Text style={styles.sentNum}>{i + 1} </Text>
          <Text style={styles.sentenceText}>{item} → </Text>
          <TextBlank
            value={values[i] ?? ""}
            onChangeText={(t) => {
              const next = [...values]
              next[i] = t
              setValues(next)
              emitChange(onChange, { kind: "list", values: next })
            }}
            placeholder="________"
          />
        </View>
      ))}
    </View>
  )
}

function ListBlanks({
  labels,
  step,
  onChange,
  wordBank,
}: {
  labels: Array<{ label: string; tip?: string }>
  step: LessonStep
  onChange?: (payload: unknown) => void
  wordBank?: string[]
}) {
  // Prefer inline blanks when sentences contain _____
  const asInline = labels.map((row, i) => {
    const tip = row.tip
    const sentence = row.label.replace(/^\d+\.\s*/, "")
    return {
      sentence: /_{2,}|\.{3,}|…/.test(sentence) ? sentence : `${sentence} _____`,
      original: tip,
      num: i + 1,
    }
  })
  return (
    <InlineSentenceBlanks
      rows={asInline}
      step={step}
      wordBank={wordBank}
      onChange={onChange}
    />
  )
}

function InlineGapPassage({
  text,
  step,
  onChange,
  wordBank,
  expectedCount,
}: {
  text: string
  step: LessonStep
  onChange?: (payload: unknown) => void
  wordBank?: string[]
  expectedCount?: number
}) {
  const key = exerciseKey(step)
  const { segments, gapCount } = useMemo(
    () => parseNumberedGaps(text, expectedCount),
    [text, expectedCount],
  )
  const count = Math.max(gapCount, expectedCount ?? 0)
  const [values, setValues] = useState<string[]>(() => Array.from({ length: count }, () => ""))
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null)
  const hasBank = Boolean(wordBank?.length)

  useEffect(() => {
    setValues(Array.from({ length: count }, () => ""))
    setSelectedBlank(null)
  }, [key, count])

  const commit = useCallback(
    (next: string[]) => {
      setValues(next)
      emitChange(onChange, { kind: "list", values: next })
    },
    [onChange],
  )

  const onPickWord = (word: string) => {
    if (selectedBlank == null) return
    const next = [...values]
    next[selectedBlank] = word
    commit(next)
    const nextEmpty = next.findIndex((v, i) => i !== selectedBlank && !v.trim())
    setSelectedBlank(nextEmpty >= 0 ? nextEmpty : null)
  }

  if (gapCount === 0) {
    return (
      <ListBlanks
        labels={Array.from({ length: Math.max(count, 1) }, (_, i) => ({
          label: `Gap ${i + 1}`,
        }))}
        step={step}
        wordBank={wordBank}
        onChange={onChange}
      />
    )
  }

  return (
    <View style={{ gap: 8 }}>
      {hasBank ? <WordBank words={wordBank!} onPick={onPickWord} /> : null}
      <Text style={styles.hint}>
        {hasBank
          ? selectedBlank != null
            ? `Gap ${selectedBlank + 1} selected`
            : "Tap a numbered blank in the text"
          : "Tap a number, then type your answer"}
      </Text>
      <View style={styles.inlineWrap}>
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return (
              <Text key={`t-${i}`} style={styles.inlineText}>
                {seg.text}
              </Text>
            )
          }
          const filled = values[seg.index]?.trim()
          const selected = selectedBlank === seg.index
          return (
            <Pressable
              key={`g-${seg.index}-${i}`}
              onPress={() =>
                setSelectedBlank((c) => (c === seg.index ? null : seg.index))
              }
              style={[styles.inlineBlank, selected && styles.inlineBlankSelected]}
            >
              <Text
                style={[
                  styles.inlineBlankText,
                  filled && styles.inlineBlankTextFilled,
                  selected && styles.inlineBlankTextSelected,
                ]}
              >
                {filled || String(seg.index + 1)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {!hasBank && selectedBlank != null ? (
        <TextInput
          value={values[selectedBlank] ?? ""}
          onChangeText={(t) => {
            const next = [...values]
            next[selectedBlank] = t
            commit(next)
          }}
          placeholder={`Gap ${selectedBlank + 1}`}
          style={{
            borderWidth: 1,
            borderColor: "#C4A8E0",
            borderRadius: 4,
            padding: 10,
            fontFamily: "Georgia",
          }}
        />
      ) : null}
    </View>
  )
}

function ReadingTfng({
  raw,
  step,
  onChange,
}: {
  raw: BookExerciseRaw
  step: LessonStep
  onChange?: (payload: unknown) => void
}) {
  const key = exerciseKey(step)
  const questions = Array.isArray(raw.questions) ? raw.questions.filter(isRecord) : []
  const options = Array.isArray(raw.options) ? raw.options.filter(isRecord) : []
  const hasLetters = options.length > 0 && options.every((o) => typeof o.letter === "string")
  const chipOptions = detectTfngOptions(
    questions,
    stepInstruction(step),
    hasLetters,
  )
  const [answers, setAnswers] = useState<Record<string, string>>({})
  useEffect(() => setAnswers({}), [key])

  const setAnswer = (num: string, value: string) => {
    const next = { ...answers, [num]: value }
    setAnswers(next)
    emitChange(onChange, { kind: "tfng", byNumber: next })
  }

  return (
    <Section>
      {typeof raw.title === "string" ? (
        <Text style={styles.passageTitle}>{raw.title}</Text>
      ) : null}
      <Instruction
        exNum={step.exerciseId}
        audioTrack={raw.audio_track != null ? String(raw.audio_track) : undefined}
      >
        {stepInstruction(step)}
      </Instruction>
      {typeof raw.passage === "string" && raw.passage ? (
        <View style={styles.passageBox}>
          <Text style={styles.body}>{raw.passage}</Text>
        </View>
      ) : null}
      {hasLetters ? (
        <View style={styles.optionsList}>
          <Text style={[styles.hint, { marginBottom: 4 }]}>List of people</Text>
          {options.map((opt) => (
            <View key={String(opt.letter)} style={styles.optionRow}>
              <Text style={styles.optionLetter}>{String(opt.letter)}</Text>
              <Text style={styles.optionText}>{String(opt.text ?? "")}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {typeof raw.test_tip === "string" ? <TipBox title="Test tip">{raw.test_tip}</TipBox> : null}
      {questions.map((q) => {
        const num = String(q.number ?? "")
        const statement = String(q.statement ?? "")
        return (
          <View key={num} style={styles.questionBlock}>
            <Text style={styles.body}>
              <Text style={styles.questionNum}>{num}. </Text>
              {statement}
            </Text>
            <View style={styles.chipRow}>
              {hasLetters
                ? options.map((opt) => {
                    const letter = String(opt.letter)
                    const selected = answers[num] === letter
                    return (
                      <Pressable
                        key={letter}
                        onPress={() => setAnswer(num, selected ? "" : letter)}
                        style={[styles.letterChip, selected && styles.letterChipSelected]}
                      >
                        <Text
                          style={[
                            styles.letterChipText,
                            selected && styles.letterChipTextSelected,
                          ]}
                        >
                          {letter}
                        </Text>
                      </Pressable>
                    )
                  })
                : chipOptions.map((opt) => (
                    <ChoiceChip
                      key={opt}
                      label={opt}
                      selected={answers[num] === opt}
                      onPress={() => setAnswer(num, answers[num] === opt ? "" : opt)}
                    />
                  ))}
            </View>
          </View>
        )
      })}
    </Section>
  )
}

function DiscussionQuestionsList({
  questions,
  step,
  onChange,
}: {
  questions: string[]
  step: LessonStep
  onChange?: (payload: unknown) => void
}) {
  const key = exerciseKey(step)
  const [values, setValues] = useState<string[]>(() => questions.map(() => ""))
  useEffect(() => setValues(questions.map(() => "")), [key, questions.length])

  return (
    <Section>
      <Instruction exNum={step.exerciseId}>{stepInstruction(step)}</Instruction>
      <View style={{ gap: 12 }}>
        {questions.map((q, i) => (
          <View key={i} style={{ gap: 6 }}>
            <Text style={styles.body}>
              <Text style={styles.sentNum}>{i + 1} </Text>
              {q}
            </Text>
            <TextBlank
              value={values[i] ?? ""}
              onChangeText={(t) => {
                const next = [...values]
                next[i] = t
                setValues(next)
                emitChange(onChange, { kind: "list", values: next })
              }}
              placeholder="Your ideas…"
              multiline
            />
          </View>
        ))}
      </View>
    </Section>
  )
}

function ListeningNotes({
  raw,
  step,
  onChange,
  answerKey,
}: {
  raw: BookExerciseRaw
  step: LessonStep
  onChange?: (payload: unknown) => void
  answerKey?: unknown
}) {
  const notes = isRecord(raw.notes) ? raw.notes : {}
  const body = asStringArray(notes.body)
  const answersLen = asStringArray(raw.answers).length || asStringArray(answerKey).length
  const joined = body.join("\n")
  const expected = Math.max(answersLen, 1)
  const exNum =
    step.exerciseId === "test_practice" ? undefined : step.exerciseId

  return (
    <Section>
      <Instruction
        exNum={exNum}
        audioTrack={raw.audio_track != null ? String(raw.audio_track) : undefined}
      >
        {stepInstruction(step)}
      </Instruction>
      {typeof raw.test_tip === "string" ? <TipBox title="Test tip">{raw.test_tip}</TipBox> : null}
      {typeof notes.title === "string" ? (
        <Text style={[styles.notesTitle, { marginBottom: 8 }]}>{notes.title}</Text>
      ) : null}
      {joined.trim() ? (
        <View style={styles.notesFrame}>
          <InlineGapPassage
            text={joined}
            step={step}
            expectedCount={expected}
            onChange={onChange}
          />
        </View>
      ) : (
        <Text style={styles.muted}>Complete the notes while listening.</Text>
      )}
    </Section>
  )
}

function ListeningMatch({
  raw,
  step,
  onChange,
}: {
  raw: BookExerciseRaw
  step: LessonStep
  onChange?: (payload: unknown) => void
}) {
  const key = exerciseKey(step)
  const qs = asStringArray(raw.questions)
  const options = qs.length ? qs : ["question 1", "question 2", "question 3", "question 4", "question 5"]
  const speakers = ["speaker_1", "speaker_2"]
  const [answers, setAnswers] = useState<Record<string, string>>({})
  useEffect(() => setAnswers({}), [key])

  return (
    <Section>
      <Instruction
        exNum={step.exerciseId}
        audioTrack={raw.audio_track != null ? String(raw.audio_track) : undefined}
      >
        {stepInstruction(step)}
      </Instruction>
      <Text style={styles.hint}>Tap which question each speaker is answering</Text>
      {speakers.map((speaker, idx) => (
        <View key={speaker} style={styles.card}>
          <Text style={styles.cardTitle}>Speaker {idx + 1}</Text>
          <View style={styles.chipRow}>
            {options.map((opt) => (
              <ChoiceChip
                key={opt}
                label={opt}
                selected={answers[speaker] === opt}
                onPress={() => {
                  const next = { ...answers, [speaker]: answers[speaker] === opt ? "" : opt }
                  setAnswers(next)
                  emitChange(onChange, { kind: "speakers", ...next })
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </Section>
  )
}

function ExpressionNotes({ raw, step }: { raw: BookExerciseRaw; step: LessonStep }) {
  const s1 = asStringArray(raw.speaker_1_expressions)
  const s2 = asStringArray(raw.speaker_2_expressions)
  return (
    <Section>
      <Instruction
        exNum={step.exerciseId}
        audioTrack={raw.audio_track != null ? String(raw.audio_track) : undefined}
      >
        {stepInstruction(step)}
      </Instruction>
      {s1.length ? (
        <TipBox title="Speaker 1 expressions">
          {s1.map((e, i) => (
            <Text key={i} style={styles.bodySmall}>
              • {e}
            </Text>
          ))}
        </TipBox>
      ) : null}
      {s2.length ? (
        <TipBox title="Speaker 2 expressions">
          {s2.map((e, i) => (
            <Text key={i} style={styles.bodySmall}>
              • {e}
            </Text>
          ))}
        </TipBox>
      ) : null}
      <Text style={styles.muted}>Listen again and note time expressions you hear.</Text>
    </Section>
  )
}

function DiscussionOrSpeaking({
  raw,
  step,
  onChange,
  mode,
}: {
  raw: BookExerciseRaw
  step: LessonStep
  onChange?: (payload: unknown) => void
  mode: "discussion" | "speaking" | "instruction" | "image"
}) {
  const key = exerciseKey(step)
  const [notes, setNotes] = useState("")
  useEffect(() => setNotes(""), [key])

  const qs = asStringArray(raw.questions)

  return (
    <Section>
      <Instruction
        exNum={step.exerciseId}
        audioTrack={raw.audio_track != null ? String(raw.audio_track) : undefined}
      >
        {stepInstruction(step)}
      </Instruction>
      {mode === "speaking" && typeof raw.topic === "string" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Speaking topic</Text>
          <Text style={styles.body}>{raw.topic}</Text>
        </View>
      ) : null}
      {mode === "image" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Image / mind map</Text>
          <Text style={styles.body}>
            {typeof raw.image_description === "string"
              ? raw.image_description
              : "Use the image from the book"}
          </Text>
        </View>
      ) : null}
      {qs.length ? (
        <View style={{ gap: 4 }}>
          {qs.map((q, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listNum}>{i + 1}</Text>
              <Text style={styles.body}>{q}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {mode !== "instruction" || qs.length === 0 ? (
        <TextBlank
          value={notes}
          onChangeText={(t) => {
            setNotes(t)
            emitChange(onChange, { kind: "open", notes: t })
          }}
          placeholder={
            mode === "speaking"
              ? "Your notes / outline"
              : mode === "image"
                ? "Ideas for each branch"
                : "Your ideas / answer"
          }
          multiline
        />
      ) : (
        <Text style={styles.muted}>Self-check — review your recording when ready.</Text>
      )}
    </Section>
  )
}

function GraphTask({ raw, step }: { raw: BookExerciseRaw; step: LessonStep }) {
  void raw
  void step
  return null
}

function renderExercise(
  step: LessonStep,
  unitSteps: LessonStep[] | undefined,
  onChange: BookExerciseRendererProps["onChange"],
  answerKey?: unknown,
) {
  const raw = step.raw

  switch (step.uiType) {
    case "vocab-checklist":
      return <VocabChecklist raw={raw} step={step} onChange={onChange} />

    case "listening-structured":
      return <ListeningStructuredExercise raw={raw} step={step} onChange={onChange} />

    case "vocab-table": {
      const table = isRecord(raw.table) ? raw.table : {}
      return (
        <SortIntoBuckets
          bank={asStringArray(raw.items)}
          buckets={Object.keys(table).length ? Object.keys(table) : ["Positive", "Negative"]}
          step={step}
          onChange={onChange}
        />
      )
    }

    case "prefix-choice":
    case "classification": {
      const ans = isRecord(raw.answers) ? raw.answers : {}
      const buckets = Object.keys(ans)
      return (
        <SortIntoBuckets
          bank={asStringArray(raw.items)}
          buckets={buckets.length ? buckets : ["Group A", "Group B"]}
          step={step}
          onChange={onChange}
        />
      )
    }

    case "word-formation": {
      const items = asStringArray(raw.items)
      return (
        <Section>
          <Instruction exNum={step.exerciseId}>{stepInstruction(step)}</Instruction>
          <WordFormationBlanks items={items} step={step} onChange={onChange} />
        </Section>
      )
    }

    case "answer-list": {
      // e.g. 4.4 — verb+adverb forms of phrases referenced from previous exercise
      const fromAnswers = asStringArray(raw.answers)
      const fromPrevGraph = (() => {
        const prev = unitSteps?.find((s) => s.uiType === "graph-task")
        if (!prev) return [] as string[]
        return parseGraphPhrases(String(prev.instruction || prev.raw.instruction || ""))
      })()
      const prompts = fromPrevGraph.length
        ? fromPrevGraph
        : fromAnswers.length
          ? fromAnswers.map((_, i) => `Phrase ${i + 1}`)
          : ["Phrase 1", "Phrase 2", "Phrase 3"]
      return (
        <Section>
          <Instruction exNum={step.exerciseId}>{stepInstruction(step)}</Instruction>
          <WordFormationBlanks
            items={prompts.map((p) => p.replace(/^a\s+/i, ""))}
            step={step}
            onChange={onChange}
          />
        </Section>
      )
    }

    case "fill-blank-sentences": {
      const items = Array.isArray(raw.items) ? raw.items.filter(isRecord) : []
      const rows = items.map((it, i) => ({
        sentence: String(it.sentence ?? ""),
        original: typeof it.original === "string" ? it.original : undefined,
        num: i + 1,
      }))
      const bank = resolveFillBlankWordBank(raw, unitSteps)
      return (
        <Section>
          <Instruction exNum={step.exerciseId}>{stepInstruction(step)}</Instruction>
          <InlineSentenceBlanks
            rows={rows}
            step={step}
            wordBank={bank.length ? bank : undefined}
            onChange={onChange}
          />
        </Section>
      )
    }

    case "reading-tfng":
      return <ReadingTfng raw={raw} step={step} onChange={onChange} />

    case "paraphrase-pairs": {
      const rows = (
        Array.isArray(raw.paraphrases)
          ? raw.paraphrases
          : Array.isArray(raw.items)
            ? raw.items
            : []
      ).filter(isRecord)
      const labels = rows.map((row, i) => ({
        label: `${i + 1}. ${String(row.original ?? "")} → _____`,
      }))
      return (
        <Section>
          <Instruction exNum={step.exerciseId}>{stepInstruction(step)}</Instruction>
          <ListBlanks
            labels={labels.length ? labels : [{ label: "1. _____ → _____" }]}
            step={step}
            onChange={onChange}
          />
        </Section>
      )
    }

    case "listening-notes":
      return (
        <ListeningNotes
          raw={raw}
          step={step}
          onChange={onChange}
          answerKey={answerKey ?? step.answers}
        />
      )

    case "discussion-questions": {
      const qs = asStringArray(raw.questions)
      return <DiscussionQuestionsList questions={qs} step={step} onChange={onChange} />
    }

    case "listening-match":
      return <ListeningMatch raw={raw} step={step} onChange={onChange} />

    case "expression-notes":
      return <ExpressionNotes raw={raw} step={step} />

    case "summary-completion": {
      const summary = String(raw.summary ?? "")
      const answersLen = asStringArray(raw.answers).length
      const parsed = parseNumberedGaps(summary, answersLen || undefined)
      const expected = Math.max(parsed.gapCount, answersLen, 1)
      return (
        <Section>
          <Instruction
            exNum={step.exerciseId}
            audioTrack={raw.audio_track != null ? String(raw.audio_track) : undefined}
          >
            {stepInstruction(step)}
          </Instruction>
          <InlineGapPassage
            text={summary}
            step={step}
            expectedCount={expected}
            onChange={onChange}
          />
        </Section>
      )
    }

    case "sentence-wordbox": {
      const bank = asStringArray(raw.adjectives).length
        ? asStringArray(raw.adjectives)
        : asStringArray(raw.words)
      const sentences = Array.isArray(raw.sentences) ? raw.sentences.filter(isRecord) : []
      const rows = sentences.map((s, i) => ({
        sentence: String(s.sentence ?? ""),
        num: i + 1,
      }))
      return (
        <Section>
          <Instruction exNum={step.exerciseId}>{stepInstruction(step)}</Instruction>
          <InlineSentenceBlanks
            rows={rows}
            step={step}
            wordBank={bank.length ? bank : undefined}
            onChange={onChange}
          />
        </Section>
      )
    }

    case "gap-fill-passage": {
      const text = String(raw.text ?? "")
      const words = asStringArray(raw.words)
      const answersLen = asStringArray(raw.answers).length
      const parsed = parseNumberedGaps(text, answersLen || words.length || undefined)
      const expected = Math.max(parsed.gapCount, answersLen, words.length, 1)
      return (
        <Section>
          <Instruction exNum={step.exerciseId}>{stepInstruction(step)}</Instruction>
          <InlineGapPassage
            text={text}
            step={step}
            wordBank={words.length ? words : undefined}
            expectedCount={expected}
            onChange={onChange}
          />
        </Section>
      )
    }

    case "speaking-topic":
      return (
        <DiscussionOrSpeaking raw={raw} step={step} onChange={onChange} mode="speaking" />
      )

    case "image-prompt":
    case "graph-task":
      return null

    case "instruction-only":
    default:
      return (
        <DiscussionOrSpeaking raw={raw} step={step} onChange={onChange} mode="instruction" />
      )
  }
}

export function BookExerciseRenderer({
  step,
  unitSteps,
  answers,
  onChange,
}: BookExerciseRendererProps) {
  if (shouldSkipExercise(step)) return null

  const body = renderExercise(step, unitSteps, onChange, answers ?? step.answers)
  if (!body) return null

  return (
    <View style={{ gap: 4, marginBottom: 14 }}>
      {body}
      {typeof step.raw.test_tip === "string" &&
      step.uiType !== "reading-tfng" &&
      step.uiType !== "listening-notes" ? (
        <TipBox title="Test tip">{String(step.raw.test_tip)}</TipBox>
      ) : null}
    </View>
  )
}

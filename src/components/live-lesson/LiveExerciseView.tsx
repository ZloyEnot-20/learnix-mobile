import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import type { BookExerciseRaw, LessonStep } from "../../lib/books/types"
import { parseNumberedGaps } from "../../lib/books/gap-text"
import { requiresTypedWordForms } from "../../lib/books/word-form-exercise"
import { displayListeningTrack } from "../../lib/books/repair-listening-audio"
import { collectWordBoxItems, isCueWordBox } from "../../lib/books/word-box"
import { parseListeningTable, countTableGaps } from "../../lib/books/listening-table"
import { flattenNotes, notesTitle } from "../../lib/books/notes-outline"
import { getOddOneOutGroups } from "../../lib/books/match-shapes"
import { bookIssueReport } from "../../types/issue-report"
import { HomeworkReportIssueButton } from "../homework/HomeworkReportIssue"
import { DEMO_BOOK_ID } from "../../demo/book-id"
import { colors, radius, spacing, typography } from "../../theme/tokens"

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

type DockState = {
  words: string[]
  selectedBlank: number | null
  hint: string
  onPickWord: (word: string) => void
} | null

const WordBankDockContext = createContext<{
  setDock: (dock: DockState) => void
}>({ setDock: () => {} })

function useWordBankDock(
  words: string[] | undefined,
  selectedBlank: number | null,
  onPickWord: (word: string) => void,
  hint: string,
) {
  const { setDock } = useContext(WordBankDockContext)
  const onPickWordRef = useRef(onPickWord)
  onPickWordRef.current = onPickWord
  const wordsRef = useRef(words)
  wordsRef.current = words
  const stableOnPickWord = useCallback((word: string) => {
    onPickWordRef.current(word)
  }, [])
  const wordsKey = words?.join("\0") ?? ""

  useEffect(() => {
    const current = wordsRef.current
    if (!current?.length) {
      setDock(null)
      return
    }
    setDock({
      words: current,
      selectedBlank,
      hint,
      onPickWord: stableOnPickWord,
    })
  }, [wordsKey, selectedBlank, hint, setDock, stableOnPickWord])

  useEffect(() => {
    return () => setDock(null)
  }, [setDock])
}

function Chip({
  label,
  selected,
  placed,
  compact,
  onPress,
}: {
  label: string
  selected?: boolean
  placed?: boolean
  compact?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        compact && styles.chipCompact,
        selected && styles.chipSelected,
        placed && styles.chipPlaced,
        !onPress && styles.chipStatic,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.chipText,
          compact && styles.chipTextCompact,
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
      <Pressable onPress={onPress} style={[styles.block, active && styles.blockActive]}>
        {content}
      </Pressable>
    )
  }
  return <View style={styles.block}>{content}</View>
}

function AnswerInput({
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? "Your answer"}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      style={[styles.input, multiline && styles.inputMulti]}
      autoCapitalize="none"
      autoCorrect={false}
    />
  )
}

/** Words listed inline in the instruction (e.g. "form of personality, character or characteristic"). */
function extractInlineWordBank(instruction: unknown): string[] {
  if (typeof instruction !== "string") return []
  // Prefer "form(s) of A, B or C" — ignore "words in the box in 2.1" (resolved via unitSteps).
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

/** "words in the box in 2.1" / "idioms from 2.1" / "verb from 1.5" → prior exercise bank. */
function wordBankFromBoxRef(
  instruction: unknown,
  unitSteps?: LessonStep[],
): string[] {
  if (typeof instruction !== "string" || !unitSteps?.length) return []
  const ref = instruction.match(
    /(?:words?|adjectives|phrases|idioms|verbs?)\s+(?:in\s+the\s+box(?:\s+in)?|from)\s+(\d+\.\d+)/i,
  )
  if (!ref?.[1]) return []
  const refStep = unitSteps.find((s) => s.exerciseId === ref[1])
  if (!refStep) return []
  const raw = refStep.raw
  const fromItems = asStringArray(raw.items)
  if (fromItems.length) return fromItems
  const fromWords = asStringArray(raw.words)
  if (fromWords.length) return fromWords
  const fromAdj = asStringArray(raw.adjectives)
  if (fromAdj.length) return fromAdj
  if (Array.isArray(raw.idioms)) {
    const idioms = raw.idioms
      .filter(isRecord)
      .map((it) => String(it.idiom ?? it.text ?? "").trim())
      .filter(Boolean)
    if (idioms.length) return idioms
  }
  if (Array.isArray(raw.verbs)) {
    const verbs = raw.verbs
      .map((v) => {
        if (typeof v === "string") return v
        if (isRecord(v)) return String(v.verb ?? v.word ?? v.text ?? "").trim()
        return ""
      })
      .filter(Boolean)
    if (verbs.length) return verbs
  }
  if (isRecord(raw.answers)) {
    const nested = Object.values(raw.answers).flatMap((v) => asStringArray(v))
    if (nested.length) return nested
  }
  if (isRecord(raw.table)) {
    const nested = Object.values(raw.table).flatMap((v) => asStringArray(v))
    if (nested.length) return nested
  }
  return []
}

function resolveFillBlankWordBank(
  instruction: unknown,
  unitSteps?: LessonStep[],
): string[] {
  const fromBox = wordBankFromBoxRef(instruction, unitSteps)
  if (fromBox.length) return fromBox
  return extractInlineWordBank(instruction)
}

function SortIntoBuckets({
  bank,
  buckets,
  exerciseKey,
  onChange,
}: {
  bank: string[]
  buckets: string[]
  exerciseKey: string
  onChange?: (placement: Record<string, string>) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [placement, setPlacement] = useState<Record<string, string>>({})

  useEffect(() => {
    setSelected(null)
    setPlacement({})
  }, [exerciseKey])

  const updatePlacement = (next: Record<string, string>) => {
    setPlacement(next)
    queueMicrotask(() => onChange?.(next))
  }

  const remaining = useMemo(() => bank.filter((w) => !placement[w]), [bank, placement])

  const placeIn = (bucket: string) => {
    if (!selected) return
    updatePlacement({ ...placement, [selected]: bucket })
    setSelected(null)
  }

  const unplace = (word: string) => {
    const next = { ...placement }
    delete next[word]
    updatePlacement(next)
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
          <Block key={bucket} title={bucket} active={Boolean(selected)} onPress={() => placeIn(bucket)}>
            {words.length === 0 ? (
              <Text style={styles.muted}>Tap here to place the selected word</Text>
            ) : (
              <View style={styles.chipRowCompact}>
                {words.map((w) => (
                  <Chip
                    key={w}
                    label={w}
                    placed
                    compact
                    onPress={() => {
                      // While an options-box word is selected, tapping anywhere in the
                      // column (including an existing chip) places the active word.
                      if (selected) {
                        placeIn(bucket)
                        return
                      }
                      unplace(w)
                    }}
                  />
                ))}
              </View>
            )}
          </Block>
        )
      })}
    </View>
  )
}

function ChecklistSelect({
  items,
  exerciseKey,
  onChange,
}: {
  items: string[]
  exerciseKey: string
  onChange?: (selected: string[]) => void
}) {
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  useEffect(() => {
    setPicked({})
  }, [exerciseKey])

  return (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <Chip
          key={item}
          label={item}
          selected={Boolean(picked[item])}
          onPress={() => {
            const next = { ...picked, [item]: !picked[item] }
            setPicked(next)
            onChange?.(Object.keys(next).filter((k) => next[k]))
          }}
        />
      ))}
    </View>
  )
}

function TfngQuestions({
  passage,
  questions,
  exerciseKey,
  onChange,
}: {
  passage: string
  questions: Array<Record<string, unknown>>
  exerciseKey: string
  onChange?: (byNumber: Record<string, string>) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  useEffect(() => {
    setAnswers({})
  }, [exerciseKey])
  const options = ["True", "False", "Not given"]

  return (
    <View style={styles.gap}>
      {passage ? (
        <Block title="Passage">
          <Text style={styles.body}>{passage}</Text>
        </Block>
      ) : null}
      {questions.map((q) => {
        const num = String(q.number ?? "")
        return (
          <Block key={num}>
            <Text style={styles.body}>
              {num}. {String(q.statement ?? q.text ?? "")}
            </Text>
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {options.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={answers[num] === opt}
                  onPress={() => {
                    const next = { ...answers, [num]: opt }
                    setAnswers(next)
                    queueMicrotask(() => onChange?.(next))
                  }}
                />
              ))}
            </View>
          </Block>
        )
      })}
    </View>
  )
}

function McqQuestions({
  questions,
  exerciseKey,
  onChange,
}: {
  questions: Array<Record<string, unknown>>
  exerciseKey: string
  onChange?: (byNumber: Record<string, string>) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  useEffect(() => {
    setAnswers({})
  }, [exerciseKey])

  const optionLabel = (opt: unknown, oi: number): string => {
    if (typeof opt === "string") return opt
    if (isRecord(opt)) {
      const letter = typeof opt.letter === "string" ? opt.letter : String.fromCharCode(65 + oi)
      const text = String(opt.text ?? opt.label ?? "")
      return text ? `${letter}. ${text}` : letter
    }
    return String(opt ?? "")
  }

  const pickValue = (opt: unknown, oi: number, label: string): string => {
    if (typeof opt === "string") {
      const letterMatch = opt.match(/^([A-D])[.)]\s*/i)
      return letterMatch ? letterMatch[1].toUpperCase() : opt
    }
    if (isRecord(opt) && typeof opt.letter === "string") return opt.letter
    const letterMatch = label.match(/^([A-D])[.)]\s*/i)
    return letterMatch ? letterMatch[1].toUpperCase() : label || String.fromCharCode(65 + oi)
  }

  return (
    <View style={styles.gap}>
      {questions.map((q, i) => {
        const num = String(q.number ?? i + 1)
        const opts = Array.isArray(q.options) ? q.options : []
        return (
          <Block key={num}>
            <Text style={styles.body}>
              {num}. {String(q.text ?? q.statement ?? "")}
            </Text>
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {opts.map((opt, oi) => {
                const label = optionLabel(opt, oi)
                const value = pickValue(opt, oi, label)
                return (
                  <Chip
                    key={`${num}-${oi}`}
                    label={label}
                    selected={answers[num] === value || answers[num] === label}
                    onPress={() => {
                      const next = { ...answers, [num]: value }
                      setAnswers(next)
                      queueMicrotask(() => onChange?.(next))
                    }}
                  />
                )
              })}
            </View>
          </Block>
        )
      })}
    </View>
  )
}

function matchingColumnLabel(item: unknown, i: number, side: "left" | "right"): string {
  if (typeof item === "string") {
    return side === "left" ? `${i + 1}. ${item}` : item
  }
  if (!isRecord(item)) return String(item ?? "")
  const prefix = String(item.letter ?? item.number ?? (side === "left" ? i + 1 : i + 1))
  const text = String(item.text ?? item.name ?? "")
  return text ? `${prefix}. ${text}` : prefix
}

/** Indexed text answers → { kind: "list", values: string[] } */
function ListAnswers({
  labels,
  exerciseKey,
  onChange,
  placeholder,
  wordBank,
  forceWritable = false,
}: {
  labels: string[]
  exerciseKey: string
  onChange?: (values: string[]) => void
  placeholder?: string
  wordBank?: string[]
  /** Show bank as reference chips; answers are always typed. */
  forceWritable?: boolean
}) {
  const [values, setValues] = useState<string[]>(() => labels.map(() => ""))
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null)
  const hasBank = Boolean(wordBank && wordBank.length > 0)
  const interactiveBank = hasBank && !forceWritable
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const valuesRef = useRef(values)
  valuesRef.current = values
  const selectedBlankRef = useRef(selectedBlank)
  selectedBlankRef.current = selectedBlank

  useEffect(() => {
    setValues(labels.map(() => ""))
    setSelectedBlank(null)
  }, [exerciseKey, labels.length])

  const update = useCallback((index: number, text: string) => {
    const next = [...valuesRef.current]
    next[index] = text
    setValues(next)
    queueMicrotask(() => onChangeRef.current?.(next))
  }, [])

  const onPickWord = useCallback((word: string) => {
    const blank = selectedBlankRef.current
    if (blank == null) return
    const next = [...valuesRef.current]
    next[blank] = word
    setValues(next)
    queueMicrotask(() => onChangeRef.current?.(next))
    const nextEmpty = next.findIndex((v, i) => i !== blank && !(v ?? "").trim())
    setSelectedBlank(nextEmpty >= 0 ? nextEmpty : null)
  }, [])

  useWordBankDock(
    interactiveBank ? wordBank : undefined,
    selectedBlank,
    onPickWord,
    selectedBlank != null
      ? `Gap ${selectedBlank + 1} selected — tap a word below`
      : "Tap a blank, then tap a word below",
  )

  return (
    <View style={styles.gap}>
      {forceWritable && hasBank ? (
        <View style={styles.gap}>
          <Text style={styles.hint}>Word box — change the form if needed, then type your answer</Text>
          <ChipRow items={wordBank!} />
        </View>
      ) : null}
      {interactiveBank ? (
        <Text style={styles.hint}>
          {selectedBlank != null
            ? `Blank ${selectedBlank + 1} selected — pick a word from the panel`
            : "Tap a blank first, then choose a word from the bottom panel"}
        </Text>
      ) : null}
      {labels.map((label, i) => {
        const selected = selectedBlank === i
        return (
          <Pressable
            key={`${exerciseKey}-${i}`}
            onPress={() => {
              if (!interactiveBank) return
              setSelectedBlank((cur) => (cur === i ? null : i))
            }}
            style={[styles.block, selected && styles.blockActive]}
          >
            <Text style={styles.body}>{label}</Text>
            {interactiveBank ? (
              <View style={[styles.blankPill, selected && styles.blankPillActive]}>
                <Text
                  style={[styles.blankPillText, values[i] ? styles.blankPillFilled : null]}
                  numberOfLines={1}
                >
                  {values[i]?.trim() ? values[i] : `Blank ${i + 1}`}
                </Text>
              </View>
            ) : (
              <AnswerInput
                value={values[i] ?? ""}
                onChangeText={(t) => update(i, t)}
                placeholder={placeholder ?? "Type your answer"}
              />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

/** Passage/summary with inline numbered gaps + optional word bank dock. */
function InlineGapPassage({
  text,
  exerciseKey,
  onChange,
  wordBank,
  expectedCount,
  placeholder,
  forceWritable = false,
}: {
  text: string
  exerciseKey: string
  onChange?: (values: string[]) => void
  wordBank?: string[]
  expectedCount?: number
  placeholder?: string
  forceWritable?: boolean
}) {
  const { segments, gapCount } = useMemo(
    () => parseNumberedGaps(text, expectedCount),
    [text, expectedCount],
  )
  const count = Math.max(gapCount, expectedCount ?? 0)
  const [values, setValues] = useState<string[]>(() => Array.from({ length: count }, () => ""))
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null)
  const hasBank = Boolean(wordBank && wordBank.length > 0)
  const interactiveBank = hasBank && !forceWritable
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const valuesRef = useRef(values)
  valuesRef.current = values
  const selectedBlankRef = useRef(selectedBlank)
  selectedBlankRef.current = selectedBlank

  useEffect(() => {
    setValues(Array.from({ length: count }, () => ""))
    setSelectedBlank(null)
  }, [exerciseKey, count])

  const commit = useCallback((next: string[]) => {
    setValues(next)
    queueMicrotask(() => onChangeRef.current?.(next))
  }, [])

  const onPickWord = useCallback(
    (word: string) => {
      const blank = selectedBlankRef.current
      if (blank == null) return
      const next = [...valuesRef.current]
      next[blank] = word
      commit(next)
      const nextEmpty = next.findIndex((v, i) => i !== blank && !(v ?? "").trim())
      setSelectedBlank(nextEmpty >= 0 ? nextEmpty : null)
    },
    [commit],
  )

  useWordBankDock(
    interactiveBank ? wordBank : undefined,
    selectedBlank,
    onPickWord,
    selectedBlank != null
      ? `Gap ${selectedBlank + 1} selected — tap a word below`
      : "Tap a numbered blank, then a word below",
  )

  if (gapCount === 0) {
    return (
      <View style={styles.gap}>
        <Block title="Text">
          <Text style={styles.body}>{text}</Text>
        </Block>
        <ListAnswers
          labels={Array.from({ length: Math.max(count, 1) }, (_, i) => `Gap ${i + 1}`)}
          exerciseKey={exerciseKey}
          placeholder={placeholder}
          wordBank={wordBank}
          forceWritable={forceWritable}
          onChange={onChange}
        />
      </View>
    )
  }

  return (
    <View style={styles.gap}>
      {forceWritable && hasBank ? (
        <View style={styles.gap}>
          <Text style={styles.hint}>Word box — change the form if needed, then type your answer</Text>
          <ChipRow items={wordBank!} />
        </View>
      ) : null}
      <Text style={styles.hint}>
        {interactiveBank
          ? selectedBlank != null
            ? `Gap ${selectedBlank + 1} selected — pick a word below`
            : "Tap a number in the text, then pick a word from the bottom panel"
          : "Tap a number in the text to select a blank, then type below"}
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
              onPress={() => setSelectedBlank((cur) => (cur === seg.index ? null : seg.index))}
              style={[styles.inlineBlank, selected && styles.inlineBlankActive]}
            >
              <Text
                style={[
                  styles.inlineBlankText,
                  filled ? styles.blankPillFilled : null,
                  selected && !filled ? { color: "#fff" } : null,
                  selected && filled ? { color: "#fff" } : null,
                ]}
              >
                {filled || String(seg.index + 1)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {!interactiveBank ? (
        selectedBlank != null ? (
          <AnswerInput
            value={values[selectedBlank] ?? ""}
            onChangeText={(t) => {
              const next = [...values]
              next[selectedBlank] = t
              commit(next)
            }}
            placeholder={placeholder ?? `Gap ${selectedBlank + 1}`}
          />
        ) : (
          <Text style={styles.muted}>Select a numbered blank above to type your answer</Text>
        )
      ) : null}
    </View>
  )
}

function NotesAnswers({
  exerciseKey,
  onChange,
  title,
  placeholder,
}: {
  exerciseKey: string
  onChange?: (notes: string) => void
  title?: string
  placeholder?: string
}) {
  const [notes, setNotes] = useState("")
  useEffect(() => {
    setNotes("")
  }, [exerciseKey])

  return (
    <Block title={title}>
      <AnswerInput
        value={notes}
        onChangeText={(t) => {
          setNotes(t)
          queueMicrotask(() => onChange?.(t))
        }}
        placeholder={placeholder ?? "Write your notes / answer here"}
        multiline
      />
    </Block>
  )
}

function ListeningMatch({
  exerciseKey,
  questionOptions,
  onChange,
}: {
  exerciseKey: string
  questionOptions: string[]
  onChange?: (payload: Record<string, string>) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  useEffect(() => {
    setAnswers({})
  }, [exerciseKey])

  const speakers = ["speaker_1", "speaker_2"]
  const options =
    questionOptions.length > 0
      ? questionOptions
      : ["question 1", "question 2", "question 3", "question 4", "question 5"]

  const setSpeaker = (speaker: string, value: string) => {
    const next = { ...answers, [speaker]: value }
    setAnswers(next)
    queueMicrotask(() => onChange?.(next))
  }

  return (
    <View style={styles.gap}>
      <Text style={styles.hint}>Tap which question each speaker is answering</Text>
      {speakers.map((speaker, idx) => (
        <Block key={speaker} title={`Speaker ${idx + 1}`}>
          <View style={styles.chipRow}>
            {options.map((opt) => (
              <Chip
                key={opt}
                label={opt}
                selected={answers[speaker] === opt}
                onPress={() => setSpeaker(speaker, opt)}
              />
            ))}
          </View>
        </Block>
      ))}
    </View>
  )
}

function SentenceWordbox({
  bank,
  sentences,
  exerciseKey,
  onChange,
  forceWritable = false,
}: {
  bank: string[]
  sentences: Array<Record<string, unknown>>
  exerciseKey: string
  onChange?: (values: string[]) => void
  forceWritable?: boolean
}) {
  const labels = sentences.map((s, i) => `${i + 1}. ${String(s.sentence ?? s.text ?? "")}`)
  return (
    <ListAnswers
      labels={labels}
      exerciseKey={exerciseKey}
      wordBank={bank}
      forceWritable={forceWritable}
      placeholder="Type the word form"
      onChange={onChange}
    />
  )
}

function ListeningStructured({
  items,
  exerciseKey,
  onChange,
}: {
  items: Array<Record<string, unknown>>
  exerciseKey: string
  onChange?: (rows: Array<{ person: string; adjectives: string }>) => void
}) {
  const [rows, setRows] = useState(() => items.map(() => ({ person: "", adjectives: "" })))
  useEffect(() => {
    setRows(items.map(() => ({ person: "", adjectives: "" })))
  }, [exerciseKey])

  const update = (index: number, patch: Partial<{ person: string; adjectives: string }>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    setRows(next)
    queueMicrotask(() => onChange?.(next))
  }

  return (
    <View style={styles.gap}>
      <Text style={styles.hint}>Listen and fill who they talk about + adjectives</Text>
      {items.map((it, i) => (
        <Block key={i} title={`Speaker ${String(it.speaker ?? i + 1)}`}>
          <Text style={styles.muted}>Who?</Text>
          <AnswerInput
            value={rows[i]?.person ?? ""}
            onChangeText={(t) => update(i, { person: t })}
            placeholder="e.g. neighbour, friend…"
          />
          <Text style={[styles.muted, { marginTop: 8 }]}>Adjectives</Text>
          <AnswerInput
            value={rows[i]?.adjectives ?? ""}
            onChangeText={(t) => update(i, { adjectives: t })}
            placeholder="e.g. eccentric, cheerful…"
          />
        </Block>
      ))}
    </View>
  )
}

function renderBody(
  raw: BookExerciseRaw,
  uiType: LessonStep["uiType"],
  exerciseKey: string,
  onAnswersChange?: (answers: Record<string, unknown>) => void,
  unitSteps?: LessonStep[],
) {
  const emit = (answers: Record<string, unknown>) => {
    queueMicrotask(() => onAnswersChange?.(answers))
  }

  switch (uiType) {
    case "vocab-checklist":
      return (
        <ChecklistSelect
          items={
            asStringArray(raw.items).length
              ? asStringArray(raw.items)
              : collectWordBoxItems(raw)
          }
          exerciseKey={exerciseKey}
          onChange={(selected) => emit({ kind: "checklist", selected })}
        />
      )

    case "word-formation":
    case "answer-list": {
      const items = asStringArray(raw.items)
      const labels = items.length
        ? items.map((item, i) => `${i + 1}. ${item}`)
        : (asStringArray(raw.answers).length
            ? asStringArray(raw.answers).map((_, i) => `Answer ${i + 1}`)
            : ["Answer 1", "Answer 2", "Answer 3"])
      return (
        <ListAnswers
          labels={labels}
          exerciseKey={exerciseKey}
          placeholder="Type the form / word"
          onChange={(values) => emit({ kind: "list", values })}
        />
      )
    }

    case "vocab-table": {
      const table = isRecord(raw.table) ? raw.table : {}
      return (
        <SortIntoBuckets
          bank={asStringArray(raw.items)}
          buckets={Object.keys(table)}
          exerciseKey={exerciseKey}
          onChange={(placement) => emit({ kind: "buckets", placement })}
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
          onChange={(placement) => emit({ kind: "buckets", placement })}
        />
      )
    }

    case "fill-blank-sentences": {
      const items = Array.isArray(raw.items) ? raw.items.filter(isRecord) : []
      const labels = items.map((it, i) => `${i + 1}. ${String(it.sentence ?? it.text ?? "")}`)
      const typed = requiresTypedWordForms(raw.instruction)
      const bank = resolveFillBlankWordBank(raw.instruction, unitSteps)
      return (
        <ListAnswers
          labels={labels}
          exerciseKey={exerciseKey}
          placeholder="Fill the blank"
          wordBank={bank.length ? bank : undefined}
          forceWritable={typed || bank.length === 0}
          onChange={(values) => emit({ kind: "list", values })}
        />
      )
    }

    case "reading-tfng": {
      const questions = Array.isArray(raw.questions) ? raw.questions.filter(isRecord) : []
      return (
        <TfngQuestions
          passage={String(raw.passage ?? "")}
          questions={questions}
          exerciseKey={exerciseKey}
          onChange={(byNumber) => emit({ kind: "tfng", byNumber })}
        />
      )
    }

    case "paraphrase-pairs": {
      const rows = (
        Array.isArray(raw.paraphrases) ? raw.paraphrases : Array.isArray(raw.items) ? raw.items : []
      ).filter(isRecord)
      const labels = rows.map((row, i) => `${i + 1}. ${String(row.original ?? "")}`)
      const bank = collectWordBoxItems(raw)
      return (
        <View style={styles.gap}>
          {bank.length ? (
            <Block title="Word box">
              <ChipRow items={bank} />
            </Block>
          ) : null}
          <ListAnswers
            labels={labels.length ? labels : ["Write the paraphrase"]}
            exerciseKey={exerciseKey}
            placeholder="Paraphrase / matching phrase"
            onChange={(values) => emit({ kind: "list", values })}
          />
        </View>
      )
    }

    case "listening-notes": {
      const title = notesTitle(raw.notes)
      const lines = flattenNotes(raw.notes)
      const blankAnswers = Array.isArray(raw.blanks)
        ? raw.blanks
            .filter(isRecord)
            .map((b) => (b.answer != null ? String(b.answer) : ""))
            .filter(Boolean)
        : asStringArray(raw.answers)
      return (
        <View style={styles.gap}>
          {displayListeningTrack(raw.audio_track ?? raw.audio) ? (
            <Text style={styles.hint}>
              Audio track {displayListeningTrack(raw.audio_track ?? raw.audio)}
            </Text>
          ) : null}
          {typeof raw.passage === "string" && raw.passage.trim() ? (
            <Block title="Passage">
              <Text style={styles.body}>{raw.passage}</Text>
            </Block>
          ) : null}
          {lines.length ? (
            <Block title={title || "Notes"}>
              {lines.map((line, i) => {
                const prev = lines[i - 1]
                return (
                  <View key={i} style={{ marginBottom: 6 }}>
                    {line.heading && line.heading !== prev?.heading ? (
                      <Text style={[styles.hint, { fontWeight: "700" }]}>{line.heading}</Text>
                    ) : null}
                    <Text style={styles.body}>{line.text}</Text>
                  </View>
                )
              })}
            </Block>
          ) : null}
          <ListAnswers
            labels={
              Array.isArray(raw.blanks) && raw.blanks.length
                ? raw.blanks.map((_, i) => `${i + 1}.`)
                : lines.length
                  ? lines.map((_, i) => `Note ${i + 1}`)
                  : ["1.", "2.", "3."]
            }
            exerciseKey={exerciseKey}
            placeholder="Max 2 words from the passage"
            onChange={(values) => emit({ kind: "list", values })}
          />
          {blankAnswers.length ? (
            <Block title="Answers">
              {blankAnswers.map((a, i) => (
                <Text key={i} style={styles.body}>
                  {i + 1}. {a}
                </Text>
              ))}
            </Block>
          ) : null}
        </View>
      )
    }

    case "discussion-questions": {
      const qs = asStringArray(raw.questions)
      const bank = collectWordBoxItems(raw)
      return (
        <View style={styles.gap}>
          {bank.length ? (
            <Block title="Word box">
              <ChipRow items={bank} />
            </Block>
          ) : null}
          <ListAnswers
            labels={qs.map((q, i) => `${i + 1}. ${q}`)}
            exerciseKey={exerciseKey}
            placeholder="Your ideas / answer"
            onChange={(values) => emit({ kind: "list", values })}
          />
        </View>
      )
    }

    case "listening-structured": {
      const items = Array.isArray(raw.items) ? raw.items.filter(isRecord) : []
      return (
        <ListeningStructured
          items={items}
          exerciseKey={exerciseKey}
          onChange={(rows) => emit({ kind: "speakers_detail", rows })}
        />
      )
    }

    case "listening-match": {
      const qs = asStringArray(raw.questions)
      return (
        <View style={styles.gap}>
          {displayListeningTrack(raw.audio_track ?? raw.audio) ? (
            <Text style={styles.hint}>
              Audio track {displayListeningTrack(raw.audio_track ?? raw.audio)}
            </Text>
          ) : null}
          <ListeningMatch
            exerciseKey={exerciseKey}
            questionOptions={qs}
            onChange={(payload) => emit({ kind: "speakers", ...payload })}
          />
        </View>
      )
    }

    case "expression-notes": {
      return (
        <View style={styles.gap}>
          <Text style={styles.hint}>Listen again and note time expressions</Text>
          <ExpressionPair
            exerciseKey={exerciseKey}
            onChange={(payload) => emit({ kind: "expressions", ...payload })}
          />
        </View>
      )
    }

    case "summary-completion": {
      const summary = String(raw.summary ?? "")
      const answersLen = asStringArray(raw.answers).length
      const parsed = parseNumberedGaps(summary, answersLen || undefined)
      const expected = Math.max(parsed.gapCount, answersLen, 1)
      return (
        <View style={styles.gap}>
          {displayListeningTrack(raw.audio_track ?? raw.audio) ? (
            <Text style={styles.hint}>
              Audio track {displayListeningTrack(raw.audio_track ?? raw.audio)}
            </Text>
          ) : null}
          <InlineGapPassage
            text={summary}
            exerciseKey={exerciseKey}
            expectedCount={expected}
            placeholder="NO MORE THAN TWO WORDS"
            onChange={(values) => emit({ kind: "list", values })}
          />
        </View>
      )
    }

    case "sentence-wordbox": {
      const localBank = asStringArray(raw.adjectives).length
        ? asStringArray(raw.adjectives)
        : asStringArray(raw.words)
      const bank = localBank.length
        ? localBank
        : resolveFillBlankWordBank(raw.instruction, unitSteps)
      const sentences = Array.isArray(raw.sentences) ? raw.sentences.filter(isRecord) : []
      const typed = requiresTypedWordForms(raw.instruction)
      return (
        <SentenceWordbox
          bank={bank}
          sentences={sentences}
          exerciseKey={exerciseKey}
          forceWritable={typed}
          onChange={(values) => emit({ kind: "list", values })}
        />
      )
    }

    case "gap-fill-passage": {
      const typed = requiresTypedWordForms(raw.instruction)
      const text = String(raw.text ?? raw.passage ?? "")
      const localWords = asStringArray(raw.words)
      const words = localWords.length
        ? localWords
        : resolveFillBlankWordBank(raw.instruction, unitSteps)
      const answersLen = asStringArray(raw.answers).length
      const parsed = parseNumberedGaps(text, answersLen || words.length || undefined)
      const expected = Math.max(parsed.gapCount, answersLen, words.length, 1)
      return (
        <InlineGapPassage
          text={text}
          exerciseKey={exerciseKey}
          wordBank={words.length ? words : undefined}
          expectedCount={expected}
          placeholder="Word for this gap"
          forceWritable={typed}
          onChange={(values) => emit({ kind: "list", values })}
        />
      )
    }

    case "speaking-topic":
      return (
        <View style={styles.gap}>
          <Block title="Speaking topic">
            <Text style={styles.body}>{String(raw.topic ?? "")}</Text>
          </Block>
          <NotesAnswers
            exerciseKey={exerciseKey}
            title="Your notes / outline"
            placeholder="Key points before you speak"
            onChange={(notes) => emit({ kind: "open", notes })}
          />
        </View>
      )

    case "image-prompt":
      return (
        <View style={styles.gap}>
          <Block title="Image / mind map">
            <Text style={styles.muted}>
              {typeof raw.image_description === "string"
                ? raw.image_description
                : "Use the image from the book"}
            </Text>
          </Block>
          <NotesAnswers
            exerciseKey={exerciseKey}
            title="Your mind map notes"
            placeholder="Write ideas for each branch"
            onChange={(notes) => emit({ kind: "open", notes })}
          />
        </View>
      )

    case "graph-task":
      return (
        <View style={styles.gap}>
          <Block title="Graph">
            <Text style={styles.muted}>Use the graph in the book to complete the task</Text>
          </Block>
          <NotesAnswers
            exerciseKey={exerciseKey}
            title="Your answers / description"
            placeholder="Write your response"
            onChange={(notes) => emit({ kind: "open", notes })}
          />
        </View>
      )

    case "multiple-choice": {
      const questions = Array.isArray(raw.questions) ? raw.questions.filter(isRecord) : []
      return (
        <McqQuestions
          questions={questions}
          exerciseKey={exerciseKey}
          onChange={(byNumber) => emit({ kind: "mcq", byNumber })}
        />
      )
    }

    case "short-answer": {
      const questions = Array.isArray(raw.questions) ? raw.questions.filter(isRecord) : []
      const options = Array.isArray(raw.options) ? raw.options : []
      const labels = questions.map(
        (q, i) => `${String(q.number ?? i + 1)}. ${String(q.text ?? q.statement ?? "")}`,
      )
      return (
        <View style={styles.gap}>
          {typeof raw.passage === "string" && raw.passage ? (
            <Block title="Passage">
              <Text style={styles.body}>{raw.passage}</Text>
            </Block>
          ) : null}
          {options.length > 0 ? (
            <Block title="Options">
              {options.map((opt, i) => {
                if (typeof opt === "string") {
                  return (
                    <Text key={i} style={styles.body}>
                      {opt}
                    </Text>
                  )
                }
                if (!isRecord(opt)) return null
                return (
                  <Text key={i} style={styles.body}>
                    {String(opt.letter ?? "")} {String(opt.text ?? opt.name ?? "")}
                  </Text>
                )
              })}
            </Block>
          ) : null}
          <ListAnswers
            labels={labels.length ? labels : ["Your answer"]}
            exerciseKey={exerciseKey}
            placeholder="Type your answer"
            onChange={(values) => emit({ kind: "list", values })}
          />
        </View>
      )
    }

    case "matching-pairs": {
      const left = Array.isArray(raw.beginnings)
        ? raw.beginnings
        : Array.isArray(raw.people)
          ? raw.people
          : Array.isArray(raw.left)
            ? raw.left
            : []
      const right = Array.isArray(raw.endings)
        ? raw.endings
        : Array.isArray(raw.statements)
          ? raw.statements
          : Array.isArray(raw.right)
            ? raw.right
            : []
      const labels = left.map((item, i) => matchingColumnLabel(item, i, "left"))
      const leftTitle = Array.isArray(raw.jobs)
        ? "Jobs"
        : Array.isArray(raw.matches)
          ? "Match from"
          : "Match from"
      const rightTitle = Array.isArray(raw.jobs)
        ? "Definitions (a–f)"
        : Array.isArray(raw.matches)
          ? "Options (a–g)"
          : "Options"
      return (
        <View style={styles.gap}>
          {left.length ? (
            <Block title={leftTitle}>
              {left.map((item, i) => (
                <Text key={i} style={styles.body}>
                  {matchingColumnLabel(item, i, "left")}
                </Text>
              ))}
            </Block>
          ) : null}
          {right.length ? (
            <Block title={rightTitle}>
              {right.map((item, i) => (
                <Text key={i} style={styles.body}>
                  {matchingColumnLabel(item, i, "right")}
                </Text>
              ))}
            </Block>
          ) : null}
          <ListAnswers
            labels={labels.length ? labels : ["Match 1"]}
            exerciseKey={exerciseKey}
            placeholder="Letter (a–g)"
            onChange={(values) => emit({ kind: "list", values })}
          />
        </View>
      )
    }

    case "odd-one-out": {
      const groups = getOddOneOutGroups(raw)
      return (
        <View style={styles.gap}>
          {groups.map((g, i) => (
            <Block key={i} title={`List ${i + 1}`}>
              <ChipRow items={g.items} />
              {g.answer ? (
                <Text style={[styles.body, { marginTop: 6, fontWeight: "600" }]}>
                  Odd one out: {g.answer}
                </Text>
              ) : null}
            </Block>
          ))}
          <ListAnswers
            labels={groups.map((_, i) => `List ${i + 1} — odd one out + reason`)}
            exerciseKey={exerciseKey}
            placeholder="Odd one out + reason"
            onChange={(values) => emit({ kind: "list", values })}
          />
        </View>
      )
    }

    case "listening-table": {
      const model = parseListeningTable(raw)
      const blankRows = Array.isArray(raw.blanks) ? raw.blanks.filter(isRecord) : []
      const gapCount = model
        ? Math.max(countTableGaps(model), blankRows.length)
        : blankRows.length || 7
      const labels = Array.from({ length: Math.max(gapCount, 1) }, (_, i) => {
        const b = blankRows[i]
        const n = b?.number != null ? String(b.number) : String(i + 1)
        return `${n}.`
      })
      const titleCase = (s: string) =>
        s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      return (
        <View style={styles.gap}>
          {displayListeningTrack(raw.audio_track ?? raw.audio) ? (
            <Text style={styles.hint}>
              Audio track {displayListeningTrack(raw.audio_track ?? raw.audio)}
            </Text>
          ) : null}
          {model ? (
            <Block title="Table">
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                {model.columns.map((c) => (
                  <Text key={c} style={[styles.hint, { flex: 1, fontWeight: "700" }]}>
                    {titleCase(c)}
                  </Text>
                ))}
              </View>
              {model.rows.map((row, ri) => (
                <View
                  key={ri}
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginBottom: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#e5e7eb",
                    paddingTop: 8,
                  }}
                >
                  {model.columns.map((c) => (
                    <Text key={c} style={[styles.body, { flex: 1 }]}>
                      {String(row[c] ?? "")}
                    </Text>
                  ))}
                </View>
              ))}
            </Block>
          ) : null}
          <ListAnswers
            labels={labels}
            exerciseKey={exerciseKey}
            placeholder="Max 2 words / a number"
            onChange={(values) => emit({ kind: "list", values })}
          />
          {blankRows.some((b) => b.answer != null) ? (
            <Block title="Answers">
              {blankRows.map((b, i) => (
                <Text key={i} style={styles.body}>
                  {String(b.number ?? i + 1)}. {String(b.answer ?? "")}
                </Text>
              ))}
            </Block>
          ) : null}
        </View>
      )
    }

    case "passage-read":
      return (
        <View style={styles.gap}>
          {typeof raw.title === "string" ? (
            <Text style={styles.blockTitle}>{raw.title}</Text>
          ) : null}
          {typeof raw.passage === "string" && raw.passage ? (
            <Block title="Passage">
              <Text style={styles.body}>{raw.passage}</Text>
            </Block>
          ) : null}
          {Array.isArray(raw.advantages) ? (
            <Block title="Advantages">
              {asStringArray(raw.advantages).map((a, i) => (
                <Text key={i} style={styles.body}>
                  • {a}
                </Text>
              ))}
            </Block>
          ) : null}
          {raw.disadvantage != null ? (
            <Block title="Disadvantage">
              <Text style={styles.body}>{String(raw.disadvantage)}</Text>
            </Block>
          ) : null}
          {!Array.isArray(raw.advantages) ? (
            <NotesAnswers
              exerciseKey={exerciseKey}
              title="Notes"
              placeholder="Write your notes"
              onChange={(notes) => emit({ kind: "open", notes })}
            />
          ) : null}
        </View>
      )

    case "word-box-notes": {
      const bank = collectWordBoxItems(raw)
      const cue = isCueWordBox(raw)
      return (
        <View style={styles.gap}>
          {displayListeningTrack(raw.audio_track ?? raw.audio) ? (
            <Text style={styles.hint}>
              Audio track {displayListeningTrack(raw.audio_track ?? raw.audio)}
            </Text>
          ) : null}
          {bank.length ? (
            <Block title="Word box">
              <ChipRow items={bank} />
            </Block>
          ) : null}
          <ListAnswers
            labels={bank.length ? bank.map((w) => (cue ? `${w}:` : w)) : ["Your notes"]}
            exerciseKey={exerciseKey}
            forceWritable
            placeholder={cue ? "Adjectives you hear" : "Your notes / answer"}
            onChange={(values) => emit({ kind: "list", values })}
          />
        </View>
      )
    }

    case "instruction-only":
    default: {
      const bank = collectWordBoxItems(raw)
      return (
        <View style={styles.gap}>
          {bank.length ? (
            <Block title="Word box">
              <ChipRow items={bank} />
            </Block>
          ) : null}
          <NotesAnswers
            exerciseKey={exerciseKey}
            title="Your response"
            placeholder="Write your answer or notes for the class"
            onChange={(notes) => emit({ kind: "open", notes })}
          />
        </View>
      )
    }
  }
}

/** Two-field expression notes (speaker 1 + 2). */
function ExpressionPair({
  exerciseKey,
  onChange,
}: {
  exerciseKey: string
  onChange?: (payload: { speaker_1: string; speaker_2: string }) => void
}) {
  const [s1, setS1] = useState("")
  const [s2, setS2] = useState("")
  useEffect(() => {
    setS1("")
    setS2("")
  }, [exerciseKey])

  const emit = (a: string, b: string) => {
    queueMicrotask(() => onChange?.({ speaker_1: a, speaker_2: b }))
  }

  return (
    <View style={styles.gap}>
      <Block title="Speaker 1 expressions">
        <AnswerInput
          value={s1}
          onChangeText={(t) => {
            setS1(t)
            emit(t, s2)
          }}
          placeholder="List expressions (one per line or comma-separated)"
          multiline
        />
      </Block>
      <Block title="Speaker 2 expressions">
        <AnswerInput
          value={s2}
          onChangeText={(t) => {
            setS2(t)
            emit(s1, t)
          }}
          placeholder="List expressions (one per line or comma-separated)"
          multiline
        />
      </Block>
    </View>
  )
}

export function LiveExerciseView({
  step,
  unitSteps,
  locked = false,
  onAnswersChange,
  embedded = false,
  active = false,
  reviewItems,
  resultMode,
  bookId = DEMO_BOOK_ID,
  liveLessonId,
  showReportIssue = true,
}: {
  step: LessonStep
  /** Full unit flow — used to resolve "words in the box in X.Y". */
  unitSteps?: LessonStep[]
  locked?: boolean
  onAnswersChange?: (answers: Record<string, unknown>) => void
  /** When true, omit outer ScrollView (for stacking exercises on a book page). */
  embedded?: boolean
  /** Brand-blue “Active” border while the teacher has this exercise open. */
  active?: boolean
  /** After teacher Finish — per-item correct/incorrect feedback. */
  reviewItems?: Array<{
    id: string
    label?: string
    given: string
    expected: string
    ok: boolean | null
  }>
  /** compact = score only (e.g. 19/20); full = detailed answer review. */
  resultMode?: "compact" | "full"
  bookId?: string
  liveLessonId?: string
  showReportIssue?: boolean
}) {
  const exerciseKey = `${step.unitNumber}-${step.exerciseId}-${step.uiType}`
  const [dock, setDock] = useState<DockState>(null)
  const dockApi = useMemo(() => ({ setDock }), [])
  const reviewCorrect = reviewItems?.filter((item) => item.ok === true).length ?? 0
  const reviewTotal = reviewItems?.length ?? 0

  const report = showReportIssue
    ? bookIssueReport({
        bookId,
        unitNumber: step.unitNumber,
        exerciseId: step.exerciseId,
        exerciseTitle: `${step.sectionLabel} · ${step.exerciseId}`,
        questionPrompt: step.instruction,
        liveLessonId,
      })
    : null

  const body = (
    <>
      <View style={styles.metaRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{step.uiLabel}</Text>
        </View>
        <Text style={styles.meta}>Ex {step.exerciseId}</Text>
        {report ? (
          <View style={{ marginLeft: "auto" }}>
            <HomeworkReportIssueButton report={report} variant="badge" />
          </View>
        ) : null}
      </View>
      {step.instruction ? <Text style={styles.instruction}>{step.instruction}</Text> : null}
      {renderBody(step.raw, step.uiType, exerciseKey, onAnswersChange, unitSteps)}
      {reviewItems && reviewItems.length > 0 && resultMode === "compact" ? (
        <View style={styles.compactResult}>
          <Text style={styles.compactResultText}>
            {reviewCorrect}/{reviewTotal} correct
          </Text>
        </View>
      ) : null}
      {reviewItems && reviewItems.length > 0 && resultMode === "full" ? (
        <View style={styles.reviewBlock}>
          <View style={styles.reviewSummary}>
            <Text style={styles.reviewSummaryTitle}>Result</Text>
            <Text style={styles.reviewSummaryOk}>
              {reviewCorrect}/{reviewTotal} correct
            </Text>
          </View>
          <Text style={styles.reviewTitle}>Your answers</Text>
          {reviewItems.map((item) => (
            <View
              key={item.id}
              style={[
                styles.reviewRow,
                item.ok === true && styles.reviewRowOk,
                item.ok === false && styles.reviewRowBad,
              ]}
            >
              <Text style={styles.reviewLabel}>{item.label ?? item.id}</Text>
              {item.given && item.given !== "—" && item.given !== item.expected ? (
                <Text style={styles.reviewMeta}>Yours: {item.given}</Text>
              ) : null}
              {item.ok === false && item.expected ? (
                <Text style={styles.reviewMeta}>Correct: {item.expected}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </>
  )

  const hasResult = Boolean(reviewItems?.length && resultMode)
  const cardStyle = [
    styles.wrap,
    embedded && styles.embeddedCard,
    active && !hasResult && styles.activeCard,
    locked && !hasResult && { opacity: 0.75 },
  ]

  return (
    <WordBankDockContext.Provider value={dockApi}>
      <View style={embedded ? undefined : { flex: 1 }}>
        {embedded ? (
          <View style={cardStyle} pointerEvents={locked ? "none" : "auto"}>
            {active && !hasResult ? (
              <View style={styles.activeEdgeLabel} pointerEvents="none">
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            ) : null}
            {body}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.wrap,
              active && !hasResult && styles.activeCard,
              dock ? { paddingBottom: 8 } : null,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            pointerEvents={locked && !hasResult ? "none" : "auto"}
          >
            {active && !hasResult ? (
              <View style={styles.activeEdgeLabel} pointerEvents="none">
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            ) : null}
            {body}
          </ScrollView>
        )}
        {dock && !locked ? (
          <View style={styles.wordDock}>
            <Text style={styles.wordDockHint}>{dock.hint}</Text>
            <View style={[styles.chipRow, dock.selectedBlank == null && { opacity: 0.45 }]}>
              {dock.words.map((word) => (
                <Chip
                  key={word}
                  label={word}
                  onPress={() => {
                    if (dock.selectedBlank == null) return
                    dock.onPickWord(word)
                  }}
                />
              ))}
            </View>
            {dock.selectedBlank == null ? (
              <Text style={styles.muted}>Select a blank above first</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </WordBankDockContext.Provider>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: spacing.lg, gap: spacing.sm, position: "relative" },
  embeddedCard: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.card,
    padding: spacing.sm,
    paddingTop: spacing.md,
  },
  activeEdgeLabel: {
    position: "absolute",
    top: -10,
    left: 12,
    zIndex: 2,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeBadgeText: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  reviewBlock: { marginTop: spacing.sm, gap: 6 },
  reviewSummary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    gap: 4,
  },
  reviewSummaryTitle: { ...typography.caption, color: colors.primaryDark, fontWeight: "700" },
  reviewSummaryOk: { ...typography.label, color: "#047857", fontWeight: "700" },
  compactResult: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  compactResultText: { ...typography.label, color: colors.primaryDark, fontWeight: "800", fontSize: 16 },
  reviewTitle: { ...typography.label, color: colors.text, fontWeight: "700" },
  reviewRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
    padding: spacing.sm,
    gap: 2,
  },
  reviewRowOk: { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" },
  reviewRowBad: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  reviewLabel: { ...typography.label, color: colors.text, fontWeight: "600" },
  reviewMeta: { ...typography.caption, color: colors.textSecondary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { ...typography.caption, color: colors.primaryDark, fontWeight: "600" },
  meta: { ...typography.caption, color: colors.textMuted },
  instruction: { fontSize: 13, color: colors.text, lineHeight: 18 },
  gap: { gap: spacing.sm },
  block: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  blockActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  blockTitle: { ...typography.label, color: colors.text, fontWeight: "700" },
  body: { fontSize: 13, color: colors.text, lineHeight: 18 },
  muted: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.primaryDark, marginTop: 2 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputMulti: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipRowCompact: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: "100%",
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
  chipTextCompact: { fontSize: 11, lineHeight: 14, fontWeight: "600" },
  chipTextSelected: { color: colors.primaryDark, fontWeight: "700" },
  chipTextPlaced: { color: "#047857", fontWeight: "600" },
  blankPill: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  blankPillActive: {
    borderColor: colors.primary,
    borderStyle: "solid",
    backgroundColor: colors.primaryLight,
  },
  blankPillText: { fontSize: 13, color: colors.textMuted },
  blankPillFilled: { color: colors.text, fontWeight: "600" },
  inlineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
  },
  inlineText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  inlineBlank: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 24,
    alignItems: "center",
    backgroundColor: colors.primaryLight,
  },
  inlineBlankActive: {
    backgroundColor: colors.primary,
  },
  inlineBlankText: { ...typography.caption, color: colors.primaryDark, fontWeight: "700" },
  wordDock: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  wordDockHint: { ...typography.caption, color: colors.primaryDark, fontWeight: "600" },
})

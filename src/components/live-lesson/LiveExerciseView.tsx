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

/** "words in the box in 2.1" → pull string items from that exercise in the unit. */
function wordBankFromBoxRef(
  instruction: unknown,
  unitSteps?: LessonStep[],
): string[] {
  if (typeof instruction !== "string" || !unitSteps?.length) return []
  const ref = instruction.match(
    /(?:words?|adjectives|phrases)\s+in\s+the\s+box(?:\s+in)?\s+(\d+\.\d+)/i,
  )
  if (!ref?.[1]) return []
  const refStep = unitSteps.find((s) => s.exerciseId === ref[1])
  if (!refStep) return []
  const fromItems = asStringArray(refStep.raw.items)
  if (fromItems.length) return fromItems
  // Classification bank may live only as emptied answer keys after strip — try items on answers keys' sibling
  if (isRecord(refStep.raw.answers)) {
    const nested = Object.values(refStep.raw.answers).flatMap((v) => asStringArray(v))
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
              {num}. {String(q.statement ?? "")}
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

/** Indexed text answers → { kind: "list", values: string[] } */
function ListAnswers({
  labels,
  exerciseKey,
  onChange,
  placeholder,
  wordBank,
}: {
  labels: string[]
  exerciseKey: string
  onChange?: (values: string[]) => void
  placeholder?: string
  wordBank?: string[]
}) {
  const [values, setValues] = useState<string[]>(() => labels.map(() => ""))
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null)
  const hasBank = Boolean(wordBank && wordBank.length > 0)
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
    hasBank ? wordBank : undefined,
    selectedBlank,
    onPickWord,
    selectedBlank != null
      ? `Gap ${selectedBlank + 1} selected — tap a word below`
      : "Tap a blank, then tap a word below",
  )

  return (
    <View style={styles.gap}>
      {hasBank ? (
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
              if (!hasBank) return
              setSelectedBlank((cur) => (cur === i ? null : i))
            }}
            style={[styles.block, selected && styles.blockActive]}
          >
            <Text style={styles.body}>{label}</Text>
            {hasBank ? (
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
}: {
  text: string
  exerciseKey: string
  onChange?: (values: string[]) => void
  wordBank?: string[]
  expectedCount?: number
  placeholder?: string
}) {
  const { segments, gapCount } = useMemo(
    () => parseNumberedGaps(text, expectedCount),
    [text, expectedCount],
  )
  const count = Math.max(gapCount, expectedCount ?? 0)
  const [values, setValues] = useState<string[]>(() => Array.from({ length: count }, () => ""))
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null)
  const hasBank = Boolean(wordBank && wordBank.length > 0)
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
    hasBank ? wordBank : undefined,
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
          onChange={onChange}
        />
      </View>
    )
  }

  return (
    <View style={styles.gap}>
      <Text style={styles.hint}>
        {hasBank
          ? selectedBlank != null
            ? `Gap ${selectedBlank + 1} selected — pick a word below`
            : "Tap a number in the text, then pick a word from the bottom panel"
          : "Tap a number in the text to select a blank, then type below — or fill the list"}
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
      {!hasBank ? (
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
}: {
  bank: string[]
  sentences: Array<Record<string, unknown>>
  exerciseKey: string
  onChange?: (values: string[]) => void
}) {
  const labels = sentences.map((s, i) => `${i + 1}. ${String(s.sentence ?? "")}`)
  return (
    <ListAnswers
      labels={labels}
      exerciseKey={exerciseKey}
      wordBank={bank}
      placeholder="Fill the blank"
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
          items={asStringArray(raw.items)}
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
      const labels = items.map((it, i) => `${i + 1}. ${String(it.sentence ?? "")}`)
      const bank = resolveFillBlankWordBank(raw.instruction, unitSteps)
      return (
        <ListAnswers
          labels={labels}
          exerciseKey={exerciseKey}
          placeholder="Fill the blank"
          wordBank={bank.length ? bank : undefined}
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
      return (
        <ListAnswers
          labels={labels.length ? labels : ["Write the paraphrase"]}
          exerciseKey={exerciseKey}
          placeholder="Paraphrase / matching phrase"
          onChange={(values) => emit({ kind: "list", values })}
        />
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
          {body.length ? (
            <Block title={typeof notes.title === "string" ? notes.title : "Prompt"}>
              {body.map((line, i) => (
                <Text key={i} style={styles.body}>
                  {line}
                </Text>
              ))}
            </Block>
          ) : null}
          <NotesAnswers
            exerciseKey={exerciseKey}
            title="Your notes"
            placeholder="Write what you hear / key points"
            onChange={(text) => emit({ kind: "open", notes: text })}
          />
        </View>
      )
    }

    case "discussion-questions": {
      const qs = asStringArray(raw.questions)
      return (
        <ListAnswers
          labels={qs.map((q, i) => `${i + 1}. ${q}`)}
          exerciseKey={exerciseKey}
          placeholder="Your ideas / answer"
          onChange={(values) => emit({ kind: "list", values })}
        />
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
          {raw.audio_track != null ? (
            <Text style={styles.hint}>Audio track {String(raw.audio_track)}</Text>
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
          {raw.audio_track != null ? (
            <Text style={styles.hint}>Audio track {String(raw.audio_track)}</Text>
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
      const bank = asStringArray(raw.adjectives).length
        ? asStringArray(raw.adjectives)
        : asStringArray(raw.words)
      const sentences = Array.isArray(raw.sentences) ? raw.sentences.filter(isRecord) : []
      return (
        <SentenceWordbox
          bank={bank}
          sentences={sentences}
          exerciseKey={exerciseKey}
          onChange={(values) => emit({ kind: "list", values })}
        />
      )
    }

    case "gap-fill-passage": {
      const text = String(raw.text ?? "")
      const words = asStringArray(raw.words)
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

    case "instruction-only":
    default:
      return (
        <NotesAnswers
          exerciseKey={exerciseKey}
          title="Your response"
          placeholder="Write your answer or notes for the class"
          onChange={(notes) => emit({ kind: "open", notes })}
        />
      )
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
          placeholder="Expressions you hear"
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
          placeholder="Expressions you hear"
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
}: {
  step: LessonStep
  /** Full unit flow — used to resolve "words in the box in X.Y". */
  unitSteps?: LessonStep[]
  locked?: boolean
  onAnswersChange?: (answers: Record<string, unknown>) => void
}) {
  const exerciseKey = `${step.unitNumber}-${step.exerciseId}-${step.uiType}`
  const [dock, setDock] = useState<DockState>(null)
  const dockApi = useMemo(() => ({ setDock }), [])

  return (
    <WordBankDockContext.Provider value={dockApi}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.wrap, dock ? { paddingBottom: 8 } : null]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          pointerEvents={locked ? "none" : "auto"}
        >
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{step.uiLabel}</Text>
            </View>
            <Text style={styles.meta}>Ex {step.exerciseId}</Text>
          </View>
          {step.instruction ? <Text style={styles.instruction}>{step.instruction}</Text> : null}
          {renderBody(step.raw, step.uiType, exerciseKey, onAnswersChange, unitSteps)}
        </ScrollView>
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
        {locked ? (
          <View style={styles.lockedBanner} pointerEvents="none">
            <Text style={styles.lockedText}>Answers locked</Text>
          </View>
        ) : null}
      </View>
    </WordBankDockContext.Provider>
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
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputMulti: {
    minHeight: 88,
    textAlignVertical: "top",
  },
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
  blankPill: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  blankPillActive: {
    borderColor: colors.primary,
    borderStyle: "solid",
    backgroundColor: colors.primaryLight,
  },
  blankPillText: { ...typography.body, color: colors.textMuted },
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
    padding: spacing.md,
  },
  inlineText: { ...typography.body, color: colors.text, lineHeight: 24 },
  inlineBlank: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
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

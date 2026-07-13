import React, { useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"

const PURPLE = {
  deep: "#4A2C7A",
  mid: "#6B3FA0",
  soft: "#EDE4F7",
  wash: "#F7F2FC",
  line: "#C4A8E0",
  note: "#5B3A8C",
  pageBg: "#E8E0F0",
}

const ITEMS_1_1 = ["clothes", "bedroom", "car", "internet", "music", "hairstyle"] as const
const ANSWERS_1_2 = new Set(["clothes", "music", "hairstyle", "car"])
const PHRASAL_1_3 = ["blend in with", "stand out from", "fit in with"] as const
const ANSWER_1_3 = new Set(["blend in with", "fit in with"])

const BANK_1_4 = [
  "fit in (with)",
  "stand out (from)",
  "break away (from)",
  "opt out (of)",
  "blend in (with)",
  "drop out (of)",
  "join in",
] as const

type Blank14 = {
  id: string
  sentenceBefore: string
  underlined: string
  sentenceAfter: string
  answers: string[]
}

const BLANKS_1_4: Blank14[] = [
  {
    id: "1",
    sentenceBefore: "I feel uncomfortable if I'm forced to ",
    underlined: "participate in",
    sentenceAfter: " group activities.",
    answers: ["join in"],
  },
  {
    id: "2a",
    sentenceBefore: "I don't like to ",
    underlined: "be noticeable",
    sentenceAfter: " in the crowd. I'd rather ",
    answers: ["stand out (from)", "stand out"],
  },
  {
    id: "2b",
    sentenceBefore: "",
    underlined: "look the same as",
    sentenceAfter: " everyone else.",
    answers: ["blend in (with)", "blend in"],
  },
  {
    id: "3",
    sentenceBefore: "My friends started going out late to nightclubs so I decided to ",
    underlined: "dissociate myself from",
    sentenceAfter: " the group.",
    answers: ["break away (from)", "break away"],
  },
  {
    id: "4",
    sentenceBefore: "When people feel isolated and rejected, they sometimes ",
    underlined: "abandon",
    sentenceAfter: " society altogether.",
    answers: ["drop out (of)", "drop out", "opt out (of)", "opt out"],
  },
  {
    id: "5",
    sentenceBefore: "New migrants may feel that by changing to ",
    underlined: "assimilate into",
    sentenceAfter: " their new community, they are losing some part of their individuality.",
    answers: ["fit in (with)", "fit in", "blend in (with)", "blend in"],
  },
]

const MATCH_STEMS = [
  "In the past, tattoos were judged to be",
  "Tattoos are now",
  "Famous people help to establish",
  "Throughout the United States, local governments have developed",
  "Society's previous attitude towards people with tattoos could be described as",
] as const

const MATCH_ENDINGS = [
  { letter: "A", text: "stereotypical." },
  { letter: "B", text: "a more tolerant attitude." },
  { letter: "C", text: "harmful to society." },
  { letter: "D", text: "behaviour patterns." },
  { letter: "E", text: "self-destructive." },
  { letter: "F", text: "approved of by society." },
] as const

const ANSWERS_2_1 = ["C", "F", "D", "B", "A"] as const

function normalizePhrase(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
}

function ExNum({ n }: { n: string }) {
  return (
    <View style={styles.exNum}>
      <Text style={styles.exNumText}>{n}</Text>
    </View>
  )
}

function WordBank({ words }: { words: readonly string[] }) {
  return (
    <View style={styles.wordBank}>
      <View style={styles.wordBankRow}>
        {words.map((w) => (
          <Text key={w} style={styles.wordBankItem}>
            {w}
          </Text>
        ))}
      </View>
    </View>
  )
}

function BlankSlot({
  selected,
  value,
  underlined,
  ok,
  onSelect,
}: {
  selected: boolean
  value?: string
  underlined: string
  ok: boolean | null
  onSelect: () => void
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.blankSlot,
        selected && styles.blankSlotSelected,
        ok === true && styles.blankSlotOk,
        ok === false && styles.blankSlotBad,
      ]}
    >
      <Text
        style={[
          styles.blankSlotText,
          value ? styles.blankSlotFilled : styles.blankSlotUnderlined,
          ok === true && { color: "#047857" },
          ok === false && { color: "#B91C1C" },
        ]}
      >
        {value || underlined}
      </Text>
    </Pressable>
  )
}

/**
 * Debug demo: Cambridge Vocab–style Interactive page (Unit 3 · Individuality).
 */
export default function IndividualityDemoScreen() {
  const [ticks11, setTicks11] = useState<Record<string, boolean>>({})
  const [ticks12, setTicks12] = useState<Record<string, boolean>>({})
  const [pick13, setPick13] = useState<string[]>([])
  const [answers14, setAnswers14] = useState<Record<string, string>>({})
  const [match21, setMatch21] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const [selectedBlank14, setSelectedBlank14] = useState<string | null>(null)

  const toggle13 = (word: string) => {
    setPick13((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word)
      if (prev.length >= 2) return [prev[1], word]
      return [...prev, word]
    })
  }

  const result = useMemo(() => {
    if (!checked) return null
    let correct = 0
    let total = 0

    for (const item of ITEMS_1_1) {
      total += 1
      if (ANSWERS_1_2.has(item) === Boolean(ticks12[item])) correct += 1
    }

    total += 1
    const set13 = new Set(pick13)
    if (set13.size === 2 && [...ANSWER_1_3].every((w) => set13.has(w))) correct += 1

    for (const blank of BLANKS_1_4) {
      total += 1
      const given = normalizePhrase(answers14[blank.id] ?? "")
      if (blank.answers.some((a) => normalizePhrase(a) === given)) correct += 1
    }

    ANSWERS_2_1.forEach((ans, i) => {
      total += 1
      if ((match21[i] ?? "").toUpperCase() === ans) correct += 1
    })

    return { correct, total, pct: total ? Math.round((100 * correct) / total) : 0 }
  }, [checked, ticks12, pick13, answers14, match21])

  const reset = () => {
    setTicks11({})
    setTicks12({})
    setPick13([])
    setAnswers14({})
    setMatch21({})
    setChecked(false)
    setSelectedBlank14(null)
  }

  const blankOk = (blank: Blank14) => {
    if (!checked) return null
    const given = normalizePhrase(answers14[blank.id] ?? "")
    return blank.answers.some((a) => normalizePhrase(a) === given)
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBtn}>
          <Ionicons name="close" size={22} color="#1f2937" />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.topEyebrow}>DEBUG DEMO</Text>
          <Text style={styles.topTitle} numberOfLines={1}>
            Individuality
          </Text>
        </View>
        <View style={styles.topActions}>
          <Pressable onPress={reset} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color="#4B5563" />
          </Pressable>
          <Pressable onPress={() => setChecked(true)} style={styles.checkBtn}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.checkBtnText}>Check</Text>
          </Pressable>
        </View>
      </View>

      {result ? (
        <View
          style={[
            styles.scoreBanner,
            {
              backgroundColor:
                result.pct >= 70 ? "#059669" : result.pct >= 40 ? "#D97706" : "#DC2626",
            },
          ]}
        >
          <Text style={styles.scoreBannerText}>
            {result.correct}/{result.total} · {result.pct}%
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          <View style={styles.titleBanner}>
            <Text style={styles.titleBannerText}>Individuality</Text>
          </View>

          {/* 1.1 */}
          <View style={styles.section}>
            <View style={styles.instructionRow}>
              <ExNum n="1.1" />
              <Text style={styles.instruction}>
                How do people use these things to express their individuality?
              </Text>
            </View>
            <View style={styles.checkGrid}>
              {ITEMS_1_1.map((item) => (
                <Pressable
                  key={item}
                  style={styles.checkItem}
                  onPress={() => setTicks11((p) => ({ ...p, [item]: !p[item] }))}
                >
                  <View style={[styles.checkbox, ticks11[item] && styles.checkboxOn]}>
                    {ticks11[item] ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                  </View>
                  <Text style={styles.checkLabel}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 1.2 */}
          <View style={styles.section}>
            <View style={styles.instructionRow}>
              <ExNum n="1.2" />
              <View style={styles.audioPill}>
                <Ionicons name="headset" size={12} color="#fff" />
                <Text style={styles.audioPillText}>06</Text>
              </View>
              <Text style={styles.instruction}>
                Listen to someone talking about individuality and tick the things in 1.1 that he
                mentions.
              </Text>
            </View>
            <View style={styles.checkGrid}>
              {ITEMS_1_1.map((item) => {
                const on = Boolean(ticks12[item])
                const should = ANSWERS_1_2.has(item)
                const show = checked
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.checkItem,
                      show && should && on && styles.checkOk,
                      show && ((should && !on) || (!should && on)) && styles.checkBad,
                    ]}
                    onPress={() => {
                      setChecked(false)
                      setTicks12((p) => ({ ...p, [item]: !p[item] }))
                    }}
                  >
                    <View style={[styles.checkbox, on && styles.checkboxOn]}>
                      {on ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                    </View>
                    <Text style={styles.checkLabel}>{item}</Text>
                  </Pressable>
                )
              })}
            </View>
            <Text style={styles.tip}>
              Demo tip: speaker mentioned clothes, car, music and hairstyle.
            </Text>
          </View>

          {/* 1.3 */}
          <View style={styles.section}>
            <View style={styles.instructionRow}>
              <ExNum n="1.3" />
              <Text style={styles.instruction}>
                Now listen again and notice these phrasal verbs. Which two have a similar meaning?
              </Text>
            </View>
            <WordBank words={PHRASAL_1_3} />
            <View style={styles.chipRow}>
              {PHRASAL_1_3.map((w) => {
                const selected = pick13.includes(w)
                const ok = checked && ANSWER_1_3.has(w) && selected
                const bad = checked && selected && !ANSWER_1_3.has(w)
                return (
                  <Pressable
                    key={w}
                    onPress={() => {
                      setChecked(false)
                      toggle13(w)
                    }}
                    style={[
                      styles.phrasalChip,
                      selected && styles.phrasalChipOn,
                      ok && styles.ringOk,
                      bad && styles.ringBad,
                    ]}
                  >
                    <Text style={[styles.phrasalChipText, selected && { color: "#fff" }]}>{w}</Text>
                  </Pressable>
                )
              })}
            </View>
            <Text style={styles.tip}>Select exactly two.</Text>
          </View>

          {/* 1.4 */}
          <View style={styles.section}>
            <View style={styles.instructionRow}>
              <ExNum n="1.4" />
              <Text style={styles.instruction}>
                Check the meanings of the phrasal verbs in the box. Replace the underlined phrases
                with a phrasal verb from the box. There may be more than one possible answer.
              </Text>
            </View>
            <WordBank words={BANK_1_4} />

            <View style={styles.sentences}>
              <View style={styles.sentenceRow}>
                <Text style={styles.sentNum}>1 </Text>
                <Text style={styles.sentenceText}>{BLANKS_1_4[0].sentenceBefore}</Text>
                <BlankSlot
                  selected={selectedBlank14 === "1"}
                  value={answers14["1"]}
                  underlined={BLANKS_1_4[0].underlined}
                  ok={blankOk(BLANKS_1_4[0])}
                  onSelect={() => setSelectedBlank14((c) => (c === "1" ? null : "1"))}
                />
                <Text style={styles.sentenceText}>{BLANKS_1_4[0].sentenceAfter}</Text>
              </View>

              <View style={styles.sentenceRow}>
                <Text style={styles.sentNum}>2 </Text>
                <Text style={styles.sentenceText}>{BLANKS_1_4[1].sentenceBefore}</Text>
                <BlankSlot
                  selected={selectedBlank14 === "2a"}
                  value={answers14["2a"]}
                  underlined={BLANKS_1_4[1].underlined}
                  ok={blankOk(BLANKS_1_4[1])}
                  onSelect={() => setSelectedBlank14((c) => (c === "2a" ? null : "2a"))}
                />
                <Text style={styles.sentenceText}>{BLANKS_1_4[1].sentenceAfter}</Text>
                <BlankSlot
                  selected={selectedBlank14 === "2b"}
                  value={answers14["2b"]}
                  underlined={BLANKS_1_4[2].underlined}
                  ok={blankOk(BLANKS_1_4[2])}
                  onSelect={() => setSelectedBlank14((c) => (c === "2b" ? null : "2b"))}
                />
                <Text style={styles.sentenceText}>{BLANKS_1_4[2].sentenceAfter}</Text>
              </View>

              {[BLANKS_1_4[3], BLANKS_1_4[4], BLANKS_1_4[5]].map((blank, idx) => (
                <View key={blank.id} style={styles.sentenceRow}>
                  <Text style={styles.sentNum}>{idx + 3} </Text>
                  <Text style={styles.sentenceText}>{blank.sentenceBefore}</Text>
                  <BlankSlot
                    selected={selectedBlank14 === blank.id}
                    value={answers14[blank.id]}
                    underlined={blank.underlined}
                    ok={blankOk(blank)}
                    onSelect={() => setSelectedBlank14((c) => (c === blank.id ? null : blank.id))}
                  />
                  <Text style={styles.sentenceText}>{blank.sentenceAfter}</Text>
                </View>
              ))}
            </View>

            <View style={styles.dock}>
              <Text style={styles.dockHint}>
                {selectedBlank14
                  ? "Blank selected — tap a phrasal verb"
                  : "Tap an underlined phrase, then choose a verb"}
              </Text>
              <View style={styles.chipRow}>
                {BANK_1_4.map((opt) => {
                  const selected = selectedBlank14
                    ? answers14[selectedBlank14] === opt
                    : false
                  return (
                    <Pressable
                      key={opt}
                      disabled={!selectedBlank14}
                      onPress={() => {
                        if (!selectedBlank14) return
                        setChecked(false)
                        setAnswers14((p) => ({ ...p, [selectedBlank14]: opt }))
                      }}
                      style={[
                        styles.bankChip,
                        selected && styles.bankChipOn,
                        !selectedBlank14 && { opacity: 0.45 },
                      ]}
                    >
                      <Text style={[styles.bankChipText, selected && { color: "#fff" }]}>{opt}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </View>

          {/* 2.1 */}
          <View style={styles.section}>
            <View style={styles.instructionRow}>
              <ExNum n="2.1" />
              <Text style={styles.instruction}>
                Read the passage on the opposite page and complete these sentences with the correct
                ending (A–F).
              </Text>
            </View>

            {MATCH_STEMS.map((stem, i) => {
              const letter = match21[i] ?? ""
              const ok = checked ? letter.toUpperCase() === ANSWERS_2_1[i] : null
              return (
                <View key={stem} style={styles.matchRow}>
                  <Text style={styles.sentNum}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchStem}>{stem}</Text>
                    <View style={styles.letterRow}>
                      {MATCH_ENDINGS.map((e) => {
                        const on = letter === e.letter
                        return (
                          <Pressable
                            key={e.letter}
                            onPress={() => {
                              setChecked(false)
                              setMatch21((p) => ({
                                ...p,
                                [i]: on ? "" : e.letter,
                              }))
                            }}
                            style={[
                              styles.letterChip,
                              on && styles.letterChipOn,
                              ok === true && on && styles.ringOk,
                              ok === false && on && styles.ringBad,
                            ]}
                          >
                            <Text style={[styles.letterChipText, on && { color: "#fff" }]}>
                              {e.letter}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                    {letter ? (
                      <Text style={styles.matchPicked}>
                        {MATCH_ENDINGS.find((e) => e.letter === letter)?.text}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )
            })}

            <View style={styles.endingsBox}>
              {MATCH_ENDINGS.map((e) => (
                <Text key={e.letter} style={styles.endingLine}>
                  <Text style={styles.endingLetter}>{e.letter} </Text>
                  {e.text}
                </Text>
              ))}
            </View>
          </View>

          {/* Vocabulary note */}
          <View style={styles.vocabNote}>
            <View style={styles.vocabHead}>
              <View style={styles.vocabV}>
                <Text style={styles.vocabVText}>V</Text>
              </View>
              <Text style={styles.vocabTitle}>Vocabulary note</Text>
            </View>
            <Text style={styles.vocabBody}>
              <Text style={styles.strike}>Individualities</Text> and{" "}
              <Text style={styles.strike}>behaviours</Text> are not usually used in the plural. Prefer{" "}
              <Text style={styles.vocabStrong}>individuality</Text> and{" "}
              <Text style={styles.vocabStrong}>behaviour</Text>.
            </Text>
            <Text style={[styles.vocabBody, { marginTop: 8 }]}>
              <Text style={styles.vocabStrong}>Originality</Text> means the quality of being new and
              different in a good way.
            </Text>
            <Text style={styles.vocabExample}>“Her clothes show real originality.”</Text>
          </View>

          <Text style={styles.pageNum}>18</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PURPLE.pageBg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  topBtn: { padding: 4 },
  topCenter: { flex: 1 },
  topEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: PURPLE.mid,
  },
  topTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PURPLE.mid,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  checkBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  scoreBanner: {
    paddingVertical: 8,
    alignItems: "center",
  },
  scoreBannerText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  scroll: { padding: 12, paddingBottom: 40 },
  page: {
    backgroundColor: "#fff",
    borderRadius: 4,
    padding: 16,
    shadowColor: PURPLE.deep,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  titleBanner: {
    alignSelf: "flex-start",
    backgroundColor: PURPLE.deep,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  titleBannerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  section: { marginBottom: 18 },
  instructionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 6 },
  instruction: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    color: "#111827",
    fontFamily: "Georgia",
  },
  exNum: {
    backgroundColor: PURPLE.mid,
    borderRadius: 3,
    minWidth: 28,
    height: 22,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  exNumText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  audioPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PURPLE.mid,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 1,
  },
  audioPillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  checkGrid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  checkItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  checkOk: { backgroundColor: "#ECFDF5" },
  checkBad: { backgroundColor: "#FEF2F2" },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: PURPLE.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxOn: { backgroundColor: PURPLE.mid, borderColor: PURPLE.mid },
  checkLabel: { fontSize: 14, color: "#1f2937", fontFamily: "Georgia" },
  tip: { marginTop: 8, fontSize: 12, color: "#6B7280" },
  wordBank: {
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: PURPLE.soft,
    borderWidth: 1,
    borderColor: PURPLE.line,
    borderRadius: 3,
    padding: 10,
  },
  wordBankRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  wordBankItem: {
    fontSize: 13.5,
    fontStyle: "italic",
    color: "#1f2937",
    fontFamily: "Georgia",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  phrasalChip: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  phrasalChipOn: { backgroundColor: PURPLE.mid, borderColor: PURPLE.mid },
  phrasalChipText: { fontSize: 13, fontStyle: "italic", color: "#1f2937" },
  ringOk: { borderWidth: 2, borderColor: "#34D399" },
  ringBad: { borderWidth: 2, borderColor: "#F87171" },
  sentences: { marginTop: 8, gap: 14 },
  sentenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
  },
  sentenceText: { fontSize: 14.5, lineHeight: 24, color: "#111827", fontFamily: "Georgia" },
  sentNum: { fontWeight: "700", color: PURPLE.mid, fontSize: 14.5 },
  blankSlot: {
    borderBottomWidth: 2,
    borderBottomColor: PURPLE.mid,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 90,
  },
  blankSlotSelected: { backgroundColor: "#EDE4F7" },
  blankSlotOk: { borderBottomColor: "#059669", backgroundColor: "#ECFDF5" },
  blankSlotBad: { borderBottomColor: "#DC2626", backgroundColor: "#FEF2F2" },
  blankSlotText: { fontSize: 14, color: "#111827" },
  blankSlotUnderlined: { textDecorationLine: "underline" },
  blankSlotFilled: { fontWeight: "700", fontStyle: "italic" },
  dock: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DDD6FE",
    backgroundColor: "#F5F3FF",
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },
  dockHint: { fontSize: 12, fontWeight: "600", color: PURPLE.note },
  bankChip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  bankChipOn: { backgroundColor: PURPLE.mid, borderColor: PURPLE.mid },
  bankChipText: { fontSize: 12, color: "#374151" },
  matchRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  matchStem: { fontSize: 13.5, lineHeight: 19, color: "#111827", fontFamily: "Georgia" },
  letterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  letterChip: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PURPLE.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  letterChipOn: { backgroundColor: PURPLE.mid, borderColor: PURPLE.mid },
  letterChipText: { fontWeight: "800", color: PURPLE.mid, fontSize: 13 },
  matchPicked: { marginTop: 4, fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  endingsBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: PURPLE.line,
    backgroundColor: PURPLE.wash,
    borderRadius: 3,
    padding: 12,
    gap: 6,
  },
  endingLine: { fontSize: 13.5, color: "#1f2937", fontFamily: "Georgia" },
  endingLetter: { fontWeight: "800", color: PURPLE.mid },
  vocabNote: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: PURPLE.mid,
    borderRadius: 3,
    padding: 12,
    backgroundColor: "#fff",
  },
  vocabHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  vocabV: {
    width: 26,
    height: 26,
    borderRadius: 3,
    backgroundColor: PURPLE.mid,
    alignItems: "center",
    justifyContent: "center",
  },
  vocabVText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  vocabTitle: { fontSize: 14, fontWeight: "800", color: PURPLE.deep },
  vocabBody: { fontSize: 13, lineHeight: 19, color: "#374151", fontFamily: "Georgia" },
  vocabStrong: { fontWeight: "700", color: PURPLE.deep },
  strike: { textDecorationLine: "line-through", color: "#DC2626" },
  vocabExample: {
    marginTop: 8,
    fontSize: 12.5,
    fontStyle: "italic",
    color: "#6B7280",
    backgroundColor: PURPLE.soft,
    padding: 8,
    borderRadius: 3,
  },
  pageNum: { marginTop: 16, fontSize: 12, color: "#9CA3AF" },
})

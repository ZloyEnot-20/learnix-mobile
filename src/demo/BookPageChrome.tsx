import React from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton"
import { PURPLE, TEXTBOOK } from "./theme"

const SERIF = "Georgia"

export type BookPageChromeProps = {
  title: string
  unit?: number
  subtitle?: string
  /** Printed page number (single-page mode). */
  pageNum?: number
  pageLabel?: string
  pageIndex?: number
  pageCount?: number
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  canPrev?: boolean
  canNext?: boolean
  onRefresh?: () => void
  children: React.ReactNode
  loading?: boolean
  /**
   * Continuous scroll of all unit pages (PDF-viewer style).
   * Hides Prev/Next; children should be one or more `PageCard`s.
   */
  stacked?: boolean
}

function PageSkeleton({ stacked }: { stacked?: boolean }) {
  return (
    <View style={{ padding: 12, gap: stacked ? 16 : 12 }}>
      <SkeletonCard style={{ gap: 10, padding: 16 }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={14} width="40%" />
        <Skeleton height={60} />
        <Skeleton height={14} width="80%" />
        <Skeleton height={40} />
      </SkeletonCard>
      {stacked ? (
        <SkeletonCard style={{ gap: 10, padding: 16 }}>
          <Skeleton height={14} width="35%" />
          <Skeleton height={80} />
          <Skeleton height={14} width="70%" />
        </SkeletonCard>
      ) : (
        <SkeletonCard style={{ gap: 10 }}>
          <Skeleton height={14} width="35%" />
          <Skeleton height={80} />
        </SkeletonCard>
      )}
    </View>
  )
}

/** White sheet used in stacked (PDF-viewer) and single-page modes. */
export function PageCard({
  children,
  pageNum,
}: {
  children: React.ReactNode
  pageNum?: number
}) {
  return (
    <View style={styles.pageCard}>
      {children}
      {pageNum != null && pageNum > 0 ? (
        <Text style={styles.pageFooterNum}>{pageNum}</Text>
      ) : null}
    </View>
  )
}

export function BookPageChrome({
  title,
  unit,
  subtitle,
  pageNum = 0,
  pageLabel,
  pageIndex = 0,
  pageCount = 1,
  onClose,
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
  onRefresh,
  children,
  loading,
  stacked = false,
}: BookPageChromeProps) {
  const eyebrow = stacked
    ? unit != null
      ? `UNIT ${unit} · ${pageCount || 1} PAGES`
      : `${pageCount || 1} PAGES`
    : unit != null
      ? `UNIT ${unit} · P.${pageNum} · ${pageIndex + 1}/${pageCount || 1}`
      : `P.${pageNum} · ${pageIndex + 1}/${pageCount || 1}`

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.topBtn}>
          <Ionicons name="close" size={22} color={PURPLE.deep} />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.topEyebrow}>{eyebrow}</Text>
          <Text style={styles.topTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.topSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onRefresh ? (
          <Pressable onPress={onRefresh} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={PURPLE.note} />
          </Pressable>
        ) : (
          <View style={styles.iconBtnPlaceholder} />
        )}
      </View>

      {loading ? (
        <PageSkeleton stacked={stacked} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.scroll, stacked && styles.scrollStacked]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {stacked ? (
              children
            ) : (
              <PageCard pageNum={pageNum}>{children}</PageCard>
            )}
          </ScrollView>

          {!stacked && onPrev && onNext ? (
            <View style={styles.turner}>
              <Pressable
                onPress={onPrev}
                disabled={!canPrev}
                style={[styles.turnerBtn, !canPrev && styles.turnerDisabled]}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={canPrev ? PURPLE.deep : "#9CA3AF"}
                />
                <Text style={[styles.turnerBtnText, !canPrev && styles.turnerBtnTextDisabled]}>
                  Prev
                </Text>
              </Pressable>
              <View style={styles.turnerCenter}>
                <Text style={styles.turnerPage}>p. {pageNum}</Text>
                <Text style={styles.turnerLabel} numberOfLines={1}>
                  {pageLabel ?? title}
                </Text>
              </View>
              <Pressable
                onPress={onNext}
                disabled={!canNext}
                style={[styles.turnerBtn, !canNext && styles.turnerDisabled]}
              >
                <Text style={[styles.turnerBtnText, !canNext && styles.turnerBtnTextDisabled]}>
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={canNext ? PURPLE.deep : "#9CA3AF"}
                />
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  )
}

export function ExNum({ n }: { n: string }) {
  return (
    <View style={styles.exNum}>
      <Text style={styles.exNumText}>{n}</Text>
    </View>
  )
}

export function AudioPill({ track }: { track: string }) {
  return (
    <View style={styles.audioPill}>
      <Ionicons name="headset" size={12} color="#e74c3c" />
      <Text style={styles.audioPillText}>{track}</Text>
    </View>
  )
}

export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  )
}

/** Collapse messy JSON whitespace so instruction copy sits evenly. */
export function normalizeInstructionText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && Boolean(arr[i - 1]?.length)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Exercise header: number (+ optional audio) on its own row ABOVE the instruction text.
 * Never place ExNum beside wrapping description text — that makes copy look crooked.
 */
export function Instruction({
  children,
  exNum,
  audioTrack,
}: {
  children: React.ReactNode
  exNum?: string
  audioTrack?: string
}) {
  const text =
    typeof children === "string" ? normalizeInstructionText(children) : null
  const hasMeta = Boolean(exNum || audioTrack)

  return (
    <View style={styles.instructionBlock}>
      {hasMeta ? (
        <View style={styles.instructionMeta}>
          {exNum ? <ExNum n={exNum} /> : null}
          {audioTrack ? <AudioPill track={audioTrack} /> : null}
        </View>
      ) : null}
      {text ? (
        <Text style={styles.instruction}>{text}</Text>
      ) : children ? (
        <View style={styles.instructionBody}>{children}</View>
      ) : null}
    </View>
  )
}

export function WordBank({
  words,
  title,
  onPick,
  selected,
  placed,
}: {
  words: string[]
  title?: string
  onPick?: (word: string) => void
  selected?: string | null
  placed?: Set<string>
}) {
  if (!words.length) return null
  const interactive = Boolean(onPick)
  return (
    <View style={[styles.wordBank, interactive && styles.wordBankInteractive]}>
      {title ? (
        <Text style={[styles.wordBankTitle, interactive && styles.wordBankTitleInteractive]}>
          {title}
        </Text>
      ) : null}
      {interactive ? (
        <Text style={styles.wordBankHint}>Tap an option to select it</Text>
      ) : null}
      <View style={styles.wordBankRow}>
        {words.map((w) => {
          const isSelected = selected === w
          const isPlaced = placed?.has(w)
          const content = (
            <Text
              style={[
                styles.wordBankWord,
                interactive && styles.wordBankWordInteractive,
                isSelected && styles.wordBankWordSelected,
                isPlaced && styles.wordBankWordPlaced,
              ]}
            >
              {w}
            </Text>
          )
          if (onPick) {
            return (
              <Pressable
                key={w}
                onPress={() => onPick(w)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.wordBankChip,
                  styles.wordBankChipInteractive,
                  pressed && styles.wordBankChipPressed,
                  isSelected && styles.wordBankChipSelected,
                  isPlaced && styles.wordBankChipPlaced,
                ]}
              >
                {content}
              </Pressable>
            )
          }
          return (
            <View key={w} style={styles.wordBankChip}>
              {content}
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function SectionBanner({ title }: { title: string }) {
  return (
    <View style={styles.sectionBanner}>
      <Text style={styles.sectionBannerText}>{title}</Text>
    </View>
  )
}

export function UnitHeader({
  unitNumber,
  unit,
  title,
  subtitle,
}: {
  unitNumber?: number
  unit?: number
  title: string
  subtitle?: string
}) {
  const n = unitNumber ?? unit ?? 0
  return (
    <View style={styles.unitHeader}>
      <Text style={styles.unitHeaderTitle}>
        UNIT {n}
        {title ? `: ${title.toUpperCase()}` : ""}
      </Text>
      {subtitle ? <Text style={styles.unitHeaderSubtitle}>{subtitle}</Text> : null}
      <View style={styles.unitHeaderRule} />
    </View>
  )
}

export function TipBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.tipBox}>
      {title ? <Text style={styles.tipBoxTitle}>{title}</Text> : null}
      {typeof children === "string" ? (
        <Text style={styles.tipBoxBody}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
}

export function ChoiceChip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string
  selected?: boolean
  onPress?: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={[
        styles.choiceChip,
        selected && styles.choiceChipSelected,
        disabled && styles.choiceChipDisabled,
      ]}
    >
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  )
}

export function TextBlank({
  value,
  onChangeText,
  placeholder,
  selected,
  onSelect,
  number,
  multiline,
}: {
  value: string
  onChangeText?: (t: string) => void
  placeholder?: string
  selected?: boolean
  onSelect?: () => void
  number?: number
  multiline?: boolean
}) {
  const inner = onChangeText ? (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? (number != null ? `(${number})` : "…")}
      placeholderTextColor="#9CA3AF"
      multiline={multiline}
      style={[styles.textBlankInput, multiline && styles.textBlankInputMulti]}
      autoCapitalize="none"
      autoCorrect={false}
    />
  ) : (
    <Text style={[styles.textBlankFilled, !value && styles.textBlankPlaceholder]}>
      {value || placeholder || "…"}
    </Text>
  )

  if (onSelect) {
    return (
      <Pressable
        onPress={onSelect}
        style={[styles.textBlank, selected && styles.textBlankSelected]}
      >
        {number != null ? <Text style={styles.textBlankNum}>{number}</Text> : null}
        {inner}
      </Pressable>
    )
  }

  return (
    <View style={styles.textBlank}>
      {number != null ? <Text style={styles.textBlankNum}>{number}</Text> : null}
      {inner}
    </View>
  )
}

/**
 * Inline fill-blank that MUST nest inside a parent <Text> so surrounding
 * words keep wrapping as one sentence (View/Pressable siblings break the line).
 */
export function InlineBlankText({
  value,
  placeholder = "…………",
  selected,
  onSelect,
  dropdown,
}: {
  value?: string
  placeholder?: string
  selected?: boolean
  onSelect?: () => void
  /** Closed-choice blank — looks like a mini select control. */
  dropdown?: boolean
}) {
  const filled = Boolean(value?.trim())
  const label = filled
    ? String(value)
    : dropdown
      ? placeholder === "…………" || !placeholder
        ? "▾ select"
        : `▾ ${placeholder}`
      : placeholder
  return (
    <Text
      onPress={onSelect}
      style={[
        styles.inlineBlankNest,
        dropdown && styles.inlineBlankNestDropdown,
        selected && styles.inlineBlankNestSelected,
        filled && styles.inlineBlankNestFilled,
      ]}
    >
      {` ${label} `}
    </Text>
  )
}

/**
 * Bottom sheet of choices for closed-set fill blanks (tap blank → pick option).
 * Always use this when the exercise has a fixed option list (word bank / form-of / box).
 */
export function OptionsPickerSheet({
  visible,
  title = "Choose an option",
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean
  title?: string
  options: string[]
  selected?: string
  onSelect: (option: string) => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((opt) => {
              const on = selected?.trim().toLowerCase() === opt.trim().toLowerCase()
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onSelect(opt)
                    onClose()
                  }}
                  style={[styles.sheetOption, on && styles.sheetOptionSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.sheetOptionText, on && styles.sheetOptionTextSelected]}>
                    {opt}
                  </Text>
                  {on ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                </Pressable>
              )
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.sheetCancel}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

/** Split text into words/spaces so blanks can sit mid-sentence in a wrapping row. */
export function sentenceTokens(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0)
}

export function SentenceTokens({ text }: { text: string }) {
  return (
    <>
      {sentenceTokens(text).map((tok, i) => (
        <Text key={`tok-${i}-${tok.slice(0, 12)}`} style={styles.sentenceText}>
          {tok}
        </Text>
      ))}
    </>
  )
}

/**
 * Free-response blank — type in place (same pattern as IELTS reading on the platform).
 * Must sit in a flexWrap row with word-level Text tokens, not nested inside a parent Text.
 */
export function WritableInlineBlank({
  value,
  onChangeText,
  placeholder = "……",
  number,
}: {
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  number?: number
}) {
  return (
    <View style={styles.writableBlankWrap}>
      {number != null ? <Text style={styles.writableBlankNum}>{number}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={styles.writableBlankInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

/** Sentence with a single mid-phrase (or trailing) free-response blank. */
export function WritableSentenceRow({
  num,
  before,
  after,
  value,
  onChangeText,
  placeholder = "……",
}: {
  num?: number
  before: string
  after?: string
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
}) {
  return (
    <View style={[styles.sentenceRow, styles.sentenceRowWritable]}>
      {num != null ? <Text style={styles.sentNum}>{num} </Text> : null}
      <SentenceTokens text={before} />
      <WritableInlineBlank value={value} onChangeText={onChangeText} placeholder={placeholder} />
      {after ? <SentenceTokens text={after} /> : null}
    </View>
  )
}

/** @deprecated Prefer InlineBlankText nested in a parent Text. */
export function BlankSlot({
  selected,
  value,
  underlined,
  onSelect,
}: {
  selected?: boolean
  value?: string
  underlined: string
  onSelect?: () => void
}) {
  return (
    <InlineBlankText
      value={value}
      placeholder={underlined}
      selected={selected}
      onSelect={onSelect}
    />
  )
}

export function Section({
  children,
  style,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const items = React.Children.toArray(children)
  let instructionIndex = -1
  for (let i = 0; i < items.length; i++) {
    const child = items[i]
    if (React.isValidElement(child) && child.type === Instruction) {
      instructionIndex = i
      break
    }
  }

  // Instruction (exercise text) sits above the gray panel; body content goes inside.
  if (instructionIndex >= 0) {
    const header = items.slice(0, instructionIndex + 1)
    const body = items.slice(instructionIndex + 1)
    return (
      <View style={[styles.sectionOuter, style]}>
        {header}
        {body.length > 0 ? <View style={styles.exercisePanel}>{body}</View> : null}
      </View>
    )
  }

  return (
    <View style={[styles.sectionOuter, style]}>
      <View style={styles.exercisePanel}>{items}</View>
    </View>
  )
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PURPLE.pageBg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PURPLE.line,
    gap: 8,
  },
  topBtn: { padding: 4 },
  topCenter: { flex: 1 },
  topEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: PURPLE.mid,
  },
  topTitle: { fontSize: TEXTBOOK.type.exLabel, fontWeight: "700", color: PURPLE.deep },
  topSubtitle: { fontSize: 12, color: PURPLE.note, marginTop: 1 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PURPLE.soft,
  },
  iconBtnPlaceholder: { width: 34 },
  scroll: { padding: 10, paddingBottom: 20 },
  /** PDF-viewer gutter between stacked white sheets */
  scrollStacked: { gap: 12, paddingBottom: 32 },
  pageCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
    gap: 10,
  },
  pageHeader: { marginBottom: 2, gap: 1 },
  pageHeaderNum: {
    fontSize: 10,
    fontWeight: "800",
    color: PURPLE.mid,
    letterSpacing: 0.5,
  },
  pageHeaderLabel: {
    fontSize: TEXTBOOK.type.body,
    fontWeight: "700",
    color: "#1f2937",
    fontFamily: SERIF,
  },
  pageFooterNum: {
    marginTop: 6,
    fontSize: 11,
    color: "#7f8c8d",
    textAlign: "center",
  },
  turner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PURPLE.line,
    gap: 8,
  },
  turnerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PURPLE.soft,
  },
  turnerDisabled: { backgroundColor: "#F3F4F6" },
  turnerBtnText: { fontSize: 13, fontWeight: "700", color: PURPLE.deep },
  turnerBtnTextDisabled: { color: "#9CA3AF" },
  turnerCenter: { flex: 1, alignItems: "center" },
  turnerPage: { fontSize: 13, fontWeight: "800", color: "#1f2937" },
  turnerLabel: { fontSize: 11, color: PURPLE.note, marginTop: 1 },

  sectionOuter: {
    marginBottom: 30,
    gap: 10,
  },
  exercisePanel: {
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 8,
  },
  section: {
    marginBottom: 30,
    gap: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  exNum: {
    alignSelf: "flex-start",
    backgroundColor: "#d6eaf8",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  exNumText: {
    fontSize: TEXTBOOK.type.exLabel,
    fontWeight: "700",
    color: "#2980b9",
    letterSpacing: 0.2,
  },
  audioPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fdecea",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  audioPillText: { fontSize: 11, fontWeight: "600", color: "#e74c3c" },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#ecf0f1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7f8c8d",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  instructionBlock: {
    gap: 8,
    marginBottom: 4,
    width: "100%",
  },
  instructionMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  instructionRow: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 6,
    gap: 8,
  },
  instruction: {
    width: "100%",
    fontSize: TEXTBOOK.type.instruction,
    lineHeight: TEXTBOOK.type.instructionLh,
    color: "#1a1a1a",
    textAlign: "left",
  },
  instructionBody: {
    width: "100%",
  },
  sectionBanner: {
    backgroundColor: "transparent",
    paddingLeft: 10,
    paddingVertical: 2,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
    marginBottom: TEXTBOOK.space.sectionMb,
  },
  sectionBannerText: {
    fontSize: TEXTBOOK.type.section,
    fontWeight: "700",
    color: "#2c3e50",
    letterSpacing: 0.15,
  },
  unitHeader: {
    alignItems: "center",
    marginBottom: 14,
    gap: 4,
  },
  unitHeaderSquare: {
    width: 28,
    height: 28,
    backgroundColor: PURPLE.mid,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  unitHeaderSquareText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  unitHeaderText: { flex: 1 },
  unitHeaderTitle: {
    fontSize: TEXTBOOK.type.unitTitle,
    fontWeight: "300",
    color: "#2c3e50",
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  unitHeaderSubtitle: {
    fontSize: TEXTBOOK.type.unitSubtitle,
    fontWeight: "600",
    color: "#2980b9",
    textAlign: "center",
  },
  unitHeaderRule: {
    marginTop: 6,
    height: 2,
    width: "100%",
    backgroundColor: "#2c3e50",
  },
  tipBox: {
    borderLeftWidth: 3,
    borderLeftColor: "#f1c40f",
    backgroundColor: "#fef9e7",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 2,
  },
  tipBoxTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7d6608",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tipBoxBody: { fontSize: 12, lineHeight: 16, color: "#1a1a1a" },
  wordBank: {
    backgroundColor: "#e8f8f5",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 4,
  },
  wordBankInteractive: {
    backgroundColor: "#f0f7fb",
    borderWidth: 1.5,
    borderColor: "#3498db",
    borderStyle: "dashed",
  },
  wordBankTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0e6655",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  wordBankTitleInteractive: {
    color: "#1a5276",
    marginBottom: 2,
  },
  wordBankHint: {
    fontSize: 10,
    color: "#5d6d7e",
    marginBottom: 6,
  },
  wordBankRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  wordBankChip: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
  },
  wordBankChipInteractive: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#3498db",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  wordBankChipPressed: {
    backgroundColor: "#d6eaf8",
  },
  wordBankChipSelected: {
    backgroundColor: "#2980b9",
    borderColor: "#2980b9",
  },
  wordBankChipPlaced: { opacity: 0.45 },
  wordBankWord: {
    fontSize: TEXTBOOK.type.chip,
    fontStyle: "italic",
    color: "#1f2937",
    fontFamily: SERIF,
  },
  wordBankWordInteractive: {
    fontStyle: "normal",
    fontWeight: "600",
    color: "#1a5276",
    lineHeight: 16,
  },
  wordBankWordSelected: { color: "#fff", fontWeight: "700", fontStyle: "normal" },
  wordBankWordPlaced: { textDecorationLine: "line-through", color: "#6B7280" },
  choiceChip: {
    borderWidth: 1,
    borderColor: "#3498db",
    backgroundColor: "#fff",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  choiceChipSelected: {
    backgroundColor: "#2980b9",
    borderColor: "#2980b9",
  },
  choiceChipDisabled: { opacity: 0.6 },
  choiceChipText: {
    fontSize: 12,
    color: "#1a5276",
    fontWeight: "600",
    lineHeight: 16,
  },
  choiceChipTextSelected: { color: "#fff" },
  textBlank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: PURPLE.line,
    paddingVertical: 4,
    marginVertical: 2,
    minHeight: 28,
  },
  textBlankSelected: {
    backgroundColor: PURPLE.wash,
    borderBottomColor: PURPLE.mid,
    borderRadius: 3,
    paddingHorizontal: 6,
  },
  textBlankNum: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE.mid,
    minWidth: 18,
  },
  textBlankInput: {
    flex: 1,
    fontSize: TEXTBOOK.type.body,
    color: "#1f2937",
    fontFamily: SERIF,
    fontStyle: "italic",
    padding: 0,
    margin: 0,
  },
  textBlankInputMulti: {
    minHeight: 48,
    textAlignVertical: "top",
  },
  textBlankFilled: {
    flex: 1,
    fontSize: TEXTBOOK.type.body,
    fontStyle: "italic",
    fontWeight: "600",
    color: PURPLE.deep,
    fontFamily: SERIF,
  },
  textBlankPlaceholder: { color: "#9CA3AF", fontWeight: "400" },
  /** Nested inside parent Text — never use View/Pressable for mid-sentence blanks. */
  inlineBlankNest: {
    fontSize: TEXTBOOK.type.body,
    lineHeight: TEXTBOOK.type.bodyLh,
    fontFamily: SERIF,
    color: "#1a1a1a",
    textDecorationLine: "underline",
    textDecorationColor: "#3498db",
  },
  inlineBlankNestDropdown: {
    fontWeight: "700",
    color: "#2980b9",
    backgroundColor: "#eaf2f8",
    textDecorationLine: "none",
  },
  inlineBlankNestSelected: {
    backgroundColor: "#d6eaf8",
    color: "#1a5276",
  },
  inlineBlankNestFilled: {
    fontStyle: "italic",
    fontWeight: "700",
    color: "#2980b9",
    textDecorationLine: "underline",
    textDecorationColor: "#2980b9",
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 26, 26, 0.45)",
  },
  sheetCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: "70%",
    gap: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#dce1e6",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: TEXTBOOK.type.exLabel,
    fontWeight: "700",
    color: "#2c3e50",
    textAlign: "center",
  },
  sheetScroll: { flexGrow: 0 },
  sheetScrollContent: { gap: 6, paddingBottom: 4 },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#3498db",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetOptionSelected: {
    backgroundColor: "#2980b9",
    borderColor: "#2980b9",
  },
  sheetOptionText: {
    flex: 1,
    fontSize: TEXTBOOK.type.body,
    fontWeight: "600",
    color: "#1a5276",
    lineHeight: TEXTBOOK.type.bodyLh,
  },
  sheetOptionTextSelected: { color: "#fff" },
  sheetCancel: {
    alignItems: "center",
    paddingVertical: 10,
  },
  sheetCancelText: {
    fontSize: TEXTBOOK.type.body,
    fontWeight: "600",
    color: "#7f8c8d",
  },
  blankSlot: {
    borderBottomWidth: 2,
    borderStyle: "dotted",
    borderBottomColor: "#3498db",
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginHorizontal: 2,
    alignItems: "center",
  },
  blankSlotSelected: { backgroundColor: "#d6eaf8" },
  blankSlotFilled: {
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "700",
    color: "#2980b9",
  },
  blankSlotUnderline: {
    fontSize: 13,
    textDecorationLine: "underline",
    color: "#1a1a1a",
  },
  body: {
    fontSize: TEXTBOOK.type.body,
    lineHeight: TEXTBOOK.type.bodyLh,
    color: "#1a1a1a",
  },
  sentenceRow: {
    backgroundColor: "#fff",
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  /** Free-type blanks: word tokens + TextInput wrap like IELTS reading. */
  sentenceRowWritable: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 0,
    rowGap: 2,
  },
  writableBlankWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
    maxWidth: "100%",
  },
  writableBlankNum: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2980b9",
    marginRight: 4,
  },
  writableBlankInput: {
    minWidth: 80,
    maxWidth: 160,
    borderBottomWidth: 2,
    borderBottomColor: "#3498db",
    paddingHorizontal: 3,
    paddingVertical: 1,
    margin: 0,
    fontSize: TEXTBOOK.type.body,
    lineHeight: TEXTBOOK.type.bodyLh,
    fontFamily: SERIF,
    fontStyle: "italic",
    color: "#2980b9",
  },
  sentenceText: {
    fontSize: TEXTBOOK.type.body,
    lineHeight: TEXTBOOK.type.bodyLh,
    color: "#111827",
    fontFamily: SERIF,
  },
  sentNum: {
    fontWeight: "700",
    color: PURPLE.mid,
    fontSize: TEXTBOOK.type.body,
    lineHeight: TEXTBOOK.type.bodyLh,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 17,
    color: "#374151",
    fontFamily: SERIF,
  },
  muted: { fontSize: 11, color: "#6B7280" },
  hint: { fontSize: 11, color: PURPLE.note, fontWeight: "600" },
  passageBox: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    backgroundColor: PURPLE.wash,
    borderRadius: 3,
    padding: 10,
  },
  passageTitle: {
    fontSize: TEXTBOOK.type.section,
    fontWeight: "700",
    color: PURPLE.deep,
    textAlign: "center",
    marginBottom: 6,
    fontFamily: SERIF,
  },
  notesFrame: {
    borderWidth: 2,
    borderColor: PURPLE.mid,
    borderRadius: 3,
    padding: 10,
    backgroundColor: "#fff",
    gap: 4,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE.deep,
    fontFamily: SERIF,
  },
  checkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 6,
    marginTop: 4,
  },
  checkRow: {
    alignItems: "center",
    justifyContent: "center",
    width: "48.5%",
    minHeight: 36,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dce1e6",
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  checkRowOn: {
    borderColor: "#3498db",
    backgroundColor: "#d6eaf8",
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: "#3498db",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxOn: {
    backgroundColor: "#2980b9",
    borderColor: "#2980b9",
  },
  checkLabel: {
    fontSize: TEXTBOOK.type.body,
    fontWeight: "500",
    color: "#1a1a1a",
    textAlign: "center",
    textTransform: "capitalize",
  },
  checkLabelOn: {
    color: "#1a5276",
    fontWeight: "600",
  },
  table: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 8,
  },
  tableRow: { flexDirection: "row" },
  tableHeader: {
    flex: 1,
    backgroundColor: PURPLE.deep,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: PURPLE.line,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  tableCell: {
    flex: 1,
    minHeight: 72,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: PURPLE.line,
    borderRightWidth: 1,
    borderRightColor: PURPLE.line,
    backgroundColor: "#fff",
  },
  tableCellActive: {
    backgroundColor: "#d6eaf8",
    borderColor: "#3498db",
  },
  tableCellWords: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "flex-start" },
  tableWord: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#3498db",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    color: "#2980b9",
    maxWidth: "100%",
    flexShrink: 1,
    overflow: "hidden",
  },
  letterChip: {
    width: 32,
    height: 32,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: PURPLE.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  letterChipSelected: {
    backgroundColor: PURPLE.mid,
    borderColor: PURPLE.mid,
  },
  letterChipText: { fontSize: 13, fontWeight: "700", color: PURPLE.mid },
  letterChipTextSelected: { color: "#fff" },
  optionsList: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    backgroundColor: PURPLE.wash,
    borderRadius: 3,
    padding: 10,
    gap: 6,
  },
  optionRow: { flexDirection: "row", gap: 6 },
  optionLetter: { fontSize: 13, fontWeight: "700", color: PURPLE.mid, minWidth: 18 },
  optionText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: "#374151", fontFamily: SERIF },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  questionBlock: { marginTop: 10, gap: 6 },
  questionNum: { fontSize: 13, fontWeight: "700", color: PURPLE.mid },
  dock: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    borderStyle: "dashed",
    backgroundColor: PURPLE.wash,
    borderRadius: 3,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  dockHint: { fontSize: 12, fontWeight: "600", color: PURPLE.note },
  /** Passage with numbered gaps — one wrapping row (dropdown Text OR writable inputs). */
  inlineWrap: {
    backgroundColor: "#fff",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  inlineText: {
    fontSize: TEXTBOOK.type.body,
    lineHeight: TEXTBOOK.type.bodyLh,
    color: "#1f2937",
    fontFamily: SERIF,
  },
  inlineBlank: {
    fontSize: TEXTBOOK.type.body,
    lineHeight: TEXTBOOK.type.bodyLh,
    fontFamily: SERIF,
    fontWeight: "700",
    color: PURPLE.deep,
    textDecorationLine: "underline",
    textDecorationColor: PURPLE.mid,
    backgroundColor: PURPLE.soft,
  },
  inlineBlankSelected: {
    backgroundColor: PURPLE.mid,
    color: "#fff",
  },
  inlineBlankText: { fontSize: 12, fontWeight: "700", color: PURPLE.deep },
  inlineBlankTextFilled: { color: PURPLE.deep, fontStyle: "italic" },
  inlineBlankTextSelected: { color: "#fff" },
  legendBox: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    backgroundColor: "#FAF7FD",
    borderRadius: 3,
    padding: 12,
    marginTop: 8,
    alignItems: "center",
    gap: 4,
  },
  legendPlaceholder: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  card: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    borderRadius: 3,
    padding: 10,
    backgroundColor: PURPLE.wash,
    gap: 4,
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: PURPLE.deep },
  listItem: { flexDirection: "row", gap: 8, marginTop: 6 },
  listNum: { fontSize: 13, fontWeight: "700", color: PURPLE.mid, minWidth: 16 },
  vocabStrong: { fontWeight: "700", color: PURPLE.deep },
})

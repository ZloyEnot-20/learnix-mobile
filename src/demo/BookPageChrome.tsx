import React from "react"
import {
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
import { PURPLE } from "./theme"

const SERIF = "Georgia"

export type BookPageChromeProps = {
  title: string
  unit?: number
  subtitle?: string
  pageNum: number
  pageLabel?: string
  pageIndex: number
  pageCount: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  canNext: boolean
  onRefresh?: () => void
  children: React.ReactNode
  loading?: boolean
}

function PageSkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Skeleton height={28} width="60%" />
      <SkeletonCard style={{ gap: 10 }}>
        <Skeleton height={14} width="40%" />
        <Skeleton height={60} />
        <Skeleton height={14} width="80%" />
        <Skeleton height={40} />
      </SkeletonCard>
      <SkeletonCard style={{ gap: 10 }}>
        <Skeleton height={14} width="35%" />
        <Skeleton height={80} />
      </SkeletonCard>
    </View>
  )
}

export function BookPageChrome({
  title,
  unit,
  subtitle,
  pageNum,
  pageLabel,
  pageIndex,
  pageCount,
  onClose,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onRefresh,
  children,
  loading,
}: BookPageChromeProps) {
  const eyebrow =
    unit != null
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
        <PageSkeleton />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.pageCard}>
              {children}
              <Text style={styles.pageFooterNum}>{pageNum}</Text>
            </View>
          </ScrollView>

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
      <Ionicons name="headset" size={12} color="#fff" />
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
  return (
    <View style={styles.wordBank}>
      {title ? <Text style={styles.wordBankTitle}>{title}</Text> : null}
      <View style={styles.wordBankRow}>
        {words.map((w) => {
          const isSelected = selected === w
          const isPlaced = placed?.has(w)
          const content = (
            <Text
              style={[
                styles.wordBankWord,
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
                style={[
                  styles.wordBankChip,
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

export function Instruction({
  children,
  exNum,
  audioTrack,
}: {
  children: React.ReactNode
  exNum?: string
  audioTrack?: string
}) {
  return (
    <View style={styles.instructionRow}>
      {exNum ? <ExNum n={exNum} /> : null}
      {audioTrack ? <AudioPill track={audioTrack} /> : null}
      {typeof children === "string" ? (
        <Text style={styles.instruction}>{children}</Text>
      ) : (
        <View style={styles.instructionBody}>{children}</View>
      )}
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
  title,
  subtitle,
}: {
  unitNumber: number
  title: string
  subtitle?: string
}) {
  return (
    <View style={styles.unitHeader}>
      <View style={styles.unitHeaderSquare}>
        <Text style={styles.unitHeaderSquareText}>{unitNumber}</Text>
      </View>
      <View style={styles.unitHeaderText}>
        <Text style={styles.unitHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.unitHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
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
    <Pressable
      onPress={onSelect}
      style={[styles.blankSlot, selected && styles.blankSlotSelected]}
    >
      {value ? (
        <Text style={styles.blankSlotFilled}>{value}</Text>
      ) : (
        <Text style={styles.blankSlotUnderline}>{underlined}</Text>
      )}
    </Pressable>
  )
}

export function Section({
  children,
  style,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return <View style={[styles.section, style]}>{children}</View>
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
  topTitle: { fontSize: 15, fontWeight: "700", color: PURPLE.deep },
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
  scroll: { padding: 12, paddingBottom: 24 },
  pageCard: {
    backgroundColor: "#fff",
    borderRadius: 2,
    padding: 16,
    shadowColor: PURPLE.deep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
    gap: 14,
  },
  pageHeader: { marginBottom: 4, gap: 2 },
  pageHeaderNum: {
    fontSize: 12,
    fontWeight: "800",
    color: PURPLE.mid,
    letterSpacing: 0.5,
  },
  pageHeaderLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    fontFamily: SERIF,
  },
  pageFooterNum: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
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

  section: { marginBottom: 12, gap: 8 },
  exNum: {
    alignSelf: "flex-start",
    backgroundColor: PURPLE.mid,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
    marginRight: 6,
  },
  exNumText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  audioPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PURPLE.mid,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 6,
  },
  audioPillText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: PURPLE.wash,
    borderWidth: 1,
    borderColor: PURPLE.line,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: PURPLE.note },
  instructionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 6,
  },
  instruction: {
    flex: 1,
    minWidth: "60%",
    fontSize: 14.5,
    lineHeight: 22,
    color: "#1f2937",
    fontFamily: SERIF,
  },
  instructionBody: { flex: 1, minWidth: "60%" },
  sectionBanner: {
    backgroundColor: PURPLE.deep,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    marginBottom: 8,
  },
  sectionBannerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  unitHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: PURPLE.deep,
    padding: 12,
    borderRadius: 2,
    marginBottom: 12,
  },
  unitHeaderSquare: {
    width: 36,
    height: 36,
    backgroundColor: PURPLE.mid,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  unitHeaderSquareText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  unitHeaderText: { flex: 1 },
  unitHeaderTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  unitHeaderSubtitle: { fontSize: 13, color: PURPLE.soft, marginTop: 2 },
  tipBox: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    borderStyle: "dashed",
    backgroundColor: PURPLE.wash,
    borderRadius: 3,
    padding: 10,
    gap: 4,
  },
  tipBoxTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE.note,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tipBoxBody: { fontSize: 12.5, lineHeight: 18, color: "#374151", fontFamily: SERIF },
  wordBank: {
    backgroundColor: PURPLE.soft,
    borderWidth: 1,
    borderColor: PURPLE.line,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 6,
  },
  wordBankTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: PURPLE.note,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  wordBankRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wordBankChip: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  wordBankChipSelected: {
    backgroundColor: PURPLE.mid,
    borderRadius: 4,
  },
  wordBankChipPlaced: { opacity: 0.45 },
  wordBankWord: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#1f2937",
    fontFamily: SERIF,
  },
  wordBankWordSelected: { color: "#fff", fontWeight: "600" },
  wordBankWordPlaced: { textDecorationLine: "line-through", color: "#6B7280" },
  choiceChip: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  choiceChipSelected: {
    backgroundColor: PURPLE.mid,
    borderColor: PURPLE.mid,
  },
  choiceChipDisabled: { opacity: 0.6 },
  choiceChipText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  choiceChipTextSelected: { color: "#fff" },
  textBlank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: PURPLE.line,
    paddingVertical: 6,
    marginVertical: 4,
    minHeight: 36,
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
    fontSize: 14,
    color: "#1f2937",
    fontFamily: SERIF,
    fontStyle: "italic",
    padding: 0,
    margin: 0,
  },
  textBlankInputMulti: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  textBlankFilled: {
    flex: 1,
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "600",
    color: PURPLE.deep,
    fontFamily: SERIF,
  },
  textBlankPlaceholder: { color: "#9CA3AF", fontWeight: "400" },
  blankSlot: {
    borderBottomWidth: 2,
    borderBottomColor: PURPLE.mid,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginHorizontal: 2,
    minWidth: 80,
    alignItems: "center",
  },
  blankSlotSelected: { backgroundColor: PURPLE.soft },
  blankSlotFilled: {
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "700",
    color: PURPLE.deep,
    fontFamily: SERIF,
  },
  blankSlotUnderline: {
    fontSize: 13,
    textDecorationLine: "underline",
    color: "#1f2937",
    fontFamily: SERIF,
  },
  body: {
    fontSize: 14.5,
    lineHeight: 22,
    color: "#1f2937",
    fontFamily: SERIF,
  },
  sentenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
  },
  sentenceText: {
    fontSize: 14.5,
    lineHeight: 24,
    color: "#111827",
    fontFamily: SERIF,
  },
  sentNum: {
    fontWeight: "700",
    color: PURPLE.mid,
    fontSize: 14.5,
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 20,
    color: "#374151",
    fontFamily: SERIF,
  },
  muted: { fontSize: 12, color: "#6B7280" },
  hint: { fontSize: 12, color: PURPLE.note, fontWeight: "600" },
  passageBox: {
    borderWidth: 1,
    borderColor: PURPLE.line,
    backgroundColor: PURPLE.wash,
    borderRadius: 3,
    padding: 12,
  },
  passageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PURPLE.deep,
    textAlign: "center",
    marginBottom: 10,
    fontFamily: SERIF,
  },
  notesFrame: {
    borderWidth: 2,
    borderColor: PURPLE.mid,
    borderRadius: 3,
    padding: 12,
    backgroundColor: "#fff",
    gap: 6,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PURPLE.deep,
    fontFamily: SERIF,
  },
  checkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "46%",
    minWidth: 140,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: PURPLE.mid,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxOn: { backgroundColor: PURPLE.mid },
  checkLabel: { fontSize: 14, color: "#1f2937", fontFamily: SERIF },
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
  tableCellActive: { backgroundColor: PURPLE.wash },
  tableCellWords: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tableWord: {
    fontSize: 12,
    backgroundColor: PURPLE.soft,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    color: PURPLE.deep,
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
  inlineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  inlineText: {
    fontSize: 14.5,
    lineHeight: 24,
    color: "#1f2937",
    fontFamily: SERIF,
  },
  inlineBlank: {
    borderWidth: 1,
    borderColor: PURPLE.mid,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: "center",
    backgroundColor: PURPLE.soft,
  },
  inlineBlankSelected: { backgroundColor: PURPLE.mid },
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

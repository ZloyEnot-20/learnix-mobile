import React from "react"
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight"
import { HomeworkSessionContext } from "./HomeworkSessionShell"
import { colors, radius, spacing } from "../../theme/tokens"

function useHomeworkShell() {
  const { confirmPause, pauseAvailable } = React.useContext(HomeworkSessionContext)

  const showProtectedInfo = React.useCallback(() => {
    const buttons: { text: string; style?: "cancel" | "default"; onPress?: () => void }[] = [
      { text: "OK", style: "cancel" },
    ]
    if (pauseAvailable) {
      buttons.unshift({ text: "Pause homework", onPress: confirmPause })
    }
    Alert.alert(
      "Protected homework",
      "This is a protected assignment. Complete all questions before submitting.\n\nYou can pause only once — the timer stops and you can continue later from the homework list.\n\nAfter you resume, leaving the app will fail this homework.",
      buttons,
    )
  }, [confirmPause, pauseAvailable])

  return { confirmPause, pauseAvailable, showProtectedInfo }
}

function HomeworkTopBar({ progress }: { progress: number }) {
  const { confirmPause, pauseAvailable, showProtectedInfo } = useHomeworkShell()

  return (
    <View style={[styles.topBar, { paddingTop: spacing.sm }]}>
      <Pressable
        onPress={showProtectedInfo}
        hitSlop={12}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Protected homework info"
      >
        <Ionicons name="lock-closed-outline" size={22} color={colors.textMuted} />
      </Pressable>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <Pressable
        onPress={pauseAvailable ? confirmPause : undefined}
        disabled={!pauseAvailable}
        hitSlop={12}
        style={({ pressed }) => [
          styles.iconBtn,
          !pauseAvailable && styles.iconBtnDisabled,
          pressed && pauseAvailable && styles.iconBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Pause homework"
      >
        <Ionicons
          name="pause"
          size={22}
          color={pauseAvailable ? colors.textMuted : "#D1D5DB"}
        />
      </Pressable>
    </View>
  )
}

export function HomeworkFooterButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[footerBtnStyles.btn, disabled && footerBtnStyles.btnDisabled]}
    >
      <Text style={footerBtnStyles.text}>{label}</Text>
    </Pressable>
  )
}

export function HomeworkResultsLayout({
  footer,
  children,
}: {
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          resultsLayoutStyles.scrollContent,
          { paddingTop: Math.max(insets.top, spacing.sm) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {footer}
      </View>
    </View>
  )
}

export function HomeworkMistakeCard({
  prompt,
  userAnswer,
  correctAnswer,
  explanation,
}: {
  prompt: string
  userAnswer: string
  correctAnswer: string
  explanation?: string
}) {
  return (
    <View style={mistakeCardStyles.wrap}>
      <View style={mistakeCardStyles.header}>
        <Text style={mistakeCardStyles.prompt}>{prompt}</Text>
      </View>
      <View style={mistakeCardStyles.body}>
        <Text style={mistakeCardStyles.wrong}>Your answer: {userAnswer}</Text>
        <Text style={mistakeCardStyles.right}>Correct: {correctAnswer}</Text>
        {explanation ? <Text style={mistakeCardStyles.expl}>{explanation}</Text> : null}
      </View>
    </View>
  )
}

interface HomeworkExerciseLayoutProps {
  index: number
  total: number
  instruction: string
  footer: React.ReactNode
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function HomeworkExerciseLayout({
  index,
  total,
  instruction,
  footer,
  children,
  style,
}: HomeworkExerciseLayoutProps) {
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()
  const progress = total > 0 ? Math.min(100, Math.round((index / total) * 100)) : 0
  const footerPaddingBottom =
    keyboardHeight > 0 ? keyboardHeight + spacing.sm : Math.max(insets.bottom, spacing.md)

  return (
    <View style={[styles.root, style]}>
      <HomeworkTopBar progress={progress} />

      <Pressable onPress={Keyboard.dismiss} style={styles.instructionRow}>
        <View style={styles.instructionIcon}>
          <Text style={styles.instructionMark}>?</Text>
        </View>
        <Text style={styles.instructionText}>{instruction}</Text>
      </Pressable>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <Pressable onPress={Keyboard.dismiss}>{children}</Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        {footer}
      </View>
    </View>
  )
}

export function HomeworkSourceCard({
  source,
  children,
}: {
  source: string
  children?: React.ReactNode
}) {
  return (
    <View style={cardStyles.wrap}>
      <View style={cardStyles.header}>
        <Text style={cardStyles.source}>{source}</Text>
      </View>
      {children != null ? <View style={cardStyles.body}>{children}</View> : null}
    </View>
  )
}

export function HomeworkWordChip({
  label,
  onPress,
  disabled,
  empty,
}: {
  label?: string
  onPress?: () => void
  disabled?: boolean
  empty?: boolean
}) {
  if (empty) {
    return <View style={chipStyles.empty} />
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        chipStyles.chip,
        pressed && onPress && chipStyles.chipPressed,
      ]}
    >
      <Text style={chipStyles.label}>{label}</Text>
    </Pressable>
  )
}

export function homeworkInstructionForType(type: string): string {
  switch (type) {
    case "word-order":
      return "Arrange the translation of the sentence."
    case "fill-in-the-blank":
      return "Fill in the missing words."
    case "multiple-choice":
      return "Choose the correct answer."
    case "true-false":
      return "Decide if the statement is true or false."
    case "matching":
      return "Match the pairs correctly."
    case "error-correction":
      return "Find and fix the errors."
    case "word-formation":
      return "Form the correct word."
    case "sentence-transformation":
      return "Rewrite the sentence."
    default:
      return "Complete the task."
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: { opacity: 0.6 },
  iconBtnDisabled: { opacity: 0.4 },
  progressTrack: {
    flex: 1,
    height: 14,
    backgroundColor: "#E8E8E8",
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFC800",
    borderRadius: radius.pill,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
  },
  instructionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D6EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionMark: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brand,
  },
  instructionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 24,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  bodyContent: {
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
  },
})

const cardStyles = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderColor: "#B8E4FF",
    borderRadius: radius.card,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  header: {
    backgroundColor: "#E8F6FF",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 72,
    justifyContent: "center",
  },
  source: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 28,
  },
  body: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 88,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "flex-start",
    alignContent: "flex-start",
  },
})

const footerBtnStyles = StyleSheet.create({
  btn: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.45 },
  text: { color: "#fff", fontSize: 17, fontWeight: "700" },
})

const resultsLayoutStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
})

const mistakeCardStyles = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderColor: "#B8E4FF",
    borderRadius: radius.card,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  header: {
    backgroundColor: "#E8F6FF",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  prompt: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 24,
  },
  body: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  wrong: { fontSize: 14, color: colors.error, fontWeight: "500" },
  right: { fontSize: 14, color: colors.success, fontWeight: "500", marginTop: 4 },
  expl: { fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
})

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipPressed: { opacity: 0.75, backgroundColor: "#F5F5F5" },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  empty: {
    width: 72,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: "#EFEFEF",
  },
})

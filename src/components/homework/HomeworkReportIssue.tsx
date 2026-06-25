import React, { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { issueReportsApi } from "../../lib/api"
import type { IssueReportPayload } from "../../types/issue-report"
import { colors, radius, spacing } from "../../theme/tokens"

const MESSAGE_MAX = 50

export function HomeworkReportIssueButton({
  report,
}: {
  report: IssueReportPayload
}) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = useCallback(() => {
    setError(null)
    setSent(false)
    setMessage("")
    setVisible(true)
  }, [])

  const close = useCallback(() => {
    if (submitting) return
    Keyboard.dismiss()
    setVisible(false)
  }, [submitting])

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss()
  }, [])

  const submit = useCallback(async () => {
    Keyboard.dismiss()
    setSubmitting(true)
    setError(null)
    try {
      const trimmed = message.trim()
      await issueReportsApi.create({
        ...report,
        ...(trimmed ? { message: trimmed } : {}),
      })
      setSent(true)
    } catch {
      setError("Could not send the report. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }, [message, report])

  const questionLabel =
    report.questionIndex != null ? `Question ${report.questionIndex + 1}` : null

  return (
    <>
      <Pressable
        onPress={open}
        hitSlop={12}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Report an issue"
      >
        <Ionicons name="flag-outline" size={22} color={colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <Pressable style={styles.backdrop} onPress={close}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <Pressable style={styles.dialog} onPress={dismissKeyboard}>
                <View style={styles.dialogIcon}>
                  <Ionicons
                    name={sent ? "checkmark-circle" : "flag"}
                    size={28}
                    color={sent ? colors.success : colors.brand}
                  />
                </View>

                {sent ? (
                  <View style={styles.successBlock}>
                    <Text style={styles.title}>Report sent</Text>
                    <Text style={styles.body}>
                      Thanks! We will review this and fix the exercise if needed.
                    </Text>
                    <Pressable onPress={close} style={styles.doneBtn}>
                      <Text style={styles.primaryBtnText}>Done</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Text style={styles.title}>Report an issue?</Text>
                    <Text style={styles.body}>
                      Flag incorrect answers, broken audio, typos, or other problems. We will review
                      your report.
                    </Text>

                    <View style={styles.metaBox}>
                      <Text style={styles.metaTitle} numberOfLines={2}>
                        {report.exerciseTitle}
                      </Text>
                      {questionLabel ? (
                        <Text style={styles.metaLine}>{questionLabel}</Text>
                      ) : null}
                      {report.questionPrompt ? (
                        <Text style={styles.metaPrompt} numberOfLines={3}>
                          {report.questionPrompt}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.messageWrap}>
                      <Text style={styles.messageLabel}>Your message (optional)</Text>
                      <TextInput
                        style={styles.messageInput}
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Describe the problem briefly…"
                        placeholderTextColor={colors.textMuted}
                        maxLength={MESSAGE_MAX}
                        multiline
                        autoCorrect
                        autoCapitalize="sentences"
                        returnKeyType="done"
                        blurOnSubmit
                        underlineColorAndroid="transparent"
                      />
                      <Text style={styles.messageCounter}>
                        {message.length}/{MESSAGE_MAX}
                      </Text>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.actions}>
                      <Pressable
                        onPress={close}
                        disabled={submitting}
                        style={[styles.secondaryBtn, submitting && styles.btnDisabled]}
                      >
                        <Text style={styles.secondaryBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={submit}
                        disabled={submitting}
                        style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                      >
                        {submitting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Send</Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: { opacity: 0.6 },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  dialog: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  dialogIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8F6FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  successBlock: {
    gap: spacing.md,
    alignItems: "stretch",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
  },
  metaBox: {
    backgroundColor: "#F8F9FB",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4,
  },
  metaTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  metaLine: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  metaPrompt: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginTop: 4,
  },
  messageWrap: {
    gap: spacing.xs,
  },
  messageLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  messageInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    maxHeight: 96,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  messageCounter: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  doneBtn: {
    alignSelf: "stretch",
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  btnDisabled: { opacity: 0.55 },
})

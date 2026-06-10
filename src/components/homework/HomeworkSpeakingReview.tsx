import React, { useCallback, useMemo } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio"
import { Ionicons } from "@expo/vector-icons"
import type { GrammarExercise } from "../../types/grammar"
import type { HomeworkAttempt, Subject } from "../../types/domain"
import { formatShortDate } from "../../lib/utils"
import { HomeworkReviewShell } from "./HomeworkReviewShell"
import { colors, radius, spacing } from "../../theme/tokens"

function isAudioUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function SpeakingRecordingCard({
  questionId,
  prompt,
  audioUrl,
  feedback,
}: {
  questionId: number
  prompt: string
  audioUrl: string
  feedback?: string
}) {
  const player = useAudioPlayer(null)
  const status = useAudioPlayerStatus(player)

  const togglePlay = useCallback(async () => {
    if (status.playing) {
      player.pause()
      return
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    player.replace({ uri: audioUrl })
    player.play()
  }, [audioUrl, player, status.playing])

  return (
    <View style={styles.card}>
      <Text style={styles.prompt}>
        <Text style={styles.qNum}>Q{questionId}. </Text>
        {prompt}
      </Text>
      <Pressable onPress={togglePlay} style={styles.playBtn}>
        <Ionicons
          name={status.playing ? "pause-circle" : "play-circle"}
          size={28}
          color={colors.primary}
        />
        <Text style={styles.playText}>
          {status.playing ? "Playing…" : "Listen to your recording"}
        </Text>
      </Pressable>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </View>
  )
}

interface HomeworkSpeakingReviewProps {
  exercise: GrammarExercise
  attempt: HomeworkAttempt
  title: string
  subject?: Subject
  completedAt?: string
  teacherFeedback?: string
  teacherScore?: number
}

export function HomeworkSpeakingReview({
  exercise,
  attempt,
  title,
  subject = "speaking",
  completedAt,
  teacherFeedback,
  teacherScore,
}: HomeworkSpeakingReviewProps) {
  const recordings = useMemo(
    () =>
      attempt.mistakes
        .filter((m) => isAudioUrl(m.userAnswer))
        .map((m) => ({
          questionId: m.questionId,
          prompt: m.prompt,
          audioUrl: m.userAnswer,
          feedback: m.explanation,
        })),
    [attempt.mistakes],
  )

  const completedLabel = completedAt ? formatShortDate(completedAt) : null

  return (
    <HomeworkReviewShell title={title} subject={subject}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Your speaking recordings</Text>
        {completedLabel ? (
          <Text style={styles.meta}>Submitted {completedLabel}</Text>
        ) : null}
        <Text style={styles.meta}>
          {teacherScore != null
            ? `Score: ${teacherScore.toFixed(1)}`
            : `${recordings.length}/${attempt.totalQuestions} submitted`}
        </Text>
        {teacherFeedback ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackLabel}>Teacher feedback</Text>
            <Text style={styles.feedbackBody}>{teacherFeedback}</Text>
          </View>
        ) : null}

        {recordings.length === 0 ? (
          <Text style={styles.empty}>No recordings found for this attempt.</Text>
        ) : (
          recordings.map((r) => (
            <SpeakingRecordingCard
              key={r.questionId}
              questionId={r.questionId}
              prompt={r.prompt}
              audioUrl={r.audioUrl}
              feedback={r.feedback}
            />
          ))
        )}
      </ScrollView>
    </HomeworkReviewShell>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  feedbackBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  feedbackBody: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  empty: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prompt: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  qNum: {
    fontWeight: "700",
    color: colors.primary,
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  playText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
  feedback: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
})

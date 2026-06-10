import React, { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Audio } from "expo-av"
import { Ionicons } from "@expo/vector-icons"
import type { GrammarExercise } from "../../types/grammar"
import type { HomeworkAttempt, Subject } from "../../types/domain"
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
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    return () => {
      void sound?.unloadAsync().catch(() => {})
    }
  }, [sound])

  const togglePlay = useCallback(async () => {
    if (playing && sound) {
      await sound.stopAsync().catch(() => {})
      setPlaying(false)
      return
    }
    if (sound) {
      await sound.replayAsync()
      setPlaying(true)
      return
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
    const { sound: s } = await Audio.Sound.createAsync({ uri: audioUrl })
    s.setOnPlaybackStatusUpdate((st) => {
      if (st.isLoaded && st.didJustFinish) setPlaying(false)
    })
    setSound(s)
    setPlaying(true)
    await s.playAsync()
  }, [audioUrl, playing, sound])

  return (
    <View style={styles.card}>
      <Text style={styles.prompt}>
        <Text style={styles.qNum}>Q{questionId}. </Text>
        {prompt}
      </Text>
      <Pressable onPress={togglePlay} style={styles.playBtn}>
        <Ionicons
          name={playing ? "pause-circle" : "play-circle"}
          size={28}
          color={colors.primary}
        />
        <Text style={styles.playText}>{playing ? "Playing…" : "Listen to your recording"}</Text>
      </Pressable>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </View>
  )
}

export function HomeworkSpeakingReview({
  exercise,
  attempt,
  title,
  subject,
  completedAt,
  teacherFeedback,
  teacherScore,
}: {
  exercise: GrammarExercise
  attempt: HomeworkAttempt
  title: string
  subject: Subject
  completedAt?: string
  teacherFeedback?: string
  teacherScore?: number
}) {
  const recordings = (attempt.mistakes ?? []).filter((m) => isAudioUrl(m.userAnswer))

  return (
    <HomeworkReviewShell title={title} subject={subject}>
      <Text style={styles.heading}>Your speaking recordings</Text>
      {completedAt ? (
        <Text style={styles.meta}>
          Submitted {new Date(completedAt).toLocaleString()}
        </Text>
      ) : null}
      <Text style={styles.meta}>
        {teacherScore != null
          ? `Score: ${teacherScore.toFixed(1)}`
          : `${recordings.length}/${attempt.totalQuestions} recordings submitted`}
      </Text>
      {teacherFeedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackTitle}>Teacher feedback</Text>
          <Text style={styles.feedbackBody}>{teacherFeedback}</Text>
        </View>
      ) : (
        <Text style={styles.pending}>Awaiting teacher review and score.</Text>
      )}
      {recordings.map((m) => (
        <SpeakingRecordingCard
          key={m.questionId}
          questionId={m.questionId}
          prompt={m.prompt}
          audioUrl={m.userAnswer}
          feedback={m.explanation}
        />
      ))}
      {recordings.length === 0 ? (
        <Text style={styles.empty}>No recordings found in this submission.</Text>
      ) : null}
    </HomeworkReviewShell>
  )
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.screen,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.screen,
  },
  pending: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.screen,
  },
  feedbackBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.screen,
  },
  feedbackTitle: { fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: 4 },
  feedbackBody: { fontSize: 14, color: colors.text, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.screen,
  },
  prompt: { fontSize: 15, lineHeight: 22, color: colors.text, marginBottom: spacing.sm },
  qNum: { fontWeight: "700" },
  playBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  playText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  feedback: { marginTop: 8, fontSize: 13, color: colors.textSecondary, fontStyle: "italic" },
  empty: { fontSize: 14, color: colors.textMuted, paddingHorizontal: spacing.screen },
})

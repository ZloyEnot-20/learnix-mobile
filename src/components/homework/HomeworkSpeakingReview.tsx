import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio"
import { Ionicons } from "@expo/vector-icons"
import type { GrammarExercise } from "../../types/grammar"
import type { HomeworkAttempt, Subject } from "../../types/domain"
import { formatShortDate } from "../../lib/utils"
import { prefetchSpeakingAudio, resolveSpeakingAudioUri } from "../../lib/speaking-audio-cache"
import { PlaybackWaveformBars } from "../speaking/WaveformBars"
import { SpeakingProgressBar } from "../speaking/SpeakingProgressBar"
import { HomeworkReviewShell } from "./HomeworkReviewShell"
import { colors, radius, spacing } from "../../theme/tokens"

const PLAYBACK_UPDATE_INTERVAL_MS = 50

function isAudioUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function bandColor(score: number): string {
  if (score >= 7) return colors.success
  if (score >= 5.5) return colors.primary
  if (score >= 4) return "#d97706"
  return colors.error
}

function SpeakingRecordingCard({
  index,
  prompt,
  audioUrl,
  transcription,
  teacherScore,
  teacherFeedback,
}: {
  index: number
  prompt: string
  audioUrl: string
  transcription?: string
  teacherScore?: number
  teacherFeedback?: string
}) {
  const player = useAudioPlayer(null, { updateInterval: PLAYBACK_UPDATE_INTERVAL_MS })
  const status = useAudioPlayerStatus(player)
  const [ready, setReady] = useState(false)

  const duration = status.duration ?? 0
  const currentTime = status.currentTime ?? 0
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0

  useEffect(() => {
    let cancelled = false
    setReady(false)

    void (async () => {
      try {
        const uri = await resolveSpeakingAudioUri(audioUrl)
        if (cancelled) return
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
        if (cancelled) return
        player.replace({ uri })
      } catch {
        if (!cancelled) setReady(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [audioUrl, player])

  useEffect(() => {
    if (duration > 0) setReady(true)
  }, [duration])

  useEffect(() => {
    if (!status.playing && status.currentTime > 0 && status.currentTime >= (status.duration ?? 0)) {
      player.seekTo(0)
    }
  }, [status.playing, status.currentTime, status.duration, player])

  const togglePlay = useCallback(async () => {
    if (!ready) return
    if (status.playing) {
      player.pause()
      return
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    player.play()
  }, [player, ready, status.playing])

  const seek = useCallback(
    (ratio: number) => {
      if (!duration) return
      player.seekTo(Math.max(0, Math.min(duration, ratio * duration)))
    },
    [duration, player],
  )

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <Text style={styles.prompt} numberOfLines={3}>
          {prompt}
        </Text>
        {teacherScore != null ? (
          <View style={[styles.scoreBadge, { backgroundColor: `${bandColor(teacherScore)}18` }]}>
            <Ionicons name="ribbon-outline" size={12} color={bandColor(teacherScore)} />
            <Text style={[styles.scoreText, { color: bandColor(teacherScore) }]}>
              {teacherScore.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.player}>
        <Pressable
          onPress={togglePlay}
          disabled={!ready}
          style={[styles.playCircle, !ready && styles.playCircleDisabled]}
          accessibilityRole="button"
        >
          {!ready ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name={status.playing ? "pause" : "play"}
              size={22}
              color="#fff"
              style={!status.playing ? { marginLeft: 2 } : undefined}
            />
          )}
        </Pressable>

        <View style={styles.playerBody}>
          <View style={styles.playerTopRow}>
            <PlaybackWaveformBars active={status.playing} variant="compact" />
            <Text style={styles.durationText}>
              {ready && duration > 0
                ? status.playing
                  ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                  : formatTime(duration)
                : "—"}
            </Text>
          </View>

          <SpeakingProgressBar progress={progress} playing={status.playing} onSeek={seek} />
        </View>
      </View>

      {transcription?.trim() ? (
        <View style={styles.transcriptionBox}>
          <Text style={styles.transcriptionLabel}>Transcription</Text>
          <Text style={styles.transcriptionBody}>{transcription}</Text>
          <Text style={styles.transcriptionHint}>
            Auto-generated text may be inaccurate — always listen to the recording.
          </Text>
        </View>
      ) : (
        <View style={styles.transcriptionBox}>
          <Text style={styles.transcriptionPending}>
            Transcription pending or unavailable.
          </Text>
        </View>
      )}

      {teacherFeedback ? (
        <View style={styles.teacherFeedbackBox}>
          <Text style={styles.teacherFeedbackLabel}>Teacher feedback</Text>
          <Text style={styles.teacherFeedbackBody}>{teacherFeedback}</Text>
        </View>
      ) : null}
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
          transcription: m.transcription,
          teacherScore: m.score,
          teacherFeedback: m.feedback,
        })),
    [attempt.mistakes],
  )

  useEffect(() => {
    void prefetchSpeakingAudio(recordings.map((r) => r.audioUrl))
  }, [recordings])

  const completedLabel = completedAt ? formatShortDate(completedAt) : null
  const gradedCount = recordings.filter((r) => r.teacherScore != null || r.teacherFeedback).length
  const summaryParts = [
    `${recordings.length}/${attempt.totalQuestions}`,
    completedLabel,
    gradedCount > 0 ? `${gradedCount} graded` : null,
  ].filter(Boolean)

  return (
    <HomeworkReviewShell title={title} subject={subject}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          {teacherScore != null ? (
            <View style={[styles.overallScoreChip, { backgroundColor: `${bandColor(teacherScore)}18` }]}>
              <Text style={[styles.overallScoreText, { color: bandColor(teacherScore) }]}>
                {teacherScore.toFixed(1)}
              </Text>
            </View>
          ) : null}
          <Text style={styles.summaryText}>{summaryParts.join(" · ")}</Text>
        </View>

        {teacherFeedback ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackBody} numberOfLines={4}>
              {teacherFeedback}
            </Text>
          </View>
        ) : null}

        {recordings.length === 0 ? (
          <Text style={styles.empty}>No recordings found for this attempt.</Text>
        ) : (
          recordings.map((r, index) => (
            <SpeakingRecordingCard
              key={r.questionId}
              index={index}
              prompt={r.prompt}
              audioUrl={r.audioUrl}
              transcription={r.transcription}
              teacherScore={r.teacherScore}
              teacherFeedback={r.teacherFeedback}
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
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  overallScoreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  overallScoreText: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  feedbackBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  feedbackBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  empty: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#f8fbff",
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  prompt: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "700",
  },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: "#f4f9ff",
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  playCircleDisabled: {
    opacity: 0.55,
  },
  playerBody: { flex: 1 },
  playerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  durationText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  transcriptionBox: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  transcriptionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  transcriptionBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  transcriptionHint: {
    fontSize: 11,
    color: colors.warning,
    marginTop: 8,
    lineHeight: 16,
  },
  transcriptionPending: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  teacherFeedbackBox: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  teacherFeedbackLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  teacherFeedbackBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
})

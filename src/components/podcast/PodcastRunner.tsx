import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { podcastWordLabel, type PodcastEpisode, type PodcastWord } from "../../types/podcast"
import type {
  PodcastListenedSegment,
  PodcastListeningSeek,
  PodcastListeningStats,
} from "../../types/domain"
import { homeworkApi } from "../../lib/api"
import {
  HomeworkExerciseLayout,
  HomeworkFooterButton,
  HomeworkResultsLayout,
} from "../homework/HomeworkExerciseLayout"
import { SpeakingProgressBar } from "../speaking/SpeakingProgressBar"
import { usePodcastAudioDownload } from "../../hooks/usePodcastAudioDownload"
import { isSecondsBuffered } from "../../lib/podcast-audio-cache"
import { colors, radius, shadow, spacing } from "../../theme/tokens"

const PLAYBACK_UPDATE_INTERVAL_MS = 250
const SEEK_THRESHOLD_SECONDS = 1.5
const MAX_SEEK_EVENTS = 50
const END_TOLERANCE_SECONDS = 1.5

type Phase = "listening" | "words" | "done"

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function mergeListenedSegments(segments: PodcastListenedSegment[]): PodcastListenedSegment[] {
  if (segments.length === 0) return []

  const sorted = [...segments]
    .filter((segment) => segment.endSeconds > segment.startSeconds)
    .sort((a, b) => a.startSeconds - b.startSeconds)

  if (sorted.length === 0) return []

  const merged: PodcastListenedSegment[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]
    if (current.startSeconds <= last.endSeconds + 0.75) {
      last.endSeconds = Math.max(last.endSeconds, current.endSeconds)
    } else {
      merged.push({ ...current })
    }
  }
  return merged
}

function markListenedRange(
  segments: PodcastListenedSegment[],
  start: number,
  end: number,
  maxDuration: number,
): PodcastListenedSegment[] {
  const clampedStart = Math.max(0, Math.min(start, maxDuration))
  const clampedEnd = Math.max(0, Math.min(end, maxDuration))
  if (clampedEnd - clampedStart < 0.05) return segments
  return mergeListenedSegments([
    ...segments,
    { startSeconds: clampedStart, endSeconds: clampedEnd },
  ])
}

function buildListeningStats(
  totalListenSeconds: number,
  seeks: PodcastListeningSeek[],
  listenedSegments: PodcastListenedSegment[],
  podcastDurationSeconds: number,
  completedListening: boolean,
  wordsReviewed: number,
): PodcastListeningStats {
  let rewindCount = 0
  let forwardCount = 0
  for (const seek of seeks) {
    if (seek.toSeconds < seek.fromSeconds) rewindCount++
    else if (seek.toSeconds > seek.fromSeconds) forwardCount++
  }
  return {
    totalListenSeconds: Math.round(totalListenSeconds),
    seekCount: seeks.length,
    rewindCount,
    forwardCount,
    seeks: seeks.slice(-MAX_SEEK_EVENTS),
    listenedSegments: mergeListenedSegments(listenedSegments).map((segment) => ({
      startSeconds: Math.round(segment.startSeconds * 10) / 10,
      endSeconds: Math.round(segment.endSeconds * 10) / 10,
    })),
    podcastDurationSeconds: Math.round(podcastDurationSeconds),
    completedListening,
    wordsReviewed,
  }
}

function VocabularyProgress({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.vocabProgress}>
      <Text style={styles.vocabProgressLabel}>
        Vocabulary · {current + 1} of {total}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.vocabDotsScroll}
        contentContainerStyle={styles.vocabDotsContent}
      >
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={styles.vocabDotSlot}>
            <View
              style={[
                styles.vocabDot,
                i < current && styles.vocabDotDone,
                i === current && styles.vocabDotActive,
              ]}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

function WordCard({ word, index, total }: { word: PodcastWord; index: number; total: number }) {
  const label = podcastWordLabel(word)

  return (
    <View style={styles.wordCard}>
      <View style={styles.wordHero}>
        <View style={styles.wordIconRing}>
          <Ionicons name="book-outline" size={24} color={colors.success} />
        </View>
        <Text style={styles.wordTerm}>{label || "—"}</Text>
        {word.kind ? <Text style={styles.wordKind}>{word.kind}</Text> : null}
      </View>

      {word.definition ? (
        <View style={styles.definitionBox}>
          <Text style={styles.definitionLabel}>Meaning</Text>
          <Text style={styles.definitionText}>{word.definition}</Text>
        </View>
      ) : null}

      {word.example ? (
        <View style={styles.definitionBox}>
          <Text style={styles.definitionLabel}>Example</Text>
          <Text style={styles.wordExample}>{word.example}</Text>
        </View>
      ) : null}

      {word.translation || word.translationUz ? (
        <View style={styles.translationRow}>
          <Ionicons name="language-outline" size={16} color={colors.textMuted} />
          <Text style={styles.translationText}>
            {word.translation || word.translationUz}
          </Text>
        </View>
      ) : null}

      <Text style={styles.wordFooterHint}>
        Word {index + 1} of {total}
      </Text>
    </View>
  )
}

export function PodcastRunner({
  episode,
  homeworkId,
  studentId,
  sessionStartedAt,
  elapsedSeconds,
  onSessionEnd,
  onListeningActiveChange,
}: {
  episode: PodcastEpisode
  homeworkId?: string
  studentId?: string
  sessionStartedAt: number
  elapsedSeconds?: number
  onSessionEnd?: () => void
  onListeningActiveChange?: (active: boolean) => void
}) {
  const router = useRouter()
  const isPractice = !homeworkId
  const words = episode.words
  const hasWords = words.length > 0

  const [phase, setPhase] = useState<Phase>("listening")
  const [wordIndex, setWordIndex] = useState(0)
  const [listeningComplete, setListeningComplete] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scrubTime, setScrubTime] = useState<number | null>(null)

  const player = useAudioPlayer(null, { updateInterval: PLAYBACK_UPDATE_INTERVAL_MS })
  const status = useAudioPlayerStatus(player)
  const {
    playbackUri,
    isFullyCached,
    ready: downloadReady,
    totalBytes,
    bufferedRanges,
    redirectDownload,
  } = usePodcastAudioDownload(episode.audioUrl)

  const sessionStartRef = useRef(Date.now())
  const lastPositionRef = useRef(0)
  const accumulatedListenRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const seeksRef = useRef<PodcastListeningSeek[]>([])
  const heardSegmentsRef = useRef<PodcastListenedSegment[]>([])
  const submittedRef = useRef(false)
  const listeningCompleteRef = useRef(false)
  const playbackUriRef = useRef(playbackUri)
  const cachedPlaybackAppliedRef = useRef(false)

  playbackUriRef.current = playbackUri

  const duration = status.duration ?? 0
  const currentTime = status.currentTime ?? 0
  const playing = status.playing
  const displayTime = scrubTime ?? currentTime
  const displayProgress = duration > 0 ? Math.min(1, displayTime / duration) : 0

  const handleSeekPreview = useCallback((ratio: number | null) => {
    if (ratio == null || duration <= 0) {
      setScrubTime(null)
      return
    }
    setScrubTime(ratio * duration)
  }, [duration])

  const handleSeek = useCallback(
    (ratio: number) => {
      if (!duration) return
      const target = Math.max(0, Math.min(duration, ratio * duration))
      const from = lastPositionRef.current
      if (
        !isPractice &&
        Math.abs(target - from) > 0.3
      ) {
        seeksRef.current.push({
          fromSeconds: Math.round(from * 10) / 10,
          toSeconds: Math.round(target * 10) / 10,
          atMs: Date.now() - sessionStartRef.current,
        })
      }
      lastPositionRef.current = target
      setScrubTime(target)

      const targetBuffered = isSecondsBuffered(
        {
          playbackUri,
          isFullyCached,
          ready: downloadReady,
          totalBytes,
          bufferedRanges,
        },
        target,
        duration,
      )

      if (!targetBuffered) {
        redirectDownload(target, duration)
      }

      const wasPlaying = playing
      if (wasPlaying) {
        player.pause()
      }

      void player.seekTo(target).then(() => {
        if (listeningCompleteRef.current) return
        if (wasPlaying) {
          player.play()
        }
      })
    },
    [
      duration,
      player,
      playing,
      playbackUri,
      isFullyCached,
      downloadReady,
      totalBytes,
      bufferedRanges,
      redirectDownload,
      isPractice,
    ],
  )

  useEffect(() => {
    if (scrubTime == null) return
    if (Math.abs(currentTime - scrubTime) < 0.35) {
      setScrubTime(null)
    }
  }, [currentTime, scrubTime])

  useEffect(() => {
    onListeningActiveChange?.(phase === "listening" && (playing || !listeningComplete))
  }, [phase, playing, listeningComplete, onListeningActiveChange])

  useEffect(() => {
    let cancelled = false
    setAudioReady(false)

    void (async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          interruptionMode: "doNotMix",
        })
        if (cancelled || !downloadReady) return
        player.replace({ uri: playbackUriRef.current })
      } catch {
        if (!cancelled) setAudioReady(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [episode.audioUrl, downloadReady, player])

  useEffect(() => {
    cachedPlaybackAppliedRef.current = false
  }, [episode.audioUrl])

  useEffect(() => {
    if (!isFullyCached || cachedPlaybackAppliedRef.current) return
    cachedPlaybackAppliedRef.current = true

    const resumeAt = player.currentTime
    const wasPlaying = player.playing
    player.replace({ uri: playbackUri })
    if (resumeAt > 0) {
      void player.seekTo(resumeAt)
    }
    if (wasPlaying) {
      player.play()
    }
  }, [isFullyCached, playbackUri, player])

  useEffect(() => {
    if (duration > 0) setAudioReady(true)
  }, [duration])

  useEffect(() => {
    if (isPractice || !playing) {
      lastTickRef.current = null
      return
    }

    const now = Date.now()
    if (lastTickRef.current != null) {
      accumulatedListenRef.current += (now - lastTickRef.current) / 1000
    }
    lastTickRef.current = now

    const last = lastPositionRef.current
    const jump = currentTime - last
    if (Math.abs(jump) > SEEK_THRESHOLD_SECONDS && last > 0) {
      seeksRef.current.push({
        fromSeconds: Math.round(last * 10) / 10,
        toSeconds: Math.round(currentTime * 10) / 10,
        atMs: now - sessionStartRef.current,
      })
    } else if (jump > 0) {
      heardSegmentsRef.current = markListenedRange(
        heardSegmentsRef.current,
        last,
        currentTime,
        duration > 0 ? duration : Number.POSITIVE_INFINITY,
      )
    }
    lastPositionRef.current = currentTime
  }, [currentTime, playing, duration, isPractice])

  useEffect(() => {
    if (isPractice || listeningCompleteRef.current) return
    if (duration <= 0) return

    const atEnd =
      currentTime >= duration - END_TOLERANCE_SECONDS ||
      (!playing && currentTime >= duration - END_TOLERANCE_SECONDS * 2)

    if (atEnd) {
      heardSegmentsRef.current = markListenedRange(
        heardSegmentsRef.current,
        lastPositionRef.current,
        duration,
        duration,
      )
      listeningCompleteRef.current = true
      setListeningComplete(true)
      player.pause()
    }
  }, [currentTime, duration, playing, player, isPractice])

  const togglePlay = useCallback(async () => {
    if (!audioReady) return
    if (playing) {
      player.pause()
      return
    }
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
    })
    if (listeningComplete && duration > 0) {
      player.seekTo(0)
      lastPositionRef.current = 0
    }
    player.play()
  }, [audioReady, playing, player, listeningComplete, duration])

  const finishSession = useCallback(
    async (wordsReviewed: number) => {
      if (submittedRef.current) return
      submittedRef.current = true

      if (!isPractice && studentId && homeworkId) {
        setSubmitting(true)

        const segmentMs = Date.now() - sessionStartedAt
        const elapsedMs =
          elapsedSeconds != null ? elapsedSeconds * 1000 + segmentMs : segmentMs

        const stats = buildListeningStats(
          accumulatedListenRef.current,
          seeksRef.current,
          heardSegmentsRef.current,
          duration,
          listeningCompleteRef.current,
          wordsReviewed,
        )

        const totalQuestions = hasWords ? words.length : 1
        const correctCount = hasWords ? wordsReviewed : listeningCompleteRef.current ? 1 : 0

        const attemptPayload = {
          totalQuestions,
          correctCount,
          durationSeconds: Math.round(elapsedMs / 1000),
          answeredCount: hasWords ? wordsReviewed : listeningCompleteRef.current ? 1 : 0,
          mistakes: [],
          listeningStats: stats,
        }

        try {
          await homeworkApi.recordAttempt(homeworkId, attemptPayload)
        } catch {
          submittedRef.current = false
          setSubmitting(false)
          return
        } finally {
          setSubmitting(false)
        }
      }

      onSessionEnd?.()
      setPhase("done")
    },
    [
      isPractice,
      sessionStartedAt,
      elapsedSeconds,
      duration,
      hasWords,
      words.length,
      studentId,
      homeworkId,
      onSessionEnd,
    ],
  )

  const handleContinueFromListening = useCallback(() => {
    if (!isPractice && !listeningComplete) return
    if (hasWords) {
      player.pause()
      setPhase("words")
      setWordIndex(0)
      return
    }
    void finishSession(0)
  }, [isPractice, listeningComplete, hasWords, finishSession, player])

  const handleNextWord = useCallback(() => {
    const reviewed = wordIndex + 1
    if (reviewed >= words.length) {
      void finishSession(words.length)
      return
    }
    setWordIndex(reviewed)
  }, [wordIndex, words.length, finishSession])

  const progressPct = useMemo(() => {
    if (phase === "listening") return Math.round(displayProgress * 100)
    if (phase === "words" && words.length > 0) {
      return Math.round(((wordIndex + 1) / words.length) * 100)
    }
    return 100
  }, [phase, displayProgress, wordIndex, words.length])

  if (phase === "done") {
    return (
      <HomeworkResultsLayout
        footer={<HomeworkFooterButton label="Done" onPress={() => router.back()} />}
      >
        <View style={styles.resultsHero}>
          <View style={[styles.resultIcon, { backgroundColor: colors.successBg }]}>
            <Ionicons name="headset-outline" size={32} color={colors.success} />
          </View>
          <Text style={styles.resultsTitle}>Listening complete</Text>
          <Text style={styles.resultsMeta}>{episode.title}</Text>
          {hasWords && !isPractice ? (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="book-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.statValue}>{words.length}</Text>
                <Text style={styles.statLabel}>words</Text>
              </View>
            </View>
          ) : null}
        </View>
      </HomeworkResultsLayout>
    )
  }

  const canContinueListening = isPractice || listeningComplete

  const listeningFooter = (
    <Pressable
      onPress={handleContinueFromListening}
      disabled={!canContinueListening || submitting}
      style={({ pressed }) => [
        styles.primaryBtn,
        (!canContinueListening || submitting) && styles.primaryBtnDisabled,
        pressed && canContinueListening && !submitting && styles.btnPressed,
      ]}
    >
      {submitting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={styles.primaryBtnText}>
            {hasWords ? "Continue to vocabulary" : "Complete"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </>
      )}
    </Pressable>
  )

  const wordsFooter = (
    <Pressable
      onPress={handleNextWord}
      disabled={submitting}
      style={({ pressed }) => [
        styles.primaryBtn,
        submitting && styles.primaryBtnDisabled,
        pressed && !submitting && styles.btnPressed,
      ]}
    >
      {submitting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={styles.primaryBtnText}>
            {wordIndex + 1 >= words.length ? "Finish" : "Next word"}
          </Text>
          {wordIndex + 1 < words.length ? (
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          ) : null}
        </>
      )}
    </Pressable>
  )

  return (
    <HomeworkExerciseLayout
      progress={progressPct}
      showTopBar={!isPractice}
      footer={phase === "listening" ? listeningFooter : wordsFooter}
      keyboardOffset={0}
      scrollable={false}
    >
      {phase === "listening" ? (
        <View style={styles.listeningBody}>
          <View style={styles.episodeCard}>
            <View style={styles.episodeIcon}>
              <Ionicons name="headset" size={28} color={colors.success} />
            </View>
            <Text style={styles.episodeTitle}>{episode.title}</Text>
            {episode.description ? (
              <Text style={styles.episodeDesc} numberOfLines={2}>
                {episode.description}
              </Text>
            ) : null}
            <View style={styles.episodeMeta}>
              <Text style={styles.episodeMetaText}>{episode.topic}</Text>
              <Text style={styles.episodeMetaDot}>·</Text>
              <Text style={styles.episodeMetaText}>{episode.level}</Text>
            </View>
          </View>

          <View style={styles.playerPanel}>
            {!audioReady || !downloadReady ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <SpeakingProgressBar
                  progress={displayProgress}
                  playing={playing && scrubTime == null}
                  bufferedRanges={bufferedRanges}
                  bufferedFillStyle={styles.bufferedFill}
                  onSeekPreview={handleSeekPreview}
                  onSeek={duration > 0 ? handleSeek : undefined}
                  style={styles.progressTrack}
                />
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>

                <Pressable
                  onPress={togglePlay}
                  disabled={!audioReady}
                  style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={playing ? "Pause" : "Play"}
                >
                  <Ionicons
                    name={playing ? "pause" : "play"}
                    size={36}
                    color="#fff"
                  />
                </Pressable>

                <Text style={styles.hintText}>
                  {isPractice
                    ? hasWords
                      ? "Continue when you're ready to review vocabulary."
                      : "Tap complete when you're done listening."
                    : listeningComplete
                      ? "You reached the end. Continue when ready."
                      : "Listen to the full episode to continue."}
                </Text>
              </>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.wordsBody}>
          <VocabularyProgress current={wordIndex} total={words.length} />
          <ScrollView
            style={styles.wordScroll}
            contentContainerStyle={styles.wordScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <WordCard word={words[wordIndex]} index={wordIndex} total={words.length} />
          </ScrollView>
        </View>
      )}
    </HomeworkExerciseLayout>
  )
}

const styles = StyleSheet.create({
  listeningBody: { flex: 1, gap: spacing.sm, minHeight: 0 },
  episodeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
  },
  episodeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  episodeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  episodeDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  episodeMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  episodeMetaText: { fontSize: 12, color: colors.textMuted, textTransform: "capitalize" },
  episodeMetaDot: { color: colors.textMuted },
  playerPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  progressTrack: { width: "100%" },
  bufferedFill: { backgroundColor: "#86efac" },
  timeRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: { fontSize: 12, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  hintText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  wordsBody: {
    flex: 1,
    gap: spacing.md,
    minHeight: 0,
  },
  vocabProgress: {
    gap: spacing.sm,
    alignItems: "center",
    flexShrink: 0,
    minHeight: 44,
  },
  vocabProgressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  vocabDotsScroll: {
    flexGrow: 0,
    maxHeight: 12,
    width: "100%",
  },
  vocabDotsContent: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  vocabDotSlot: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  vocabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  vocabDotDone: { backgroundColor: colors.success },
  vocabDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  wordScroll: { flex: 1, minHeight: 0 },
  wordScrollContent: { flexGrow: 1, paddingBottom: spacing.sm },
  wordCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  wordHero: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  wordIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  wordTerm: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    lineHeight: 40,
  },
  wordKind: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#7C3AED",
    letterSpacing: 0.6,
  },
  definitionBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  definitionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  definitionText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  wordExample: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  translationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  translationText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  wordFooterHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: radius.card,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnPressed: { opacity: 0.85 },
  resultsHero: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  resultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  resultsTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  resultsMeta: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statItem: { alignItems: "center", minWidth: 80, gap: 4 },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
})

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio"
import { File } from "expo-file-system"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import type { GrammarExercise, GrammarQuestion } from "../../types/grammar"
import { useAudioRecorder } from "../../hooks/useAudioRecorder"
import { uploadsApi } from "../../lib/api"
import {
  formatFileSize,
  resolveSpeakingLimits,
  type SpeakingLimits,
} from "../../lib/speaking-limits"
import {
  HomeworkExerciseLayout,
  HomeworkFooterButton,
  HomeworkResultsLayout,
} from "../homework/HomeworkExerciseLayout"
import { SpeakingProgressBar } from "../speaking/SpeakingProgressBar"
import { normalizeMetering, WaveformBars } from "../speaking/WaveformBars"
import { HintRow, ProgressBar } from "./shared"

const PLAYBACK_UPDATE_INTERVAL_MS = 50
import type { ExerciseRunnerProps } from "./ExerciseRunner"
import { colors, radius, spacing } from "../../theme/tokens"
import { analyticsApi, homeworkApi, controlWorkApi } from "../../lib/api"
import { recordGameExerciseResult } from "../../lib/learned-vocabulary"

type SpeakingResponse = {
  id: number
  prompt: string
  audioUrl: string
  explanation?: string
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

const DURATION_GRACE_MS = 500

function validateRecordingFile(
  fileUri: string,
  durationMs: number,
  limits: SpeakingLimits,
): string | null {
  const maxMs = limits.maxDurationSeconds * 1000 + DURATION_GRACE_MS
  if (durationMs > maxMs) {
    return `Recording is too long (max ${limits.maxDurationSeconds}s)`
  }

  const file = new File(fileUri)
  if (!file.exists) return null

  if (file.size > limits.maxFileSizeBytes) {
    return `Recording is too large (max ${formatFileSize(limits.maxFileSizeBytes)})`
  }

  return null
}

function SpeakingResults({
  exercise,
  responses,
  homeworkId,
  controlWorkId,
  stepIndex,
  studentId,
  startedAt,
  elapsedSeconds,
  onSessionEnd,
}: {
  exercise: GrammarExercise
  responses: SpeakingResponse[]
  homeworkId?: string
  controlWorkId?: string
  stepIndex?: number
  studentId?: string
  startedAt: number
  elapsedSeconds?: number
  onSessionEnd?: () => void
}) {
  const router = useRouter()
  const recorded = useRef(false)
  const total = exercise.totalQuestions
  const answered = responses.length
  const segmentMs = Date.now() - startedAt
  const elapsedMs =
    homeworkId && elapsedSeconds != null
      ? elapsedSeconds * 1000 + segmentMs
      : segmentMs

  useEffect(() => {
    onSessionEnd?.()
  }, [onSessionEnd])

  useEffect(() => {
    if (recorded.current) return
    recorded.current = true

    const attemptPayload = {
      totalQuestions: total,
      correctCount: answered,
      durationSeconds: Math.round(elapsedMs / 1000),
      answeredCount: answered,
      mistakes: responses.map((r) => ({
        questionId: r.id,
        prompt: r.prompt,
        userAnswer: r.audioUrl,
        correctAnswer: "",
        explanation: r.explanation,
      })),
    }

    void analyticsApi
      .record({
        topic: exercise.topic,
        subtopic: exercise.subtopic,
        slug: exercise.slug,
        title: exercise.title,
        type: exercise.type,
        correctCount: answered,
        totalQuestions: total,
        source: homeworkId ? "homework" : controlWorkId != null ? "control_work" : "game",
        homeworkId: homeworkId ?? undefined,
        controlWorkId: controlWorkId != null ? String(controlWorkId) : undefined,
        durationSeconds: elapsedSeconds,
      })
      .catch(() => {})

    if (studentId && !homeworkId && controlWorkId == null) {
      void recordGameExerciseResult(studentId, {
        slug: exercise.slug,
        title: exercise.title,
        topic: exercise.topic,
        correctCount: answered,
        totalQuestions: total,
        passed: answered >= exercise.passingScore,
      }).catch(() => {})
    }

    if (controlWorkId != null && stepIndex != null && studentId) {
      void controlWorkApi.completeStep(controlWorkId, stepIndex, attemptPayload).catch(() => {})
      return
    }

    if (homeworkId && studentId) {
      void homeworkApi.recordAttempt(homeworkId, attemptPayload).catch(() => {})
    }
  }, [])

  const footer = <HomeworkFooterButton label="Done" onPress={() => router.back()} />

  if (homeworkId) {
    return (
      <HomeworkResultsLayout footer={footer}>
        <View style={styles.resultsHero}>
          <View style={[styles.resultIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="mic-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.resultsTitle}>Speaking submitted</Text>
          <Text style={styles.resultsScore}>
            {answered}/{total} recordings sent
          </Text>
          <Text style={styles.resultsMeta}>
            Your teacher will listen and grade your answers.
          </Text>
        </View>
      </HomeworkResultsLayout>
    )
  }

  return (
    <View style={styles.resultsHero}>
      <View style={[styles.resultIcon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="mic-outline" size={32} color={colors.primary} />
      </View>
      <Text style={styles.resultsTitle}>Practice complete</Text>
      <Text style={styles.resultsScore}>
        {answered}/{total} recordings
      </Text>
      <Pressable onPress={() => router.back()} style={styles.doneBtn}>
        <Text style={styles.doneBtnText}>Done</Text>
      </Pressable>
    </View>
  )
}

export function SpeakingRunner(props: ExerciseRunnerProps & { exercise: GrammarExercise }) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    sessionStartedAt,
    elapsedSeconds,
    onSessionEnd,
  } = props

  const questions = exercise.content.questions ?? []
  const homeworkMode = !!homeworkId || controlWorkId != null

  const [index, setIndex] = useState(0)
  const [responses, setResponses] = useState<SpeakingResponse[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const previewPlayer = useAudioPlayer(null, { updateInterval: PLAYBACK_UPDATE_INTERVAL_MS })
  const previewStatus = useAudioPlayerStatus(previewPlayer)
  const playing = previewStatus.playing
  const previewDuration = previewStatus.duration ?? 0
  const previewCurrentTime = previewStatus.currentTime ?? 0
  const recorder = useAudioRecorder()
  const autoStoppingRef = useRef(false)

  const q: GrammarQuestion | undefined = questions[index]
  const finished = index >= questions.length

  const limits = useMemo(
    () => (q ? resolveSpeakingLimits(q, exercise) : null),
    [q, exercise],
  )

  const maxDurationMs = (limits?.maxDurationSeconds ?? 60) * 1000
  const recordedElapsedSeconds = Math.floor(recorder.durationMs / 1000)
  const remainingSeconds = Math.max(
    0,
    (limits?.maxDurationSeconds ?? 60) - recordedElapsedSeconds,
  )
  const timeProgress = Math.min(1, recorder.durationMs / maxDurationMs)
  const playbackProgress =
    playing && previewDuration > 0
      ? Math.min(1, previewCurrentTime / previewDuration)
      : timeProgress
  const barAnimating = playing || recorder.isRecording

  const stopPlayback = useCallback(async () => {
    previewPlayer.pause()
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
    })
  }, [previewPlayer])

  const playLocal = useCallback(
    async (uri: string) => {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
      })
      previewPlayer.replace({ uri })
      previewPlayer.play()
    },
    [previewPlayer],
  )

  const handleStop = useCallback(async () => {
    await recorder.stop()
  }, [recorder])

  useEffect(() => {
    if (!limits) return
    if (!recorder.isRecording && !recorder.isPaused) return
    if (recorder.durationMs < limits.maxDurationSeconds * 1000) return
    if (autoStoppingRef.current) return

    autoStoppingRef.current = true
    setLimitReached(true)
    void handleStop().finally(() => {
      autoStoppingRef.current = false
    })
  }, [
    recorder.durationMs,
    recorder.isRecording,
    recorder.isPaused,
    limits,
    handleStop,
  ])

  useEffect(() => {
    if (index === 0) return
    setLimitReached(false)
    setUploadError(null)
    autoStoppingRef.current = false
    // Reset is awaited in handleSubmitAnswer before setIndex to avoid iOS race/double-reset.
    void stopPlayback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const handleRecordToggle = useCallback(async () => {
    if (recorder.hasRecording) return
    if (recorder.isRecording) {
      await recorder.pause()
      return
    }
    if (recorder.isPaused) {
      if (limits && recorder.durationMs >= limits.maxDurationSeconds * 1000) {
        setLimitReached(true)
        await handleStop()
        return
      }
      await recorder.resume()
      return
    }
    await stopPlayback()
    setLimitReached(false)
    setUploadError(null)
    await recorder.start()
  }, [recorder, stopPlayback, limits, handleStop])

  const handleReRecord = useCallback(async () => {
    await stopPlayback()
    setLimitReached(false)
    setUploadError(null)
    await recorder.reset()
  }, [recorder, stopPlayback])

  const handleSubmitAnswer = useCallback(async () => {
    if (!q || !limits) return
    setUploading(true)
    setUploadError(null)
    try {
      let fileUri = recorder.uri
      let durationMs = recorder.durationMs
      if (recorder.isRecording || recorder.isPaused) {
        const stopped = await recorder.stop()
        if (!stopped) return
        fileUri = stopped.uri
        durationMs = stopped.durationMs
      }
      if (!fileUri) return

      const validationError = validateRecordingFile(fileUri, durationMs, limits)
      if (validationError) {
        setUploadError(validationError)
        return
      }

      const { url } = await uploadsApi.speakingAudio(fileUri)
      const entry: SpeakingResponse = {
        id: q.id,
        prompt: q.text,
        audioUrl: url,
        explanation: q.explanation,
      }
      setResponses((prev) => [...prev, entry])
      await stopPlayback()
      await recorder.reset()
      setIndex((i) => i + 1)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }, [q, limits, recorder, stopPlayback])

  const recordButtonLabel = useMemo(() => {
    if (recorder.isRecording) return "Pause"
    if (recorder.isPaused) return "Resume"
    return "Record"
  }, [recorder.isRecording, recorder.isPaused])

  const recordButtonIcon = recorder.isRecording
    ? "pause"
    : recorder.isPaused
      ? "play"
      : "mic"

  if (finished) {
    return (
      <SpeakingResults
        exercise={exercise}
        responses={responses}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        onSessionEnd={onSessionEnd}
      />
    )
  }

  if (!q) return null

  const progressPct = Math.round((index / questions.length) * 100)
  const canSubmit = recorder.hasRecording && !uploading
  const meteringLevel = normalizeMetering(recorder.metering)

  const body = (
    <>
      <View style={styles.card}>
        <Text style={styles.qLabel}>Question {index + 1}</Text>
        <Text style={styles.questionText}>{q.text}</Text>
        {limits ? (
          <Text style={styles.timeHint}>
            {q.prepTimeSeconds ? `Prep: ${q.prepTimeSeconds}s · ` : ""}
            Max {limits.maxDurationSeconds}s · up to {formatFileSize(limits.maxFileSizeBytes)}
          </Text>
        ) : null}
        <HintRow showHint={showHint} setShowHint={setShowHint} hint={q.hint} />
      </View>

      {recorder.error ? <Text style={styles.errorText}>{recorder.error}</Text> : null}
      {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}

      <View style={styles.recorderPanel}>
        {(recorder.isRecording || recorder.isPaused || recorder.hasRecording) && limits ? (
          <SpeakingProgressBar
            progress={playbackProgress}
            playing={barAnimating}
            onSeek={
              playing && previewDuration > 0
                ? (ratio) => previewPlayer.seekTo(ratio * previewDuration)
                : undefined
            }
            style={styles.timeLimitBarTrack}
            fillStyle={
              remainingSeconds <= 10 && (recorder.isRecording || recorder.isPaused)
                ? { backgroundColor: colors.error }
                : undefined
            }
          />
        ) : null}

        <Text style={styles.recorderStatusText}>
          {recorder.isRecording
            ? `Recording… ${remainingSeconds}s left`
            : recorder.isPaused
              ? `Paused · ${remainingSeconds}s left`
              : limitReached
                ? `Time limit reached (${limits?.maxDurationSeconds ?? 0}s)`
                : recorder.hasRecording
                  ? `Recorded ${formatDuration(recorder.durationMs)}`
                  : "Tap the button to record your answer"}
        </Text>

        {recorder.isRecording ? (
          <WaveformBars level={meteringLevel} active />
        ) : null}

        {!recorder.hasRecording ? (
          <View style={styles.recordButtonWrap}>
            <Pressable
              onPress={handleRecordToggle}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={recordButtonLabel}
              style={({ pressed }) => [
                styles.recordCircleBtn,
                (recorder.isRecording || recorder.isPaused) && styles.recordCircleBtnActive,
                pressed && styles.btnPressed,
                uploading && styles.btnDisabled,
              ]}
            >
              <Ionicons
                name={recordButtonIcon}
                size={40}
                color={recorder.isRecording || recorder.isPaused ? "#fff" : colors.primary}
              />
            </Pressable>
          </View>
        ) : null}

        {(recorder.isRecording || recorder.isPaused || recorder.hasRecording) && (
          <View style={styles.recorderActions}>
            {(recorder.isRecording || recorder.isPaused) && (
              <Pressable
                onPress={handleStop}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
              >
                <Ionicons name="stop" size={22} color={colors.text} />
                <Text style={styles.secondaryBtnText}>Stop</Text>
              </Pressable>
            )}

            {recorder.hasRecording && (
              <>
                <Pressable
                  onPress={() => (playing ? stopPlayback() : playLocal(recorder.uri!))}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
                >
                  <Ionicons
                    name={playing ? "pause-circle-outline" : "play-circle-outline"}
                    size={22}
                    color={colors.primary}
                  />
                  <Text style={styles.secondaryBtnText}>{playing ? "Stop" : "Listen"}</Text>
                </Pressable>
                <Pressable
                  onPress={handleReRecord}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
                >
                  <Ionicons name="refresh-outline" size={22} color={colors.textSecondary} />
                  <Text style={styles.secondaryBtnText}>Re-record</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </>
  )

  const footer = (
    <Pressable
      onPress={handleSubmitAnswer}
      disabled={!canSubmit}
      style={({ pressed }) => [
        styles.submitBtn,
        !canSubmit && styles.submitBtnDisabled,
        pressed && canSubmit && styles.btnPressed,
      ]}
    >
      {uploading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.submitBtnText}>
            {index + 1 >= questions.length ? "Submit final answer" : "Submit & next"}
          </Text>
        </>
      )}
    </Pressable>
  )

  if (homeworkMode) {
    return (
      <HomeworkExerciseLayout
        progress={progressPct}
        footer={footer}
        keyboardOffset={0}
      >
        <ProgressBar index={index} total={questions.length} correctCount={responses.length} />
        {body}
      </HomeworkExerciseLayout>
    )
  }

  return (
    <View style={styles.container}>
      <ProgressBar index={index} total={questions.length} correctCount={responses.length} />
      <View style={styles.bodyWrap}>{body}</View>
      <View style={styles.footerWrap}>{footer}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  bodyWrap: { flex: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  qLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  questionText: { fontSize: 18, lineHeight: 26, color: colors.text, marginBottom: 8 },
  timeHint: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  recorderPanel: {
    flex: 1,
    marginTop: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  timeLimitBarTrack: {
    width: "100%",
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  recorderStatusText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  recordButtonWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  recordCircleBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  recordCircleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  recorderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "600", color: colors.text },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footerWrap: { paddingBottom: spacing.lg },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.5 },
  resultsHero: { alignItems: "center", paddingVertical: spacing.xl },
  resultIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  resultsTitle: { fontSize: 22, fontWeight: "700", color: colors.text },
  resultsScore: { fontSize: 16, color: colors.textSecondary, marginTop: 6 },
  resultsMeta: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: "center" },
  doneBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
})

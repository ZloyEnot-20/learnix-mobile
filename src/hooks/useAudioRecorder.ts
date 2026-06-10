import { useCallback, useState } from "react"
import {
  useAudioRecorder as useExpoRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setIsAudioActiveAsync,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio"

export type RecorderStatus = "idle" | "recording" | "paused" | "stopped"

async function ensureRecordingAudioMode(): Promise<void> {
  await setIsAudioActiveAsync(true)
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: "doNotMix",
  })
}

export function useAudioRecorder() {
  const expoRecorder = useExpoRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(expoRecorder, 200)

  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [uri, setUri] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStatus("idle")
    setUri(null)
    setDurationMs(0)
    setError(null)
  }, [])

  const start = useCallback(async () => {
    try {
      setError(null)
      const perm = await requestRecordingPermissionsAsync()
      if (!perm.granted) {
        setError("Microphone permission is required to record your answer.")
        return false
      }

      await ensureRecordingAudioMode()
      await expoRecorder.prepareToRecordAsync()
      expoRecorder.record()
      setUri(null)
      setDurationMs(0)
      setStatus("recording")
      return true
    } catch (err) {
      console.error("[audio] start recording failed:", err)
      setError("Could not start recording. Please try again.")
      setStatus("idle")
      return false
    }
  }, [expoRecorder])

  const pause = useCallback(() => {
    if (status !== "recording") return
    try {
      expoRecorder.pause()
      setStatus("paused")
    } catch {
      setError("Could not pause recording.")
    }
  }, [expoRecorder, status])

  const resume = useCallback(async () => {
    if (status !== "paused") return
    try {
      await ensureRecordingAudioMode()
      expoRecorder.record()
      setStatus("recording")
    } catch {
      setError("Could not resume recording.")
    }
  }, [expoRecorder, status])

  const stop = useCallback(async () => {
    try {
      await expoRecorder.stop()
      const fileUri = expoRecorder.uri
      const st = expoRecorder.getStatus()
      setUri(fileUri)
      setDurationMs(st.durationMillis ?? 0)
      setStatus("stopped")
      return fileUri
    } catch (err) {
      console.error("[audio] stop recording failed:", err)
      setError("Could not stop recording.")
      setStatus("idle")
      return null
    }
  }, [expoRecorder])

  const liveDurationMs =
    status === "recording" || status === "paused"
      ? recorderState.durationMillis
      : durationMs

  return {
    status,
    uri,
    durationMs: liveDurationMs,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
    isRecording: status === "recording",
    isPaused: status === "paused",
    hasRecording: status === "stopped" && !!uri,
  }
}

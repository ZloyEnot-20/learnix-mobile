import { useCallback, useEffect, useRef, useState } from "react"
import { Audio } from "expo-av"

export type RecorderStatus = "idle" | "recording" | "paused" | "stopped"

export function useAudioRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null)
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [uri, setUri] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      void recordingRef.current?.stopAndUnloadAsync().catch(() => {})
    }
  }, [])

  const reset = useCallback(async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => {})
      recordingRef.current = null
    }
    setStatus("idle")
    setUri(null)
    setDurationMs(0)
    setError(null)
  }, [])

  const start = useCallback(async () => {
    try {
      setError(null)
      const perm = await Audio.requestPermissionsAsync()
      if (!perm.granted) {
        setError("Microphone permission is required to record your answer.")
        return false
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => {})
      }
      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await recording.startAsync()
      recordingRef.current = recording
      setUri(null)
      setDurationMs(0)
      setStatus("recording")
      return true
    } catch {
      setError("Could not start recording. Please try again.")
      setStatus("idle")
      return false
    }
  }, [])

  const pause = useCallback(async () => {
    const rec = recordingRef.current
    if (!rec || status !== "recording") return
    try {
      await rec.pauseAsync()
      setStatus("paused")
    } catch {
      setError("Could not pause recording.")
    }
  }, [status])

  const resume = useCallback(async () => {
    const rec = recordingRef.current
    if (!rec || status !== "paused") return
    try {
      await rec.startAsync()
      setStatus("recording")
    } catch {
      setError("Could not resume recording.")
    }
  }, [status])

  const stop = useCallback(async () => {
    const rec = recordingRef.current
    if (!rec) return null
    try {
      await rec.stopAndUnloadAsync()
      const fileUri = rec.getURI()
      const st = await rec.getStatusAsync()
      recordingRef.current = null
      setUri(fileUri)
      setDurationMs(st.durationMillis ?? 0)
      setStatus("stopped")
      return fileUri
    } catch {
      setError("Could not stop recording.")
      return null
    }
  }, [])

  return {
    status,
    uri,
    durationMs,
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

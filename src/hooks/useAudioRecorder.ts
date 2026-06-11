import { useCallback, useEffect, useRef, useState } from "react"
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

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
}

const METERING_POLL_INTERVAL_MS = 16

export function useAudioRecorder() {
  const expoRecorder = useExpoRecorder(RECORDING_OPTIONS)
  const recorderState = useAudioRecorderState(expoRecorder, 50)
  const [metering, setMetering] = useState<number | undefined>(undefined)
  const opRef = useRef(Promise.resolve())

  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [uri, setUri] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const runExclusive = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = opRef.current.then(fn, fn)
    opRef.current = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }, [])

  const releaseNativeRecorder = useCallback(async () => {
    try {
      const recorderStatus = expoRecorder.getStatus()
      if (recorderStatus.isRecording || recorderStatus.canRecord) {
        await expoRecorder.stop()
      }
    } catch {
      // Recorder may already be idle after a previous stop.
    }
  }, [expoRecorder])

  const reset = useCallback(async () => {
    return runExclusive(async () => {
      await releaseNativeRecorder()
      setStatus("idle")
      setUri(null)
      setDurationMs(0)
      setError(null)
    })
  }, [releaseNativeRecorder, runExclusive])

  const start = useCallback(async () => {
    return runExclusive(async () => {
      try {
        setError(null)
        const perm = await requestRecordingPermissionsAsync()
        if (!perm.granted) {
          setError("Microphone permission is required to record your answer.")
          return false
        }

        const nativeStatus = expoRecorder.getStatus()
        if (nativeStatus.isRecording || nativeStatus.canRecord) {
          await releaseNativeRecorder()
          setStatus("idle")
          setUri(null)
          setDurationMs(0)
        }

        await ensureRecordingAudioMode()
        // iOS reuses the same AVAudioRecorder without options; pass options for a fresh file each time.
        await expoRecorder.prepareToRecordAsync(RECORDING_OPTIONS)

        const preparedStatus = expoRecorder.getStatus()
        if (!preparedStatus.canRecord) {
          throw new Error("Recorder is not ready")
        }

        expoRecorder.record()

        const recordingStatus = expoRecorder.getStatus()
        if (!recordingStatus.isRecording) {
          throw new Error("Recorder did not start")
        }

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
    })
  }, [expoRecorder, releaseNativeRecorder, runExclusive])

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
    return runExclusive(async () => {
      try {
        await ensureRecordingAudioMode()
        expoRecorder.record()

        const recordingStatus = expoRecorder.getStatus()
        if (!recordingStatus.isRecording) {
          throw new Error("Recorder did not resume")
        }

        setStatus("recording")
      } catch {
        setError("Could not resume recording.")
      }
    })
  }, [expoRecorder, runExclusive, status])

  const stop = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => {
    return runExclusive(async () => {
      try {
        const durationBeforeStop = expoRecorder.getStatus().durationMillis ?? 0
        await expoRecorder.stop()
        const fileUri = expoRecorder.uri
        const stoppedDurationMs = durationBeforeStop || expoRecorder.getStatus().durationMillis || 0
        setUri(fileUri)
        setDurationMs(stoppedDurationMs)
        setStatus("stopped")
        return fileUri ? { uri: fileUri, durationMs: stoppedDurationMs } : null
      } catch (err) {
        console.error("[audio] stop recording failed:", err)
        setError("Could not stop recording.")
        setStatus("idle")
        return null
      }
    })
  }, [expoRecorder, runExclusive])

  const liveDurationMs =
    status === "recording" || status === "paused"
      ? recorderState.durationMillis
      : durationMs

  useEffect(() => {
    if (status !== "recording") {
      setMetering(undefined)
      return
    }

    const pollMetering = () => {
      setMetering(expoRecorder.getStatus().metering)
    }

    pollMetering()
    const intervalId = setInterval(pollMetering, METERING_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [status, expoRecorder])

  return {
    status,
    uri,
    durationMs: liveDurationMs,
    metering,
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

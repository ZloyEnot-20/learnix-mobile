import React, { forwardRef } from "react"
import { isAudioWaveformNativeAvailable } from "../../lib/is-audio-waveform-native-available"
import { AudioExpoPlayer } from "./audio-expo-player"
import { AudioWaveformPlayerNative } from "./audio-waveform-player-native"

export type { AudioWaveformPlayerHandle, AudioWaveformPlayerProps } from "./audio-waveform-player-types"

const useNativeWaveform = isAudioWaveformNativeAvailable()

function AudioWaveformPlayerComponent(
  props: React.ComponentProps<typeof AudioExpoPlayer>,
  ref: React.ForwardedRef<React.ComponentRef<typeof AudioExpoPlayer>>,
) {
  if (useNativeWaveform) {
    return <AudioWaveformPlayerNative ref={ref} {...props} />
  }

  return <AudioExpoPlayer ref={ref} {...props} />
}

export const AudioWaveformPlayer = React.memo(
  forwardRef(AudioWaveformPlayerComponent),
)

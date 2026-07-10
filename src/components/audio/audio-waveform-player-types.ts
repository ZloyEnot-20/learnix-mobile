import type { StyleProp, ViewStyle } from "react-native"

export type AudioWaveformPlayerProps = {
  audioUrl: string
  duration?: number
  isPlaying?: boolean
  onPlay?: () => void
  onPause?: () => void
  autoPlay?: boolean
  style?: StyleProp<ViewStyle>
}

export type AudioWaveformPlayerHandle = {
  play: () => Promise<void>
  pause: () => Promise<void>
  stop: () => Promise<void>
}

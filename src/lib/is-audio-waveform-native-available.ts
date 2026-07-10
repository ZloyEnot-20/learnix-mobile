import { NativeModules } from "react-native"

export function isAudioWaveformNativeAvailable(): boolean {
  return Boolean(NativeModules.AudioWaveformsEventEmitter)
}

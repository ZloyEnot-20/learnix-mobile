import AsyncStorage from "@react-native-async-storage/async-storage"

export const ONBOARDING_DONE_KEY = "learnix_onboarding_done"

export async function isOnboardingDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_DONE_KEY)) === "1"
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "1")
}

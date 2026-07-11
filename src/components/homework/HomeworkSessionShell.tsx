import React from "react"
import { Alert, StyleSheet, View } from "react-native"
import * as ScreenCapture from "expo-screen-capture"
import { useRouter } from "expo-router"
import { useHomeworkIntegrity } from "../../hooks/useHomeworkIntegrity"
import { useKeepAwakeWhile } from "../../hooks/useKeepAwakeWhile"
import { useOrgSettings } from "../../hooks/useOrgSettings"
import { HomeworkCheatingFailed } from "./HomeworkCheatingFailed"
import { HomeworkSuspiciousActivity } from "./HomeworkSuspiciousActivity"

interface HomeworkSessionShellProps {
  homeworkId: string
  active: boolean
  pauseUsed: boolean
  initialSuspicious?: boolean
  onSuspiciousDismissed?: () => void | Promise<void>
  title?: string
  children: React.ReactNode
}

interface HomeworkSessionContextValue {
  confirmPause: () => void
  pauseAvailable: boolean
}

export const HomeworkSessionContext = React.createContext<HomeworkSessionContextValue>({
  confirmPause: () => {},
  pauseAvailable: false,
})

export function HomeworkSessionShell({
  homeworkId,
  active,
  pauseUsed,
  initialSuspicious = false,
  onSuspiciousDismissed,
  children,
}: HomeworkSessionShellProps) {
  const { allowScreenshots, failHomeworkOnAppExit, loaded } = useOrgSettings()
  const blockScreenshots = !loaded || !allowScreenshots
  const strictIntegrity = !loaded || failHomeworkOnAppExit

  useKeepAwakeWhile(active)

  React.useEffect(() => {
    if (!blockScreenshots) return
    void ScreenCapture.preventScreenCaptureAsync()
    return () => {
      void ScreenCapture.allowScreenCaptureAsync()
    }
  }, [blockScreenshots])

  const router = useRouter()

  const handlePaused = React.useCallback(() => {
    router.back()
  }, [router])

  const integrity = useHomeworkIntegrity(
    homeworkId,
    active,
    pauseUsed,
    handlePaused,
    initialSuspicious,
    strictIntegrity,
  )

  const handleDismissSuspicious = React.useCallback(() => {
    integrity.dismissSuspicious()
    void onSuspiciousDismissed?.()
  }, [integrity.dismissSuspicious, onSuspiciousDismissed])

  const confirmPause = React.useCallback(() => {
    Alert.alert(
      "Pause homework?",
      "You can pause only once. The timer will stop and you can continue later from the homework list.\n\nAfter you resume, leaving the app will fail this homework.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pause", onPress: () => void integrity.pauseSession() },
      ],
    )
  }, [integrity.pauseSession])

  if (strictIntegrity && integrity.failed) {
    return <HomeworkCheatingFailed />
  }

  if (strictIntegrity && integrity.suspicious) {
    return (
      <HomeworkSuspiciousActivity
        onContinue={handleDismissSuspicious}
        onPause={() => void integrity.pauseSession()}
        pauseAvailable={!integrity.pauseUsed}
      />
    )
  }

  return (
    <HomeworkSessionContext.Provider
      value={{
        confirmPause,
        pauseAvailable: active && !integrity.pauseUsed,
      }}
    >
      <View style={styles.shell}>{children}</View>
    </HomeworkSessionContext.Provider>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
})

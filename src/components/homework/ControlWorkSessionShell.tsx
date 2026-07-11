import React from "react"
import { Alert, StyleSheet, View } from "react-native"
import * as ScreenCapture from "expo-screen-capture"
import { useRouter } from "expo-router"
import { useControlWorkIntegrity } from "../../hooks/useControlWorkIntegrity"
import { useKeepAwakeWhile } from "../../hooks/useKeepAwakeWhile"
import { useOrgSettings } from "../../hooks/useOrgSettings"
import { HomeworkCheatingFailed } from "./HomeworkCheatingFailed"
import { HomeworkSuspiciousActivity } from "./HomeworkSuspiciousActivity"
import { HomeworkSessionContext } from "./HomeworkSessionShell"

interface ControlWorkSessionShellProps {
  controlWorkId: string
  active: boolean
  pauseUsed: boolean
  initialSuspicious?: boolean
  onSuspiciousDismissed?: () => void | Promise<void>
  children: React.ReactNode
}

export function ControlWorkSessionShell({
  controlWorkId,
  active,
  pauseUsed,
  initialSuspicious = false,
  onSuspiciousDismissed,
  children,
}: ControlWorkSessionShellProps) {
  const { allowScreenshots, loaded } = useOrgSettings()
  const blockScreenshots = !loaded || !allowScreenshots

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

  const integrity = useControlWorkIntegrity(
    controlWorkId,
    active,
    pauseUsed,
    handlePaused,
    initialSuspicious,
  )

  const handleDismissSuspicious = React.useCallback(() => {
    integrity.dismissSuspicious()
    void onSuspiciousDismissed?.()
  }, [integrity.dismissSuspicious, onSuspiciousDismissed])

  const confirmPause = React.useCallback(() => {
    Alert.alert(
      "Pause progress test?",
      "You can pause only once. The timer will stop and you can continue later from the progress test list.\n\nAfter you resume, leaving the app will fail this progress test.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pause", onPress: () => void integrity.pauseSession() },
      ],
    )
  }, [integrity.pauseSession])

  if (integrity.failed) {
    return <HomeworkCheatingFailed />
  }

  if (integrity.suspicious) {
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

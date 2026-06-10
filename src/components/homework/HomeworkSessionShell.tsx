import React from "react"
import { Alert, StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { useHomeworkIntegrity } from "../../hooks/useHomeworkIntegrity"
import { HomeworkCheatingFailed } from "./HomeworkCheatingFailed"
import { HomeworkSuspiciousActivity } from "./HomeworkSuspiciousActivity"

interface HomeworkSessionShellProps {
  homeworkId: string
  active: boolean
  pauseUsed: boolean
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
  children,
}: HomeworkSessionShellProps) {
  const router = useRouter()

  const handlePaused = React.useCallback(() => {
    router.back()
  }, [router])

  const integrity = useHomeworkIntegrity(homeworkId, active, pauseUsed, handlePaused)

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

  if (integrity.failed) {
    return <HomeworkCheatingFailed />
  }

  if (integrity.suspicious) {
    return <HomeworkSuspiciousActivity onDismiss={integrity.dismissSuspicious} />
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

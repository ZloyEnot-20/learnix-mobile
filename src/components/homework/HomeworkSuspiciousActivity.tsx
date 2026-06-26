import React from "react"
import { StyleSheet } from "react-native"
import { HomeworkStatusScreen } from "./HomeworkStatusScreen"

interface HomeworkSuspiciousActivityProps {
  onContinue: () => void
  onPause: () => void
  pauseAvailable?: boolean
}

export function HomeworkSuspiciousActivity({
  onContinue,
  onPause,
  pauseAvailable = true,
}: HomeworkSuspiciousActivityProps) {
  return (
    <HomeworkStatusScreen
      style={styles.fill}
      code="?!"
      icon="warning-outline"
      iconColor="#B45309"
      iconBg="#FEF3C7"
      title="Suspicious activity"
      description="Cheating suspicion detected. Please do not leave the app during homework. Continue now or pause and finish later — if you leave again, this homework will fail."
      buttonLabel="Continue assignment"
      onButtonPress={onContinue}
      secondaryButtonLabel={pauseAvailable ? "Pause" : undefined}
      onSecondaryButtonPress={pauseAvailable ? onPause : undefined}
    />
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})

import React from "react"
import { StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { HomeworkStatusScreen } from "./HomeworkStatusScreen"

export function HomeworkSuspiciousActivity({ onDismiss }: { onDismiss?: () => void }) {
  const router = useRouter()

  const handlePress = () => {
    if (onDismiss) onDismiss()
    else router.back()
  }

  return (
    <HomeworkStatusScreen
      style={styles.fill}
      code="?!"
      icon="warning-outline"
      iconColor="#B45309"
      iconBg="#FEF3C7"
      title="Suspicious activity"
      description="You left the app during protected homework. Your work has been paused. If you leave again, this homework will fail."
      buttonLabel="Continue assignment"
      onButtonPress={handlePress}
    />
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})

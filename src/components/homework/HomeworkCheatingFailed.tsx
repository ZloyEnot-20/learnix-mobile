import React from "react"
import { StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { HomeworkStatusScreen } from "./HomeworkStatusScreen"

export function HomeworkCheatingFailed() {
  const router = useRouter()

  return (
    <HomeworkStatusScreen
      style={styles.fill}
      code="X"
      icon="close-circle-outline"
      iconColor="#C8102E"
      iconBg="rgba(200, 16, 46, 0.1)"
      title="Homework failed"
      description="Cheating suspicion detected. Please do not leave the app during homework. This submission has been marked as failed."
      buttonLabel="Back to homework"
      onButtonPress={() => router.back()}
    />
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})

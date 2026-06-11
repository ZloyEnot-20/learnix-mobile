import React from "react"
import { StyleSheet, View } from "react-native"
import { useAuth } from "../../src/context/AuthContext"
import { StudentHomeworkList } from "../../src/components/StudentHomeworkList"
import { colors } from "../../src/theme/tokens"

export default function HomeworkScreen() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <View style={styles.screen}>
      <StudentHomeworkList studentId={user.id} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
})

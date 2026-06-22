import React from "react"
import { StyleSheet, View } from "react-native"
import { useAuth } from "../../src/context/AuthContext"
import { GuestAuthBanner } from "../../src/components/GuestAuthBanner"
import { StudentHomeworkList } from "../../src/components/StudentHomeworkList"
import { isGuestUser } from "../../src/lib/guest"
import { colors } from "../../src/theme/tokens"

export default function HomeworkScreen() {
  const { user } = useAuth()
  if (!user) return null

  if (isGuestUser(user)) {
    return (
      <View style={styles.screen}>
        <GuestAuthBanner
          variant="screen"
          title="Homework is for students"
          message="Sign in and join your learning center to receive homework, track assignments, and save your progress."
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <StudentHomeworkList studentId={user.id} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
})

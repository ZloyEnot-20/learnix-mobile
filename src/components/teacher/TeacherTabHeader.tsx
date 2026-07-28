import React from "react"
import { NotificationsBell } from "../NotificationsBell"
import { StaffModeHeaderControl } from "./StaffModeHeaderControl"
import { spacing } from "../../theme/tokens"
import { StyleSheet, View } from "react-native"

export function TeacherTabHeaderLeft() {
  return <StaffModeHeaderControl showName />
}

export function TeacherTabHeaderRight() {
  return (
    <View style={styles.right}>
      <NotificationsBell />
    </View>
  )
}

const styles = StyleSheet.create({
  right: { marginRight: spacing.screen },
})

import React from "react"
import { NotificationsBell } from "../NotificationsBell"
import { StaffModeHeaderControl } from "../teacher/StaffModeHeaderControl"
import { spacing } from "../../theme/tokens"
import { StyleSheet, View } from "react-native"

export function AdminTabHeaderLeft() {
  return <StaffModeHeaderControl showName />
}

export function AdminTabHeaderRight() {
  return (
    <View style={styles.right}>
      <NotificationsBell />
    </View>
  )
}

const styles = StyleSheet.create({
  right: { marginRight: spacing.screen },
})

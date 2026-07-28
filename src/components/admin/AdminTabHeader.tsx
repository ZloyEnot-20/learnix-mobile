import React from "react"
import { NotificationsBell } from "../NotificationsBell"
import { StaffModeHeaderControl } from "../teacher/StaffModeHeaderControl"
import { spacing } from "../../theme/tokens"
import { StyleSheet, View } from "react-native"

type AdminTabHeaderLeftProps = {
  showName?: boolean
}

export function AdminTabHeaderLeft({ showName = false }: AdminTabHeaderLeftProps) {
  return <StaffModeHeaderControl showName={showName} />
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

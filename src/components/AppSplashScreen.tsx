import React from "react"
import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"

const LOGO = require("../../assets/icon.png")
const LOGO_SIZE = 112
const LOGO_RADIUS = 12

export function AppSplashScreen() {
  return (
    <View style={styles.container}>
      <Image source={LOGO} style={styles.logo} contentFit="cover" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
  },
})

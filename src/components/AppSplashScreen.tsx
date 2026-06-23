import React from "react"
import { Dimensions, StyleSheet, View } from "react-native"
import { Image } from "expo-image"

const LOGO = require("../../assets/splash-icon.png")
const LOGO_SIZE = Math.round(Dimensions.get("window").width * 0.42)

export function AppSplashScreen() {
  return (
    <View style={styles.container}>
      <Image source={LOGO} style={styles.logo} contentFit="contain" />
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
  },
})

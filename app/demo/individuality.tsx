import React, { useEffect } from "react"
import { View, StyleSheet } from "react-native"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Skeleton } from "../../src/components/ui/Skeleton"
import { colors } from "../../src/theme/tokens"

/** Legacy route → Unit 3 from DB pages. */
export default function IndividualityRedirect() {
  useEffect(() => {
    router.replace("/demo/unit/3" as never)
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ padding: 16, gap: 10, width: "100%" }}>
        <Skeleton height={28} width="50%" />
        <Skeleton height={120} />
        <Skeleton height={80} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
})

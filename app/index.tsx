import { Redirect } from "expo-router"
import { useAuth } from "../src/context/AuthContext"
import { View, StyleSheet } from "react-native"
import { Spinner } from "../src/components/ui/Spinner"
import { colors } from "../src/theme/tokens"

export default function Index() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Spinner size={40} />
      </View>
    )
  }

  if (!user) return <Redirect href="/login" />
  if (user.role !== "student") return <Redirect href="/login" />
  return <Redirect href="/(tabs)" />
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
})

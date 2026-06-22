import { Redirect } from "expo-router"
import { useAuth } from "../src/context/AuthContext"
import { isAppUser } from "../src/lib/guest"
import { AppSplashScreen } from "../src/components/AppSplashScreen"

export default function Index() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <AppSplashScreen />
  }

  if (!isAppUser(user)) return <Redirect href="/login" />
  return <Redirect href="/(tabs)" />
}

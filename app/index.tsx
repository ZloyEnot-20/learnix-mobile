import { Redirect } from "expo-router"
import { useAuth } from "../src/context/AuthContext"
import { isAppUser, isMobileUser, isTeacherUser } from "../src/lib/guest"
import { AppSplashScreen } from "../src/components/AppSplashScreen"

export default function Index() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <AppSplashScreen />
  }

  if (!isMobileUser(user)) return <Redirect href="/login" />
  if (isTeacherUser(user)) return <Redirect href={"/(teacher)" as never} />
  if (isAppUser(user)) return <Redirect href="/(tabs)" />
  return <Redirect href="/login" />
}

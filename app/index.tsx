import { Redirect } from "expo-router"
import { useAuth } from "../src/context/AuthContext"
import { useStaffMode } from "../src/context/StaffModeContext"
import { isAppUser, isMobileUser, isTeacherUser } from "../src/lib/guest"
import { AppSplashScreen } from "../src/components/AppSplashScreen"

export default function Index() {
  const { user, isLoading } = useAuth()
  const { isReady, mode } = useStaffMode()

  if (isLoading || (isTeacherUser(user) && !isReady)) {
    return <AppSplashScreen />
  }

  if (!isMobileUser(user)) return <Redirect href="/login" />
  if (isTeacherUser(user)) {
    if (mode === "admin") return <Redirect href={"/(admin)" as never} />
    return <Redirect href={"/(teacher)" as never} />
  }
  if (isAppUser(user)) return <Redirect href="/(tabs)" />
  return <Redirect href="/login" />
}

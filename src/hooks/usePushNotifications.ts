import { useEffect, useRef } from "react"
import { router } from "expo-router"
import { useAuth } from "../context/AuthContext"
import { isStudentUser } from "../lib/guest"
import {
  isLiveLessonPush,
  setPushNavigationHandler,
} from "../lib/push-navigation"
import {
  initializePushMessaging,
  syncPushTokenForStudent,
  teardownPushMessaging,
  unregisterPushTokenForUser,
} from "../lib/push-notifications"

export function usePushNotifications(): void {
  const { user, isLoading } = useAuth()
  const registeredUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    setPushNavigationHandler((data) => {
      if (!isLiveLessonPush(data)) return
      // Cold start: wait a tick so the root Stack is ready.
      setTimeout(() => {
        router.push("/live-lesson" as never)
      }, 350)
    })
    return () => setPushNavigationHandler(null)
  }, [])

  useEffect(() => {
    if (isLoading) return
    void initializePushMessaging()
    return () => teardownPushMessaging()
  }, [isLoading])

  useEffect(() => {
    if (isLoading) return

    const registeredId = registeredUserIdRef.current
    const nextStudent = isStudentUser(user) ? user : null

    if (registeredId && registeredId !== nextStudent?.id) {
      void unregisterPushTokenForUser(registeredId)
      registeredUserIdRef.current = null
    }

    if (nextStudent) {
      registeredUserIdRef.current = nextStudent.id
      void syncPushTokenForStudent(nextStudent)
    }
  }, [user, isLoading])
}

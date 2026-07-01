import { useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { isStudentUser } from "../lib/guest"
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

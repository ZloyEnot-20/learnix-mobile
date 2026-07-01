import { Platform } from "react-native"
import Constants from "expo-constants"
import messaging from "@react-native-firebase/messaging"
import { pushTokenApi, type AuthUser } from "./api"
import { requestNotificationsRefresh } from "./notifications-refresh"
import { isStudentUser } from "./guest"

export function isPushMessagingSupported(): boolean {
  return Constants.appOwnership !== "expo"
}

let currentToken: string | null = null
let activeUserId: string | null = null
let listenersAttached = false

let unsubscribeForeground: (() => void) | null = null
let unsubscribeTokenRefresh: (() => void) | null = null
let unsubscribeOpenedApp: (() => void) | null = null

async function requestNotificationPermission(): Promise<boolean> {
  const status = await messaging().requestPermission()
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  )
}

async function syncTokenWithBackend(userId: string, token: string): Promise<void> {
  const platform = Platform.OS === "ios" ? "ios" : "android"
  try {
    await pushTokenApi.register(userId, token, platform)
  } catch {
    /* backend may be unavailable */
  }
}

async function removeTokenFromBackend(userId: string, token: string): Promise<void> {
  try {
    await pushTokenApi.unregister(userId, token)
  } catch {
    /* backend may be unavailable */
  }
}

function attachMessageListeners(): void {
  if (listenersAttached) return
  listenersAttached = true

  unsubscribeForeground = messaging().onMessage(async () => {
    requestNotificationsRefresh()
  })

  unsubscribeTokenRefresh = messaging().onTokenRefresh(async (token) => {
    const previous = currentToken
    currentToken = token
    if (!activeUserId) return
    if (previous && previous !== token) {
      await removeTokenFromBackend(activeUserId, previous)
    }
    await syncTokenWithBackend(activeUserId, token)
  })

  unsubscribeOpenedApp = messaging().onNotificationOpenedApp(() => {
    requestNotificationsRefresh()
  })

  void messaging().getInitialNotification().then((message) => {
    if (message) requestNotificationsRefresh()
  })
}

export async function initializePushMessaging(): Promise<void> {
  if (!isPushMessagingSupported()) return

  const granted = await requestNotificationPermission()
  if (!granted) return

  currentToken = await messaging().getToken()
  attachMessageListeners()
}

export async function syncPushTokenForStudent(user: AuthUser): Promise<void> {
  if (!isPushMessagingSupported() || !isStudentUser(user)) return

  activeUserId = user.id
  if (currentToken) {
    await syncTokenWithBackend(user.id, currentToken)
  }
}

export async function unregisterPushTokenForUser(userId: string): Promise<void> {
  if (!isPushMessagingSupported()) {
    activeUserId = null
    return
  }

  if (currentToken) {
    await removeTokenFromBackend(userId, currentToken)
  }
  activeUserId = null
}

export function teardownPushMessaging(): void {
  unsubscribeForeground?.()
  unsubscribeForeground = null
  unsubscribeTokenRefresh?.()
  unsubscribeTokenRefresh = null
  unsubscribeOpenedApp?.()
  unsubscribeOpenedApp = null
  listenersAttached = false
}

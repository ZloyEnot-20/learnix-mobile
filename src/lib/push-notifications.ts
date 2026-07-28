import { Platform } from "react-native"
import Constants from "expo-constants"
import { debugApi, pushTokenApi, type AuthUser } from "./api"
import { requestLiveLessonRefresh } from "./live-lesson-refresh"
import { isLiveLessonPush, navigateFromPushData } from "./push-navigation"
import { requestNotificationsRefresh } from "./notifications-refresh"
import { isStudentUser } from "./guest"

type FirebaseMessagingModule = typeof import("@react-native-firebase/messaging").default
type RemoteMessage = {
  data?: Record<string, string>
}

function getMessagingModule(): FirebaseMessagingModule {
  return require("@react-native-firebase/messaging").default
}

function messaging() {
  return getMessagingModule()()
}

export function isPushMessagingSupported(): boolean {
  return Constants.appOwnership !== "expo"
}

export type PushPermissionResult = "granted" | "denied" | "unsupported"

let currentToken: string | null = null
let activeUserId: string | null = null
let listenersAttached = false
let readyPromise: Promise<string | null> | null = null

let unsubscribeForeground: (() => void) | null = null
let unsubscribeTokenRefresh: (() => void) | null = null
let unsubscribeOpenedApp: (() => void) | null = null

const MOBILE_HIDDEN_PUSH_TYPES = new Set(["attendance"])

function refreshFromPush(data?: Record<string, string>): void {
  if (data?.type && MOBILE_HIDDEN_PUSH_TYPES.has(data.type)) return
  requestNotificationsRefresh()
  if (isLiveLessonPush(data)) {
    requestLiveLessonRefresh()
  }
}

async function requestNotificationPermission(): Promise<boolean> {
  const module = getMessagingModule()
  const status = await messaging().requestPermission()
  return (
    status === module.AuthorizationStatus.AUTHORIZED ||
    status === module.AuthorizationStatus.PROVISIONAL
  )
}

async function ensureDeviceRegisteredForRemoteMessages(): Promise<void> {
  if (Platform.OS !== "ios") return
  if (messaging().isDeviceRegisteredForRemoteMessages) return
  await messaging().registerDeviceForRemoteMessages()
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

  unsubscribeForeground = messaging().onMessage(async (message: RemoteMessage) => {
    refreshFromPush(message?.data)
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

  unsubscribeOpenedApp = messaging().onNotificationOpenedApp((message: RemoteMessage) => {
    refreshFromPush(message?.data)
    navigateFromPushData(message?.data)
  })

  void messaging().getInitialNotification().then((message: RemoteMessage | null) => {
    if (!message) return
    refreshFromPush(message.data)
    navigateFromPushData(message.data)
  })
}

function startPushMessagingSetup(): Promise<string | null> {
  if (!isPushMessagingSupported()) return Promise.resolve(null)
  if (currentToken) return Promise.resolve(currentToken)
  if (readyPromise) return readyPromise

  readyPromise = (async () => {
    const granted = await requestNotificationPermission()
    if (!granted) return null

    await ensureDeviceRegisteredForRemoteMessages()

    const token = await messaging().getToken()
    if (!token) return null

    currentToken = token
    attachMessageListeners()

    if (activeUserId) {
      await syncTokenWithBackend(activeUserId, token)
    }

    return token
  })()

  return readyPromise
}

export async function initializePushMessaging(): Promise<void> {
  await startPushMessagingSetup()
}

export async function syncPushTokenForStudent(user: AuthUser): Promise<void> {
  if (!isPushMessagingSupported() || !isStudentUser(user)) return

  activeUserId = user.id
  const token = await startPushMessagingSetup()
  if (token) {
    await syncTokenWithBackend(user.id, token)
  }
}

export async function promptForPushNotifications(user: AuthUser): Promise<PushPermissionResult> {
  if (!isPushMessagingSupported()) return "unsupported"
  if (!isStudentUser(user)) return "unsupported"

  activeUserId = user.id
  readyPromise = null

  const granted = await requestNotificationPermission()
  if (!granted) return "denied"

  readyPromise = null
  const token = await startPushMessagingSetup()
  if (!token) return "denied"

  await syncTokenWithBackend(user.id, token)
  return "granted"
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

export async function sendDebugPushTokens(): Promise<void> {
  if (!isPushMessagingSupported()) {
    throw new Error("Push notifications are not available in Expo Go.")
  }

  await ensureDeviceRegisteredForRemoteMessages()

  const apnsToken = Platform.OS === "ios" ? await messaging().getAPNSToken() : null
  const fcmToken = await messaging().getToken()

  await debugApi.pushTokens({ apnsToken, fcmToken })
}

export function teardownPushMessaging(): void {
  unsubscribeForeground?.()
  unsubscribeForeground = null
  unsubscribeTokenRefresh?.()
  unsubscribeTokenRefresh = null
  unsubscribeOpenedApp?.()
  unsubscribeOpenedApp = null
  listenersAttached = false
  readyPromise = null
  currentToken = null
}

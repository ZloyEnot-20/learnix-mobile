import Constants from "expo-constants"
import { requestLiveLessonRefresh } from "./src/lib/live-lesson-refresh"
import { requestNotificationsRefresh } from "./src/lib/notifications-refresh"

if (Constants.appOwnership !== "expo") {
  const messaging = require("@react-native-firebase/messaging").default
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    requestNotificationsRefresh()
    const data = remoteMessage?.data
    if (data?.kind === "live_lesson" || data?.path === "/live-lesson") {
      requestLiveLessonRefresh()
    }
  })
}

import "expo-router/entry"

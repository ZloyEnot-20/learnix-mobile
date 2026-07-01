import Constants from "expo-constants"
import { requestNotificationsRefresh } from "./src/lib/notifications-refresh"

if (Constants.appOwnership !== "expo") {
  const messaging = require("@react-native-firebase/messaging").default
  messaging().setBackgroundMessageHandler(async () => {
    requestNotificationsRefresh()
  })
}

import "expo-router/entry"

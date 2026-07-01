import Constants from "expo-constants"
import messaging from "@react-native-firebase/messaging"
import { requestNotificationsRefresh } from "./src/lib/notifications-refresh"

if (Constants.appOwnership !== "expo") {
  messaging().setBackgroundMessageHandler(async () => {
    requestNotificationsRefresh()
  })
}

import "expo-router/entry"

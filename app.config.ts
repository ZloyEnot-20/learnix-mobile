import type { ExpoConfig, ConfigContext } from "expo/config"

const PRODUCTION_API_URL = "https://api.learnix.space/api"
const PRIVACY_POLICY_URL = "https://learnix.space/privacy"

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Learnix",
  slug: "learnix",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "learnix",
  userInterfaceStyle: "light",
  newArchEnabled: false,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    icon: "./assets/icon.png",
    supportsTablet: true,
    bundleIdentifier: "com.learnix.uz",
    buildNumber: "1",
    googleServicesFile: "./GoogleService-Info.plist",
    infoPlist: {
      NSMicrophoneUsageDescription:
        "Learnix records your voice for speaking exercises and homework.",
      NSPhotoLibraryUsageDescription:
        "Learnix lets you choose a profile photo from your library.",
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#05CBFA",
    },
    package: "com.learnix.uz",
    versionCode: 1,
    permissions: ["RECORD_AUDIO", "READ_MEDIA_IMAGES"],
    blockedPermissions: [
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
    ],
  },
  plugins: [
    "@react-native-firebase/app",
    "@react-native-firebase/messaging",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          forceStaticLinking: ["RNFBApp", "RNFBMessaging"],
        },
      },
    ],
    "expo-router",
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 168,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission:
          "Learnix records your voice for speaking exercises and homework.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Learnix lets you choose a profile photo from your library.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl,
    privacyPolicyUrl: PRIVACY_POLICY_URL,
    eas: {
      projectId: "73b3d9b2-993a-48f8-a289-c1faec215266",
    },
  },
  owner: process.env.EXPO_OWNER,
})

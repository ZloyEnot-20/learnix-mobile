import type { ExpoConfig, ConfigContext } from "expo/config"

const PRODUCTION_API_URL = "https://api.learnix.space/api"
const PRIVACY_POLICY_URL = "https://learnix.space/privacy"

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL
const isProductionBuild = process.env.EAS_BUILD_PROFILE === "production"

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Learnix",
  slug: "learnix",
  version: "2.5.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "learnix",
  userInterfaceStyle: "light",
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
    entitlements: {
      "aps-environment": isProductionBuild ? "production" : "development",
    },
    infoPlist: {
      NSMicrophoneUsageDescription:
        "Learnix records your voice for speaking exercises and homework.",
      NSPhotoLibraryUsageDescription:
        "Learnix lets you choose a profile photo from your library.",
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["remote-notification"],
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
    googleServicesFile: "./google-services.json",
    permissions: ["RECORD_AUDIO", "POST_NOTIFICATIONS"],
    blockedPermissions: [
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "READ_MEDIA_IMAGES",
      "READ_MEDIA_VIDEO",
      "READ_MEDIA_VISUAL_USER_SELECTED",
    ],
  },
  plugins: [
    "@react-native-firebase/app",
    "@react-native-firebase/messaging",
    "@react-native-firebase/perf",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          forceStaticLinking: ["RNFBApp", "RNFBMessaging", "RNFBPerf"],
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
        cameraPermission: false,
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

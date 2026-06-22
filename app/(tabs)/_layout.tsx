import { Tabs, Redirect } from "expo-router"
import { View, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../src/context/AuthContext"
import { isAppUser, isGuestUser } from "../../src/lib/guest"
import { NotificationsBell } from "../../src/components/NotificationsBell"
import { TabShellSkeleton } from "../../src/components/skeletons/Layouts"
import { colors, spacing } from "../../src/theme/tokens"

function HeaderRight() {
  return (
    <View style={styles.headerRight}>
      <NotificationsBell />
    </View>
  )
}

type TabIcon = keyof typeof Ionicons.glyphMap

function tabIcon(outline: TabIcon, filled: TabIcon) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  )
}

const TAB_BAR_LIFT = 6

export default function TabsLayout() {
  const { user, isLoading } = useAuth()
  const insets = useSafeAreaInsets()
  const guest = isGuestUser(user)
  const tabBarPaddingBottom = Math.max(insets.bottom, 8) + TAB_BAR_LIFT
  const tabBarHeight = 48 + tabBarPaddingBottom

  if (isLoading) {
    return <TabShellSkeleton />
  }

  if (!user || !isAppUser(user)) {
    return <Redirect href="/login" />
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.borderLight,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: { backgroundColor: colors.background },
        headerTitle: () => null,
        headerShadowVisible: false,
        headerRight: guest ? undefined : () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: tabIcon("home-outline", "home"),
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: "Homework",
          tabBarIcon: tabIcon("clipboard-outline", "clipboard"),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "Learn",
          tabBarIcon: tabIcon("book-outline", "book"),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Top",
          tabBarIcon: tabIcon("trophy-outline", "trophy"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: tabIcon("person-outline", "person"),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  headerRight: { marginRight: spacing.screen },
})

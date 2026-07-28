import { Tabs, Redirect } from "expo-router"
import { StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../src/context/AuthContext"
import { useStaffMode } from "../../src/context/StaffModeContext"
import { canSwitchStaffMode } from "../../src/lib/staff-mode"
import { isTeacherUser } from "../../src/lib/guest"
import { TabShellSkeleton } from "../../src/components/skeletons/Layouts"
import { AdminTabHeaderLeft, AdminTabHeaderRight } from "../../src/components/admin/AdminTabHeader"
import { AdminSectionTitle } from "../../src/components/admin/AdminSectionTitle"
import { ADMIN_SECTION_TITLES } from "../../src/types/admin"
import { colors } from "../../src/theme/tokens"

type TabIcon = keyof typeof Ionicons.glyphMap

function tabIcon(outline: TabIcon, filled: TabIcon) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  )
}

const TAB_BAR_LIFT = 6

export default function AdminTabsLayout() {
  const { user, isLoading } = useAuth()
  const { isReady, mode } = useStaffMode()
  const insets = useSafeAreaInsets()
  const tabBarPaddingBottom = Math.max(insets.bottom, 8) + TAB_BAR_LIFT
  const tabBarHeight = 48 + tabBarPaddingBottom

  if (isLoading || !isReady) {
    return <TabShellSkeleton />
  }

  if (!user || !isTeacherUser(user)) {
    return <Redirect href="/login" />
  }

  if (!canSwitchStaffMode(user)) {
    return <Redirect href={"/(teacher)" as never} />
  }

  if (mode === "teacher") {
    return <Redirect href={"/(teacher)" as never} />
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.borderLight,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 6,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
        headerStyle: { backgroundColor: colors.background },
        headerTitle: () => null,
        headerShadowVisible: false,
        headerLeft: () =>
          route.name === "index" ? (
            <AdminTabHeaderLeft showName />
          ) : (
            <AdminSectionTitle title={ADMIN_SECTION_TITLES[route.name] ?? route.name} />
          ),
        headerLeftContainerStyle: route.name === "index" ? styles.headerLeftWide : undefined,
        headerRight: () => <AdminTabHeaderRight />,
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: tabIcon("grid-outline", "grid"),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: tabIcon("people-outline", "people"),
        }}
      />
      <Tabs.Screen
        name="teachers"
        options={{
          title: "Teachers",
          tabBarIcon: tabIcon("school-outline", "school"),
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: "Review",
          tabBarIcon: tabIcon("clipboard-outline", "clipboard"),
        }}
      />
      <Tabs.Screen
        name="push"
        options={{
          title: "Push",
          tabBarIcon: tabIcon("notifications-outline", "notifications"),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: tabIcon("alert-circle-outline", "alert-circle"),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  headerLeftWide: {
    flexGrow: 1,
    maxWidth: "72%",
  },
})

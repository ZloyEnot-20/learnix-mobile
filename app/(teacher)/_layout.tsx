import { Tabs, Redirect } from "expo-router"
import { StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../src/context/AuthContext"
import { useStaffMode } from "../../src/context/StaffModeContext"
import { isTeacherUser } from "../../src/lib/guest"
import { TabShellSkeleton } from "../../src/components/skeletons/Layouts"
import {
  TeacherTabHeaderLeft,
  TeacherTabHeaderRight,
} from "../../src/components/teacher/TeacherTabHeader"
import { colors } from "../../src/theme/tokens"
import { teacherColors } from "../../src/theme/teacher-tokens"
type TabIcon = keyof typeof Ionicons.glyphMap

function tabIcon(outline: TabIcon, filled: TabIcon) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  )
}

const TAB_BAR_LIFT = 6

export default function TeacherTabsLayout() {
  const { user, isLoading } = useAuth()
  const { isReady, mode, canSwitch } = useStaffMode()
  const insets = useSafeAreaInsets()
  const tabBarPaddingBottom = Math.max(insets.bottom, 8) + TAB_BAR_LIFT
  const tabBarHeight = 48 + tabBarPaddingBottom

  if (isLoading || (canSwitch && !isReady)) {
    return <TabShellSkeleton />
  }

  if (!user || !isTeacherUser(user)) {
    return <Redirect href="/login" />
  }

  if (canSwitch && mode === "admin") {
    return <Redirect href={"/(admin)" as never} />
  }

  return (
    <Tabs
      screenOptions={() => ({
        tabBarActiveTintColor: teacherColors.accentDark,
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
        headerLeft: () => <TeacherTabHeaderLeft />,
        headerLeftContainerStyle: styles.headerLeftWide,
        headerRight: () => <TeacherTabHeaderRight />,
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: tabIcon("home-outline", "home"),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Groups",
          tabBarIcon: tabIcon("people-outline", "people"),
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
  headerLeftWide: {
    flexGrow: 1,
    maxWidth: "72%",
  },
})

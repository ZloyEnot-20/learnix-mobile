import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
  type LayoutChangeEvent,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { animation, colors, radius, shadow, spacing, typography } from "../../theme/tokens"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export type SwipeableTab<T extends string = string> = {
  key: T
  label: string
}

type SwipeableTabsProps<T extends string> = {
  tabs: SwipeableTab<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
  children: React.ReactNode
  header?: React.ReactNode
  style?: StyleProp<ViewStyle>
  barStyle?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  scrollable?: boolean
  refreshControl?: React.ReactElement<RefreshControlProps>
  onTabSwitch?: () => void
}

const SPRING = { useNativeDriver: true, tension: 90, friction: 14 }

function animateTabSwitch() {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      animation.tabSwitchDuration,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ),
  )
}

export function SwipeableTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  children,
  header,
  style,
  barStyle,
  contentStyle,
  scrollable = false,
  refreshControl,
  onTabSwitch,
}: SwipeableTabsProps<T>) {
  const panels = React.Children.toArray(children)
  const [panelWidth, setPanelWidth] = useState(0)
  const [tabsWidth, setTabsWidth] = useState(0)
  const slideIndex = useRef(new Animated.Value(0)).current
  const dragStartIndex = useRef(0)
  const scrollRefs = useRef<(ScrollView | null)[]>([])

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeTab))
  const tabCount = tabs.length
  const tabSlotWidth = tabsWidth > 0 ? (tabsWidth - 8) / tabCount : 0

  const snapToIndex = useCallback(
    (index: number, notify = true) => {
      const clamped = Math.max(0, Math.min(tabCount - 1, index))
      Animated.spring(slideIndex, { toValue: clamped, ...SPRING }).start()
      dragStartIndex.current = clamped
      const nextTab = tabs[clamped]?.key
      if (notify && nextTab && nextTab !== activeTab) {
        animateTabSwitch()
        onTabSwitch?.()
        scrollRefs.current[clamped]?.scrollTo({ y: 0, animated: false })
        onTabChange(nextTab)
      }
    },
    [activeTab, onTabChange, onTabSwitch, slideIndex, tabCount, tabs],
  )

  useEffect(() => {
    Animated.spring(slideIndex, { toValue: activeIndex, ...SPRING }).start()
    dragStartIndex.current = activeIndex
  }, [activeIndex, slideIndex])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          panelWidth > 0 &&
          tabCount > 1 &&
          Math.abs(g.dx) > Math.abs(g.dy) &&
          Math.abs(g.dx) > 12,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          panelWidth > 0 &&
          tabCount > 1 &&
          Math.abs(g.dx) > Math.abs(g.dy) &&
          Math.abs(g.dx) > 12,
        onPanResponderGrant: () => {
          slideIndex.stopAnimation((value) => {
            dragStartIndex.current = value
          })
        },
        onPanResponderMove: (_, g) => {
          if (panelWidth <= 0) return
          const next = dragStartIndex.current - g.dx / panelWidth
          slideIndex.setValue(Math.max(0, Math.min(tabCount - 1, next)))
        },
        onPanResponderRelease: (_, g) => {
          if (panelWidth <= 0) return
          let target = dragStartIndex.current - g.dx / panelWidth
          if (g.vx <= -0.35) target = Math.ceil(target)
          else if (g.vx >= 0.35) target = Math.floor(target)
          else target = Math.round(target)
          snapToIndex(target)
        },
        onPanResponderTerminate: () => {
          snapToIndex(Math.round(dragStartIndex.current), false)
        },
      }),
    [panelWidth, snapToIndex, slideIndex, tabCount],
  )

  const onPanelsLayout = useCallback((e: LayoutChangeEvent) => {
    setPanelWidth(e.nativeEvent.layout.width)
  }, [])

  const onTabsLayout = useCallback((e: LayoutChangeEvent) => {
    setTabsWidth(e.nativeEvent.layout.width)
  }, [])

  const tabIndicatorX =
    tabSlotWidth > 0
      ? slideIndex.interpolate({
          inputRange: tabs.map((_, i) => i),
          outputRange: tabs.map((_, i) => i * tabSlotWidth),
        })
      : 0

  const contentTranslateX =
    panelWidth > 0
      ? slideIndex.interpolate({
          inputRange: tabs.map((_, i) => i),
          outputRange: tabs.map((_, i) => -i * panelWidth),
        })
      : 0

  const handleTabPress = useCallback(
    (tab: T) => {
      if (tab === activeTab) return
      animateTabSwitch()
      onTabSwitch?.()
      const index = tabs.findIndex((t) => t.key === tab)
      scrollRefs.current[index]?.scrollTo({ y: 0, animated: false })
      onTabChange(tab)
    },
    [activeTab, onTabChange, onTabSwitch, tabs],
  )

  const renderPanel = (panel: React.ReactNode, index: number) => {
    const inner = (
      <View style={[styles.panelInner, scrollable && styles.panelInnerScrollable]}>{panel}</View>
    )
    if (!scrollable) return inner

    return (
      <ScrollView
        ref={(ref) => {
          scrollRefs.current[index] = ref
        }}
        style={styles.panelScroll}
        contentContainerStyle={[
          styles.panelScrollContent,
          refreshControl ? styles.panelScrollContentRefreshable : null,
        ]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={index === activeIndex ? refreshControl : undefined}
      >
        {inner}
      </ScrollView>
    )
  }

  return (
    <View style={[scrollable ? styles.rootFlex : styles.root, style]}>
      {header ? <View style={styles.header}>{header}</View> : null}

      <View style={[styles.tabs, barStyle]} onLayout={onTabsLayout}>
        {tabSlotWidth > 0 ? (
          <Animated.View
            style={[
              styles.tabIndicator,
              { width: tabSlotWidth, transform: [{ translateX: tabIndicatorX }] },
            ]}
          />
        ) : null}
        {tabs.map((tab) => (
          <Pressable key={tab.key} onPress={() => handleTabPress(tab.key)} style={styles.tab}>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={[scrollable ? styles.panelsClipFlex : styles.panelsClip, contentStyle]}
        onLayout={onPanelsLayout}
        {...(panelWidth > 0 && tabCount > 1 ? panResponder.panHandlers : {})}
      >
        {panelWidth > 0 ? (
          <Animated.View
            style={[
              styles.panelsRow,
              { width: panelWidth * tabCount, transform: [{ translateX: contentTranslateX }] },
            ]}
          >
            {panels.map((panel, index) => (
              <View
                key={tabs[index]?.key ?? index}
                style={[styles.panel, { width: panelWidth }]}
              >
                {renderPanel(panel, index)}
              </View>
            ))}
          </Animated.View>
        ) : (
          <View style={scrollable ? styles.panelPlaceholderFlex : styles.panelPlaceholder}>
            {scrollable ? renderPanel(panels[activeIndex], activeIndex) : panels[activeIndex]}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { width: "100%" },
  rootFlex: { flex: 1 },
  header: { marginBottom: spacing.md },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: radius.button,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    ...shadow.card,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.sm,
    zIndex: 1,
  },
  tabText: { ...typography.bodySm, fontWeight: "500", color: colors.textSecondary },
  tabTextActive: { color: colors.text, fontWeight: "600" },
  panelsClip: { overflow: "hidden" },
  panelsClipFlex: { flex: 1, overflow: "hidden", minHeight: 0 },
  panelsRow: { flex: 1, flexDirection: "row" },
  panel: { height: "100%" },
  panelPlaceholder: { width: "100%" },
  panelPlaceholderFlex: { flex: 1, width: "100%", minHeight: 0 },
  panelScroll: { flex: 1 },
  panelScrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  panelScrollContentRefreshable: {
    flexGrow: 1,
  },
  panelInner: { gap: spacing.md },
  panelInnerScrollable: {
    flexGrow: 1,
  },
})

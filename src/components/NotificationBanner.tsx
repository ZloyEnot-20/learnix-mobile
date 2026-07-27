import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { filterMobileNotifications, notificationsApi, type NotificationItem } from "../lib/api"
import { cacheKey, peekStale } from "../lib/api-cache"
import { getNotificationBannerColor } from "../lib/notification-colors"
import { requestNotificationsRefresh, subscribeNotificationsRefresh } from "../lib/notifications-refresh"
import { formatRelative } from "../lib/utils"
import { NotificationBannerSkeleton } from "./skeletons/Layouts"
import {
  getNotificationBannerReservedHeight,
  NOTIFICATION_BANNER_BOTTOM_GAP,
  NOTIFICATION_BELL_WRAP_SIZE,
  NOTIFICATION_CARD_HEIGHT,
  NOTIFICATION_SECTION_EXTRA_GAP,
  NOTIFICATION_STACK_MIN_HEIGHT,
  NOTIFICATION_STACK_OFFSET,
  NOTIFICATION_STACK_PEEK_LAYERS,
} from "./notification-banner-layout"
import { colors, radius, spacing, typography } from "../theme/tokens"

const STACK_PEEK_LAYERS = NOTIFICATION_STACK_PEEK_LAYERS
const MAX_VISIBLE = STACK_PEEK_LAYERS + 1
const STACK_OFFSET = NOTIFICATION_STACK_OFFSET
const STACK_SCALE_STEP = 0.03
const DISMISS_OFFSCREEN_RATIO = 0.35
const CARD_HEIGHT = NOTIFICATION_CARD_HEIGHT
const BELL_ICON_SIZE = 22
const BELL_WRAP_SIZE = NOTIFICATION_BELL_WRAP_SIZE
const MAX_STACK_HEIGHT = NOTIFICATION_STACK_MIN_HEIGHT
const FALLBACK_SECTION_HEIGHT = getNotificationBannerReservedHeight()
const COLLAPSE_DURATION = 300

function cardWidthForScreen(screenWidth: number): number {
  return screenWidth - spacing.screen * 2
}

function dismissDistanceForScreen(screenWidth: number): number {
  return screenWidth + spacing.screen * 2
}

function visibleCardWidth(translateX: number, screenWidth: number): number {
  const cardWidth = cardWidthForScreen(screenWidth)
  const cardLeft = spacing.screen + translateX
  const cardRight = cardLeft + cardWidth
  const visibleLeft = Math.max(0, cardLeft)
  const visibleRight = Math.min(screenWidth, cardRight)
  return Math.max(0, visibleRight - visibleLeft)
}

function shouldDismissCard(translateX: number, screenWidth: number): boolean {
  const cardWidth = cardWidthForScreen(screenWidth)
  return visibleCardWidth(translateX, screenWidth) < cardWidth * (1 - DISMISS_OFFSCREEN_RATIO)
}

function translateYForDepth(depth: number): number {
  return depth * STACK_OFFSET
}

export function getNotificationBannerLayoutHeight(): number {
  return FALLBACK_SECTION_HEIGHT + NOTIFICATION_BANNER_BOTTOM_GAP
}

function NotificationBellIcon() {
  return (
    <View style={styles.iconWrap}>
      <View style={styles.iconBg} />
      <Ionicons name="notifications-outline" size={BELL_ICON_SIZE} color={colors.text} />
    </View>
  )
}

function NotificationCardContent({ item }: { item: NotificationItem }) {
  return (
    <View style={styles.headerRow}>
      <NotificationBellIcon />
      <View style={styles.headerText}>
        <Text style={styles.headline} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        {item.message ? (
          <Text style={styles.subline} numberOfLines={1} ellipsizeMode="tail">
            {item.message}
          </Text>
        ) : null}
        <Text style={styles.time} numberOfLines={1} ellipsizeMode="tail">
          {formatRelative(item.createdAt)}
        </Text>
      </View>
    </View>
  )
}

function SwipeableStackCard({
  item,
  depth,
  isTop,
  isExiting,
  dismissPromotesStack,
  screenWidth,
  onDismissStart,
  onDismissComplete,
  onInteractionChange,
}: {
  item: NotificationItem
  depth: number
  isTop: boolean
  isExiting?: boolean
  dismissPromotesStack: boolean
  screenWidth: number
  onDismissStart: () => void
  onDismissComplete: () => void
  onInteractionChange?: (active: boolean) => void
}) {
  const translateX = useRef(new Animated.Value(0)).current
  const depthAnim = useRef(new Animated.Value(depth)).current
  const translateYTarget = translateYForDepth(depth)
  const translateYAnim = useRef(new Animated.Value(translateYTarget)).current
  const prevDepthRef = useRef(depth)
  const dismissing = useRef(false)
  const dismissDistance = dismissDistanceForScreen(screenWidth)

  useEffect(() => {
    const prevDepth = prevDepthRef.current
    prevDepthRef.current = depth
    const targetY = translateYForDepth(depth)

    if (depth < prevDepth) {
      depthAnim.setValue(depth)
      translateYAnim.setValue(targetY)
      return
    }

    Animated.spring(depthAnim, {
      toValue: depth,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start()
    Animated.spring(translateYAnim, {
      toValue: targetY,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start()
  }, [depth, depthAnim, translateYAnim])

  const beginDismiss = useCallback(() => {
    if (dismissing.current) return
    dismissing.current = true
    onDismissStart()
  }, [onDismissStart])

  const completeDismiss = useCallback(() => {
    onDismissComplete()
  }, [onDismissComplete])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isTop,
        onStartShouldSetPanResponderCapture: () => isTop,
        onMoveShouldSetPanResponder: () => isTop,
        onMoveShouldSetPanResponderCapture: () => isTop,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => isTop,
        onPanResponderGrant: () => {
          if (isTop) onInteractionChange?.(true)
        },
        onPanResponderMove: (_, g) => {
          if (isTop) translateX.setValue(g.dx)
        },
        onPanResponderRelease: (_, g) => {
          if (!isTop) return
          const finish = () => onInteractionChange?.(false)
          const shouldDismiss = shouldDismissCard(g.dx, screenWidth)
          if (shouldDismiss) {
            const direction = g.dx >= 0 ? 1 : -1
            beginDismiss()
            if (dismissPromotesStack) finish()
            Animated.timing(translateX, {
              toValue: direction * dismissDistance,
              duration: 220,
              useNativeDriver: true,
            }).start(() => {
              if (!dismissPromotesStack) finish()
              completeDismiss()
            })
            return
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 12,
          }).start(finish)
        },
        onPanResponderTerminate: () => {
          onInteractionChange?.(false)
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 12,
          }).start()
        },
      }),
    [beginDismiss, completeDismiss, dismissDistance, dismissPromotesStack, isTop, onInteractionChange, screenWidth, translateX],
  )

  const scaleX = depthAnim.interpolate({
    inputRange: [0, STACK_PEEK_LAYERS],
    outputRange: [1, 1 - STACK_PEEK_LAYERS * STACK_SCALE_STEP],
    extrapolate: "clamp",
  })

  const rotate = translateX.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: ["-8deg", "0deg", "8deg"],
    extrapolate: "clamp",
  })

  const topOpacity = translateX.interpolate({
    inputRange: [-dismissDistance * 0.85, 0, dismissDistance * 0.85],
    outputRange: [0, 1, 0],
    extrapolate: "clamp",
  })

  return (
    <Animated.View
      style={[
        styles.card,
        styles.stackCard,
        { backgroundColor: getNotificationBannerColor(item.type) },
        {
          zIndex: isExiting ? MAX_VISIBLE + 1 : MAX_VISIBLE - depth,
          opacity: isTop || isExiting ? topOpacity : 1,
          transform: [
            { translateX: isTop || isExiting ? translateX : 0 },
            { translateY: translateYAnim },
            { scaleX },
            { rotate: isTop || isExiting ? rotate : "0deg" },
          ],
        },
      ]}
      pointerEvents={isExiting ? "none" : "auto"}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      <NotificationCardContent item={item} />
    </Animated.View>
  )
}

export function NotificationBanner({
  loading = false,
  onScrollLockChange,
}: {
  loading?: boolean
  onScrollLockChange?: (locked: boolean) => void
} = {}) {
  const { width: screenWidth } = useWindowDimensions()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set())

  const sectionInnerRef = useRef<View>(null)
  const sectionHeight = useRef(new Animated.Value(0)).current
  const sectionOpacity = useRef(new Animated.Value(1)).current
  const sectionMargin = useRef(new Animated.Value(NOTIFICATION_BANNER_BOTTOM_GAP)).current
  const measuredHeightRef = useRef(FALLBACK_SECTION_HEIGHT)
  const isCollapsing = useRef(false)
  const wasVisibleRef = useRef(false)
  const dismissStackSizeRef = useRef(0)

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoaded(false)
    try {
      const data = await notificationsApi.list(opts?.silent ? { force: true } : undefined)
      setItems(data)
    } catch {
      if (!opts?.silent) setItems([])
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    const cached = peekStale<NotificationItem[]>(cacheKey("GET", "/notifications"))
    if (cached) {
      setItems(filterMobileNotifications(cached))
      setLoaded(true)
    }
    void refresh({ silent: true })
  }, [refresh])

  useEffect(() => subscribeNotificationsRefresh(() => void refresh({ silent: true })), [refresh])

  const unread = useMemo(
    () =>
      items
        .filter((n) => !n.read)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  )
  const visible = useMemo(() => unread.slice(0, MAX_VISIBLE), [unread])
  const stackItems = useMemo(
    () => visible.filter((n) => !exitingIds.has(n.id)),
    [exitingIds, visible],
  )

  const markRead = useCallback(async (item: NotificationItem) => {
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
    try {
      await notificationsApi.markRead(item.id, true)
      requestNotificationsRefresh()
    } catch {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: false } : n)))
    }
  }, [])

  const resetSectionAnimation = useCallback(() => {
    isCollapsing.current = false
    sectionOpacity.setValue(1)
    sectionMargin.setValue(NOTIFICATION_BANNER_BOTTOM_GAP)
    sectionHeight.setValue(measuredHeightRef.current || FALLBACK_SECTION_HEIGHT)
  }, [sectionHeight, sectionMargin, sectionOpacity])

  const handleSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = Math.ceil(event.nativeEvent.layout.height)
      if (nextHeight <= 0) return

      measuredHeightRef.current = nextHeight
      if (!isCollapsing.current) {
        sectionHeight.setValue(nextHeight)
      }
    },
    [sectionHeight],
  )

  const collapseSection = useCallback(
    (item: NotificationItem) => {
      isCollapsing.current = true
      onScrollLockChange?.(false)

      const startHeight = measuredHeightRef.current || FALLBACK_SECTION_HEIGHT
      sectionHeight.setValue(startHeight)

      Animated.parallel([
        Animated.timing(sectionOpacity, {
          toValue: 0,
          duration: COLLAPSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(sectionHeight, {
          toValue: 0,
          duration: COLLAPSE_DURATION,
          useNativeDriver: false,
        }),
        Animated.timing(sectionMargin, {
          toValue: 0,
          duration: COLLAPSE_DURATION,
          useNativeDriver: false,
        }),
      ]).start(() => {
        void markRead(item).finally(() => {
          isCollapsing.current = false
          setRendered(false)
        })
      })
    },
    [markRead, onScrollLockChange, sectionHeight, sectionMargin, sectionOpacity],
  )

  const handleDismissStart = useCallback(
    (item: NotificationItem) => {
      dismissStackSizeRef.current = stackItems.length
      if (stackItems.length <= 1) return
      setExitingIds((prev) => {
        const next = new Set(prev)
        next.add(item.id)
        return next
      })
      onScrollLockChange?.(false)
    },
    [onScrollLockChange, stackItems.length],
  )

  const handleDismissComplete = useCallback(
    (item: NotificationItem) => {
      if (dismissStackSizeRef.current <= 1) {
        collapseSection(item)
        return
      }
      setExitingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      void markRead(item)
    },
    [collapseSection, markRead],
  )

  const handleInteractionChange = useCallback(
    (active: boolean) => {
      onScrollLockChange?.(active)
    },
    [onScrollLockChange],
  )

  useLayoutEffect(() => {
    if (visible.length > 0) {
      setRendered(true)
      if (!wasVisibleRef.current && !isCollapsing.current) {
        wasVisibleRef.current = true
        resetSectionAnimation()
      }
      return
    }
    wasVisibleRef.current = false
  }, [visible.length, resetSectionAnimation])

  if (loading || !loaded) {
    return <NotificationBannerSkeleton />
  }

  if (!rendered && visible.length === 0) {
    return null
  }

  return (
    <Animated.View
      style={{
        height: visible.length > 0 || isCollapsing.current ? sectionHeight : 0,
        marginBottom: sectionMargin,
        overflow: "visible",
      }}
    >
      <Animated.View style={{ opacity: sectionOpacity }}>
        <View
          ref={sectionInnerRef}
          style={[styles.sectionInner, styles.sectionInnerMeasure]}
          collapsable={false}
          onLayout={handleSectionLayout}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <View style={styles.swipeStage}>
            <View style={[styles.stack, { height: MAX_STACK_HEIGHT }]}>
              {[...visible].reverse().map((item) => {
                const isExiting = exitingIds.has(item.id)
                const depth = isExiting ? -1 : stackItems.findIndex((n) => n.id === item.id)
                const isTop = depth === 0
                return (
                  <SwipeableStackCard
                    key={item.id}
                    item={item}
                    depth={Math.max(depth, 0)}
                    isTop={isTop}
                    isExiting={isExiting}
                    dismissPromotesStack={stackItems.length > 1}
                    screenWidth={screenWidth}
                    onDismissStart={() => handleDismissStart(item)}
                    onDismissComplete={() => handleDismissComplete(item)}
                    onInteractionChange={isTop ? handleInteractionChange : undefined}
                  />
                )
              })}
            </View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  sectionInner: {
    width: "100%",
    paddingBottom: NOTIFICATION_SECTION_EXTRA_GAP,
    overflow: "hidden",
    position: "relative",
  },
  sectionInnerMeasure: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.text,
  },
  swipeStage: {
    marginHorizontal: -spacing.screen,
    overflow: "hidden",
  },
  stack: {
    position: "relative",
    marginHorizontal: spacing.screen,
    overflow: "hidden",
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.md,
    height: CARD_HEIGHT,
    overflow: "hidden",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.38)",
  },
  stackCard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    overflow: "hidden",
  },
  iconWrap: {
    width: BELL_WRAP_SIZE,
    height: BELL_WRAP_SIZE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: "rgba(17, 24, 39, 0.12)",
  },
  headerText: { flex: 1, minWidth: 0, gap: 2, overflow: "hidden" },
  headline: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 21,
  },
  subline: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(17, 24, 39, 0.72)",
    lineHeight: 16,
  },
  time: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(17, 24, 39, 0.55)",
    marginTop: 2,
    lineHeight: 14,
  },
})

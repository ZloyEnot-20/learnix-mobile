import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"

const SLIDE_DISTANCE = 480
const DISMISS_DRAG = 72
const DISMISS_VELOCITY = 0.75
const OPEN_DURATION = 320
const CLOSE_DURATION = 280

type BottomSheetProps = {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  headerRight?: React.ReactNode
  contentStyle?: StyleProp<ViewStyle>
  /** Allow closing by dragging the handle/header down. Default: true */
  enableSwipeToClose?: boolean
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  headerRight,
  contentStyle,
  enableSwipeToClose = true,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets()
  const [rendered, setRendered] = useState(false)
  const isClosing = useRef(false)
  const wasOpen = useRef(false)
  const prevVisible = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const slide = useRef(new Animated.Value(SLIDE_DISTANCE)).current
  const dragY = useRef(new Animated.Value(0)).current
  const backdrop = useRef(new Animated.Value(0)).current

  const translateY = Animated.add(slide, dragY)

  const runClose = useCallback(
    (notifyParent: boolean) => {
      if (isClosing.current) return
      isClosing.current = true
      wasOpen.current = false

      Animated.parallel([
        Animated.timing(slide, {
          toValue: SLIDE_DISTANCE,
          duration: CLOSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(dragY, {
          toValue: 0,
          duration: CLOSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: CLOSE_DURATION - 40,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          isClosing.current = false
          return
        }
        slide.setValue(SLIDE_DISTANCE)
        dragY.setValue(0)
        backdrop.setValue(0)
        isClosing.current = false
        setRendered(false)
        if (notifyParent) onCloseRef.current()
      })
    },
    [backdrop, dragY, slide],
  )

  const handleDismiss = useCallback(() => {
    runClose(true)
  }, [runClose])

  const openSheet = useCallback(() => {
    isClosing.current = false
    wasOpen.current = true
    setRendered(true)
    slide.setValue(SLIDE_DISTANCE)
    dragY.setValue(0)
    backdrop.setValue(0)

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(slide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 28,
          stiffness: 280,
          mass: 0.9,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: OPEN_DURATION,
          useNativeDriver: true,
        }),
      ]).start()
    })
  }, [backdrop, dragY, slide])

  useEffect(() => {
    const becameVisible = visible && !prevVisible.current
    const becameHidden = !visible && prevVisible.current
    prevVisible.current = visible

    if (becameVisible) {
      openSheet()
      return
    }
    if (becameHidden && wasOpen.current && !isClosing.current) {
      runClose(false)
    }
  }, [visible, openSheet, runClose])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        enableSwipeToClose &&
        gesture.dy > 4 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (!enableSwipeToClose || gesture.dy <= 0) return
        dragY.setValue(gesture.dy)
        backdrop.setValue(Math.max(0, 1 - gesture.dy / 260))
      },
      onPanResponderRelease: (_, gesture) => {
        if (!enableSwipeToClose) return

        if (gesture.dy > DISMISS_DRAG || gesture.vy > DISMISS_VELOCITY) {
          slide.setValue(gesture.dy)
          dragY.setValue(0)
          runClose(true)
          return
        }

        Animated.parallel([
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 320,
          }),
          Animated.timing(backdrop, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start()
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 320,
        }).start()
        backdrop.setValue(1)
      },
    }),
  ).current

  if (!rendered) return null

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            shadow.sheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...(enableSwipeToClose ? panResponder.panHandlers : {})}>
            <View style={styles.handle} />
            {(title || headerRight) && (
              <View style={styles.header}>
                {title ? <Text style={styles.title}>{title}</Text> : <View style={styles.headerSpacer} />}
                {headerRight}
              </View>
            )}
          </View>
          <View style={[styles.content, contentStyle]}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
  headerSpacer: { flex: 1 },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  content: { flexGrow: 0 },
})

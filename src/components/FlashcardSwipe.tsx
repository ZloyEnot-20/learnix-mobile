import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { colors, radius, shadow, spacing } from "../theme/tokens"

const SWIPE_THRESHOLD = 72
const SWIPE_OFFSCREEN = 420
const CARD_HEIGHT = Math.min(340, Math.round(Dimensions.get("window").height * 0.38))

interface FlashcardSwipeProps {
  front: React.ReactNode
  back: React.ReactNode
  onSwipeLeft: () => void
  onSwipeRight: () => void
  cardKey: string
}

export function FlashcardSwipe({
  front,
  back,
  onSwipeLeft,
  onSwipeRight,
  cardKey,
}: FlashcardSwipeProps) {
  const [flipped, setFlipped] = useState(false)
  const translateX = useRef(new Animated.Value(0)).current
  const flipAnim = useRef(new Animated.Value(0)).current
  const animating = useRef(false)

  useEffect(() => {
    setFlipped(false)
    flipAnim.setValue(0)
    translateX.setValue(0)
    animating.current = false
  }, [cardKey, flipAnim, translateX])

  const toggleFlip = useCallback(() => {
    const next = !flipped
    setFlipped(next)
    Animated.spring(flipAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start()
  }, [flipped, flipAnim])

  const animateSwipe = useCallback(
    (direction: -1 | 1, onDone: () => void) => {
      if (animating.current) return
      animating.current = true
      Animated.timing(translateX, {
        toValue: direction * SWIPE_OFFSCREEN,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        onDone()
        translateX.setValue(direction * -SWIPE_OFFSCREEN)
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 90,
          friction: 11,
        }).start(() => {
          animating.current = false
        })
      })
    },
    [translateX],
  )

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          !animating.current &&
          Math.abs(g.dx) > Math.abs(g.dy) &&
          Math.abs(g.dx) > 10,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !animating.current &&
          Math.abs(g.dx) > Math.abs(g.dy) &&
          Math.abs(g.dx) > 10,
        onPanResponderMove: (_, g) => {
          translateX.setValue(g.dx)
        },
        onPanResponderRelease: (_, g) => {
          if (animating.current) return
          const goNext =
            g.dx < -SWIPE_THRESHOLD || (g.vx < -0.45 && g.dx < 0)
          const goPrev =
            g.dx > SWIPE_THRESHOLD || (g.vx > 0.45 && g.dx > 0)

          if (goNext) {
            animateSwipe(-1, onSwipeLeft)
            return
          }
          if (goPrev) {
            animateSwipe(1, onSwipeRight)
            return
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 12,
          }).start()
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 12,
          }).start()
        },
      }),
    [animateSwipe, onSwipeLeft, onSwipeRight, translateX],
  )

  const rotateZ = translateX.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: ["-10deg", "0deg", "10deg"],
  })

  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "180deg"],
  })

  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["180deg", "270deg", "360deg"],
  })

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.48, 0.52, 1],
    outputRange: [1, 1, 0, 0],
  })

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.48, 0.52, 1],
    outputRange: [0, 0, 1, 1],
  })

  return (
    <View style={styles.wrap}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.cardOuter,
          {
            transform: [{ translateX }, { rotate: rotateZ }],
          },
        ]}
      >
        <Pressable onPress={toggleFlip} style={styles.pressArea}>
          <View style={styles.card3d}>
            <Animated.View
              style={[
                styles.face,
                {
                  opacity: frontOpacity,
                  transform: [{ perspective: 1200 }, { rotateY: frontRotateY }],
                },
              ]}
            >
              <View style={styles.faceContent}>{front}</View>
            </Animated.View>
            <Animated.View
              style={[
                styles.face,
                styles.faceBack,
                {
                  opacity: backOpacity,
                  transform: [{ perspective: 1200 }, { rotateY: backRotateY }],
                },
              ]}
            >
              <View style={styles.faceContent}>{back}</View>
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
      <Text style={styles.hint}>Swipe ← → · Tap to flip</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
  },
  cardOuter: {
    height: CARD_HEIGHT,
    width: "100%",
  },
  pressArea: {
    flex: 1,
  },
  card3d: {
    height: CARD_HEIGHT,
    width: "100%",
    overflow: "hidden",
  },
  face: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    backfaceVisibility: "hidden",
    backgroundColor: colors.card,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  faceBack: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE",
  },
  faceContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
})

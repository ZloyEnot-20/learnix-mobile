import React, { useEffect, useRef } from "react"
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"

type BottomSheetProps = {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  headerRight?: React.ReactNode
  contentStyle?: StyleProp<ViewStyle>
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  headerRight,
  contentStyle,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets()
  const slide = useRef(new Animated.Value(400)).current
  const backdrop = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start()
      return
    }

    Animated.parallel([
      Animated.timing(slide, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }, [visible, slide, backdrop])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdrop }]}
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            shadow.sheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={styles.handle} />
          {(title || headerRight) && (
            <View style={styles.header}>
              {title ? <Text style={styles.title}>{title}</Text> : <View />}
              {headerRight}
            </View>
          )}
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
  title: { ...typography.h3, color: colors.text },
  content: { flexGrow: 0 },
})

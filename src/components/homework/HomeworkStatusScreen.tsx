import React from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"

interface HomeworkStatusScreenProps {
  code: string
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  iconBg: string
  title: string
  description: string
  buttonLabel: string
  onButtonPress: () => void
  style?: StyleProp<ViewStyle>
}

export function HomeworkStatusScreen({
  code,
  icon,
  iconColor,
  iconBg,
  title,
  description,
  buttonLabel,
  onButtonPress,
  style,
}: HomeworkStatusScreenProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.root, style]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.decorWrap} pointerEvents="none">
            <Text style={styles.decorCode}>{code}</Text>
          </View>

          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={32} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={onButtonPress}
          >
            <Text style={styles.btnText}>{buttonLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
  },
  card: {
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    ...shadow.card,
  },
  decorWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  decorCode: {
    fontSize: 140,
    fontWeight: "900",
    letterSpacing: -6,
    color: colors.borderLight,
    lineHeight: 140,
    opacity: 0.55,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  btn: {
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
    ...shadow.card,
  },
  btnPressed: {
    backgroundColor: colors.primaryDark,
    opacity: 0.95,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
})

import React from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { CachedImage } from "./CachedImage"
import { initials } from "../lib/utils"
import { colors } from "../theme/tokens"

type ProfileAvatarProps = {
  name: string
  avatarUrl?: string | null
  size: number
  borderRadius?: number
  style?: ViewStyle
  canUpload?: boolean
  uploading?: boolean
  onPress?: () => void
}

export function ProfileAvatar({
  name,
  avatarUrl,
  size,
  borderRadius,
  style,
  canUpload = false,
  uploading = false,
  onPress,
}: ProfileAvatarProps) {
  const radius = borderRadius ?? size / 2
  const fontSize = Math.max(10, Math.round(size * 0.34))

  const content = (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {avatarUrl ? (
        <CachedImage uri={avatarUrl} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.fallback, { borderRadius: radius }]}>
          <Text style={[styles.fallbackText, { fontSize }]}>{initials(name)}</Text>
        </View>
      )}
      {uploading ? (
        <View style={[styles.overlay, { borderRadius: radius }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
      {canUpload && !uploading ? (
        <View style={styles.badge}>
          <Ionicons name="camera" size={12} color="#fff" />
        </View>
      ) : null}
    </View>
  )

  if (canUpload && onPress) {
    return (
      <Pressable onPress={onPress} disabled={uploading} accessibilityRole="button">
        {content}
      </Pressable>
    )
  }

  return content
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontWeight: "700",
    color: "#fff",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
})

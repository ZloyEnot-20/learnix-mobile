import React from "react"
import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import type { TierId } from "../types/gamification"

interface TierBadgeProps {
  tierId: TierId
  size?: number
  dimmed?: boolean
}

const TIER_ICONS = {
  bronze: require("../../assets/tiers/bronze.png"),
  silver: require("../../assets/tiers/silver.png"),
  gold: require("../../assets/tiers/gold.png"),
  diamond: require("../../assets/tiers/diamond.png"),
  master: require("../../assets/tiers/master.png"),
} as const

export function TierBadge({ tierId, size = 48, dimmed = false }: TierBadgeProps) {
  return (
    <View style={[styles.wrap, dimmed && styles.dimmed]}>
      <Image
        source={TIER_ICONS[tierId]}
        style={{ width: size, height: size }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  dimmed: {
    opacity: 0.65,
  },
})

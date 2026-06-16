import React, { useEffect, useRef } from "react"
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, radius, spacing } from "../theme/tokens"

const PARTICLE_COLORS = ["#F59E0B", "#10B981", "#0EA5E9", "#A855F7", "#F43F5E", "#84CC16"]

interface Particle {
  id: number
  color: string
  startX: number
  startY: number
  endX: number
  endY: number
  size: number
  delay: number
}

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const dist = 80 + Math.random() * 120
    return {
      id: i,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      startX: 0,
      startY: 0,
      endX: Math.cos(angle) * dist,
      endY: Math.sin(angle) * dist - 40,
      size: 6 + Math.random() * 6,
      delay: Math.random() * 120,
    }
  })
}

interface WordMasteredCelebrationProps {
  visible: boolean
  word: string
  onDismiss: () => void
}

export function WordMasteredCelebration({
  visible,
  word,
  onDismiss,
}: WordMasteredCelebrationProps) {
  const scale = useRef(new Animated.Value(0.6)).current
  const opacity = useRef(new Animated.Value(0)).current
  const particles = useRef(buildParticles(18)).current
  const particleAnims = useRef(particles.map(() => new Animated.Value(0))).current

  useEffect(() => {
    if (!visible) return

    scale.setValue(0.6)
    opacity.setValue(0)
    particleAnims.forEach((a) => a.setValue(0))

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      ...particleAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(particles[i].delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start()
  }, [visible, scale, opacity, particleAnims, particles])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={styles.burstArea}>
            {particles.map((p, i) => {
              const anim = particleAnims[i]
              const tx = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [p.startX, p.endX],
              })
              const ty = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [p.startY, p.endY],
              })
              const pOpacity = anim.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0],
              })
              return (
                <Animated.View
                  key={p.id}
                  style={[
                    styles.particle,
                    {
                      backgroundColor: p.color,
                      width: p.size,
                      height: p.size,
                      borderRadius: p.size / 2,
                      opacity: pOpacity,
                      transform: [{ translateX: tx }, { translateY: ty }],
                    },
                  ]}
                />
              )
            })}
            <View style={styles.iconWrap}>
              <Ionicons name="sparkles" size={36} color="#F59E0B" />
            </View>
          </View>
          <Text style={styles.title}>Word mastered!</Text>
          <Text style={styles.word}>{word}</Text>
          <Text style={styles.subtitle}>You learned this word — great job!</Text>
          <Pressable style={styles.btn} onPress={onDismiss}>
            <Text style={styles.btnText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: "center",
  },
  burstArea: {
    width: 200,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  particle: {
    position: "absolute",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  word: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primary,
    marginTop: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignSelf: "stretch",
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
})

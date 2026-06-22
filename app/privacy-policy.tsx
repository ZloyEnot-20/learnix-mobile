import React from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { BackButton } from "../src/components/ui/BackButton"
import { colors, radius, spacing, typography } from "../src/theme/tokens"

const SECTIONS = [
  {
    title: "Information We Collect",
    body:
      "Learnix collects information you provide when using the app, including your name, email, login credentials, learning progress, test results, homework submissions, and optional profile photo. We also store audio recordings you submit for speaking exercises.",
  },
  {
    title: "How We Use Your Information",
    body:
      "Your data is used to deliver lessons, track progress, show leaderboards, assign homework, and improve the learning experience. Teachers and school administrators associated with your account may view your academic activity.",
  },
  {
    title: "Data Storage & Security",
    body:
      "Data is transmitted over secure connections and stored on our servers. We take reasonable measures to protect your information, but no method of transmission or storage is completely secure.",
  },
  {
    title: "Sharing",
    body:
      "We do not sell your personal data. Information may be shared with your school, teachers, and service providers who help us operate the platform, only as needed to provide the service.",
  },
  {
    title: "Your Rights",
    body:
      "You may request access to, correction of, or deletion of your personal data by contacting your school administrator or Learnix support.",
  },
  {
    title: "Children",
    body:
      "Learnix is intended for use by students under the supervision of educational institutions. Schools are responsible for obtaining any required parental consent.",
  },
  {
    title: "Changes",
    body:
      "We may update this Privacy Policy from time to time. Continued use of the app after changes are published means you accept the updated policy.",
  },
  {
    title: "Contact",
    body:
      "For privacy-related questions, contact your teacher or school administrator.",
  },
] as const

export default function PrivacyPolicyScreen() {
  const router = useRouter()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <BackButton onPress={() => router.back()} />
          </View>
          <Text style={styles.title}>Privacy Policy</Text>
          <View style={styles.topBarSide} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.updated}>Last updated: June 19, 2026</Text>
          <Text style={styles.intro}>
            Learnix (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This
            policy explains what information we collect, how we use it, and your choices.
          </Text>

          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
  topBarSide: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  updated: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
})

/** Design tokens — light-first mobile UI */

export const colors = {
  primary: "#3B82F6",
  primaryDark: "#2563EB",
  primaryLight: "#EFF6FF",
  brand: "#01AEF9",
  background: "#F8F9FB",
  card: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  success: "#10B981",
  successBg: "#D1FAE5",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  error: "#EF4444",
  errorBg: "#FEE2E2",
  indigo: "#6366F1",
  overlay: "rgba(17, 24, 39, 0.45)",
}

export const darkColors = {
  primary: "#3B82F6",
  primaryDark: "#2563EB",
  primaryLight: "#1E3A5F",
  brand: "#01AEF9",
  background: "#151922",
  card: "#1C2230",
  text: "#F9FAFB",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  border: "#2A3142",
  borderLight: "#232936",
  success: "#34D399",
  successBg: "#064E3B",
  warning: "#FBBF24",
  warningBg: "#78350F",
  error: "#F87171",
  errorBg: "#7F1D1D",
  indigo: "#818CF8",
  overlay: "rgba(0, 0, 0, 0.6)",
}

export const radius = {
  button: 12,
  input: 12,
  card: 16,
  sheet: 20,
  sm: 8,
  pill: 999,
}

export const spacing = {
  screen: 20,
  section: 16,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
}

export const typography = {
  h1: { fontSize: 32, fontWeight: "700" as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: "700" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600" as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16 },
}

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sheet: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
}

export const animation = {
  fadeInDownDuration: 500,
  fadeInDownStagger: 100,
}

export const subjectColors: Record<string, string> = {
  reading: "#93C5FD",
  listening: "#FCD34D",
  writing: "#86EFAC",
  speaking: "#7DD3FC",
  grammar: "#FDBA74",
  vocabulary: "#C4B5FD",
}

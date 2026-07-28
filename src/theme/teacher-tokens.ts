/** Teacher UI accent palette — aligned with student app blues */

import type { Subject } from "../types/domain"
import { colors } from "./tokens"

export const teacherColors = {
  accent: colors.primary,
  accentDark: colors.primaryDark,
  accentLight: colors.primaryLight,
  accentMuted: "#BFDBFE",
  navy: "#1E293B",
  purple: "#8B5CF6",
  purpleBg: "#EDE9FE",
  green: "#22C55E",
  greenBg: "#DCFCE7",
  greenDark: "#15803D",
  orange: "#F97316",
  orangeBg: "#FFEDD5",
  red: "#EF4444",
  redBg: "#FEE2E2",
  blue: "#3B82F6",
  blueBg: "#DBEAFE",
  pink: "#EC4899",
  pinkBg: "#FCE7F3",
  slate: "#64748B",
  slateBg: "#F1F5F9",
}

export const teacherShadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  tile: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
}

/** Folder keys in the teacher homework browser (podcast is UI-only; homework uses subject listening). */
export type AssignFolder = Subject | "podcast"

export const ASSIGN_FOLDERS: AssignFolder[] = [
  "grammar",
  "vocabulary",
  "reading",
  "listening",
  "podcast",
  "speaking",
  "writing",
]

export const subjectFolderMeta: Record<
  string,
  { label: string; icon: string; bg: string; color: string }
> = {
  grammar: { label: "Grammar", icon: "school", bg: "#FFEDD5", color: "#EA580C" },
  vocabulary: { label: "Vocabulary", icon: "library", bg: "#EDE9FE", color: "#7C3AED" },
  reading: { label: "Reading", icon: "book", bg: "#DBEAFE", color: "#2563EB" },
  listening: { label: "Listening", icon: "headset", bg: "#FEF9C3", color: "#CA8A04" },
  podcast: { label: "Podcasts", icon: "radio", bg: "#E0E7FF", color: "#4F46E5" },
  speaking: { label: "Speaking", icon: "mic", bg: "#CFFAFE", color: "#0891B2" },
  writing: { label: "Writing", icon: "create", bg: "#DCFCE7", color: "#16A34A" },
}

export const assignLevelMeta: Record<
  string,
  { label: string; icon: string; bg: string; color: string }
> = {
  IELTS: { label: "IELTS", icon: "ribbon-outline", bg: "#FEF9C3", color: "#CA8A04" },
  A1: { label: "A1", icon: "leaf-outline", bg: "#DCFCE7", color: "#15803D" },
  A2: { label: "A2", icon: "rose-outline", bg: "#D1FAE5", color: "#047857" },
  B1: { label: "B1", icon: "flash-outline", bg: "#DBEAFE", color: "#1D4ED8" },
  B2: { label: "B2", icon: "rocket-outline", bg: "#EDE9FE", color: "#6D28D9" },
  C1: { label: "C1", icon: "trophy-outline", bg: "#FFEDD5", color: "#C2410C" },
  C2: { label: "C2", icon: "diamond-outline", bg: "#FEE2E2", color: "#B91C1C" },
}

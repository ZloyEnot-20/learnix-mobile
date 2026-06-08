export interface StudentLevel {
  totalPoints: number
  level: number
  tier: TierId
  tierLabel: string
  levelName: string
  pointsIntoLevel: number
  pointsForNextLevel: number
  pointsToNextLevel: number
  breakdown: {
    homeworkPoints: number
    exercisePoints: number
    completedHomework: number
  }
  requirements: Record<string, number>
  unlockedCefrLevels: string[]
}

export type TierId = "bronze" | "silver" | "gold" | "diamond" | "master"

export interface TierMeta {
  id: TierId
  label: string
  minLevel: number
  maxLevel: number
  color: string
  barColor: string
  tagline: string
  description: string
  perks: string[]
}

export const TIERS: TierMeta[] = [
  {
    id: "bronze",
    label: "Bronze",
    minLevel: 1,
    maxLevel: 5,
    color: "#D97706",
    barColor: "#F59E0B",
    tagline: "Your journey begins",
    description: "Every great path starts with a first step.",
    perks: ["A1 & A2 levels unlocked", "Daily practice", "First achievements"],
  },
  {
    id: "silver",
    label: "Silver",
    minLevel: 6,
    maxLevel: 10,
    color: "#64748B",
    barColor: "#94A3B8",
    tagline: "Picking up pace",
    description: "Your knowledge is taking serious shape.",
    perks: ["B1 level unlocked", "Harder exercises", "Silver badge"],
  },
  {
    id: "gold",
    label: "Gold",
    minLevel: 11,
    maxLevel: 20,
    color: "#CA8A04",
    barColor: "#EAB308",
    tagline: "Among the best",
    description: "Gold is the fruit of effort and consistency.",
    perks: ["B2 level unlocked", "Advanced grammar", "Gold badge"],
  },
  {
    id: "diamond",
    label: "Diamond",
    minLevel: 21,
    maxLevel: 30,
    color: "#0891B2",
    barColor: "#06B6D4",
    tagline: "Rare and valuable",
    description: "Your discipline and knowledge are your true worth.",
    perks: ["C1 level unlocked", "IELTS-level materials", "Diamond badge"],
  },
  {
    id: "master",
    label: "Master",
    minLevel: 31,
    maxLevel: Number.POSITIVE_INFINITY,
    color: "#A855F7",
    barColor: "#C084FC",
    tagline: "Legendary tier",
    description: "The highest peak — a true Master.",
    perks: ["All levels open", "C2 exclusive content", "Master badge"],
  },
]

export function tierForLevel(level: number): TierMeta {
  return TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel) ?? TIERS[0]
}

export const CEFR_LEVEL_REQUIREMENT: Record<string, number> = {
  A1: 1,
  A2: 3,
  B1: 6,
  B2: 11,
  C1: 16,
  C2: 21,
}

export function isCefrUnlocked(cefr: string, level: number): boolean {
  const required = CEFR_LEVEL_REQUIREMENT[cefr] ?? 1
  return level >= required
}

export function requiredLevelFor(cefr: string): number {
  return CEFR_LEVEL_REQUIREMENT[cefr] ?? 1
}

export const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

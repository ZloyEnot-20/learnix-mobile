import type { AuthUser } from "./api"

export const GUEST_USER_ID = "guest"
export const GUEST_LEVELS = ["A1", "A2"] as const
export const GUEST_MATERIALS_PER_LEVEL = 5

export function isGuestUser(user: AuthUser | null | undefined): boolean {
  return user?.type === "guest"
}

export function isStudentUser(user: AuthUser | null | undefined): boolean {
  return user?.type === "student"
}

export function isAppUser(user: AuthUser | null | undefined): boolean {
  return isStudentUser(user) || isGuestUser(user)
}

export function filterGuestLevels<T extends { key: string }>(levels: T[]): T[] {
  return levels.filter((level) => GUEST_LEVELS.includes(level.key as (typeof GUEST_LEVELS)[number]))
}

export function limitGuestMaterials<T>(items: T[]): T[] {
  return items.slice(0, GUEST_MATERIALS_PER_LEVEL)
}

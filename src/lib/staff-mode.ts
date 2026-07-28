import AsyncStorage from "@react-native-async-storage/async-storage"
import type { AuthUser } from "./api"

export type StaffMode = "teacher" | "admin"

const STORAGE_KEY = "learnix_staff_mode"

export function canSwitchStaffMode(user: AuthUser | null | undefined): boolean {
  return user?.type === "admin" || user?.type === "super_admin"
}

export function staffModeLabel(mode: StaffMode): string {
  return mode === "admin" ? "Admin" : "Teacher"
}

export async function getStaffMode(): Promise<StaffMode> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return raw === "admin" ? "admin" : "teacher"
  } catch {
    return "teacher"
  }
}

export async function setStaffMode(mode: StaffMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode)
}

export async function clearStaffMode(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

export async function staffHomeRoute(user: AuthUser | null | undefined): Promise<"/(teacher)" | "/(admin)"> {
  if (!canSwitchStaffMode(user)) return "/(teacher)"
  const mode = await getStaffMode()
  return mode === "admin" ? "/(admin)" : "/(teacher)"
}

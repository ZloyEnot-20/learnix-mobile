import type { NotificationItem } from "./api"

/** Home banner card background by notification type. */
export const NOTIFICATION_BANNER_COLORS: Record<NotificationItem["type"], string> = {
  reminder: "#FBBF24",
  achievement: "#34D399",
  system: "#38BDF8",
  homework: "#C4B5FD",
  result: "#34D399",
  entry_test: "#FDA4AF",
}

export function getNotificationBannerColor(type: NotificationItem["type"]): string {
  return NOTIFICATION_BANNER_COLORS[type] ?? NOTIFICATION_BANNER_COLORS.system
}

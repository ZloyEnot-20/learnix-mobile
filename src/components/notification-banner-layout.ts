import { PixelRatio } from "react-native"
import { spacing } from "../theme/tokens"

export const NOTIFICATION_CARD_HEIGHT = 80
export const NOTIFICATION_STACK_PEEK_LAYERS = 2
export const NOTIFICATION_STACK_OFFSET = 7
export const NOTIFICATION_BELL_WRAP_SIZE = 44

/** Conservative fallback before onLayout; not used as a hard cap. */
export const NOTIFICATION_TITLE_BLOCK_MIN = NOTIFICATION_BELL_WRAP_SIZE + spacing.sm
export const NOTIFICATION_STACK_MIN_HEIGHT =
  NOTIFICATION_CARD_HEIGHT + NOTIFICATION_STACK_PEEK_LAYERS * NOTIFICATION_STACK_OFFSET
export const NOTIFICATION_SECTION_MIN_HEIGHT =
  NOTIFICATION_TITLE_BLOCK_MIN + NOTIFICATION_STACK_MIN_HEIGHT

/** Buffer inside the section for stack peek and swipe rotation. */
export const NOTIFICATION_SECTION_EXTRA_GAP = spacing.md

/** Space reserved below the banner before the next home section. */
export const NOTIFICATION_BANNER_BOTTOM_GAP = spacing.lg

export function getNotificationBannerReservedHeight(measuredContentHeight?: number): number {
  const fontScale = PixelRatio.getFontScale()
  const scaledMin = Math.ceil(NOTIFICATION_SECTION_MIN_HEIGHT * Math.max(1, fontScale))
  const content = measuredContentHeight ?? scaledMin
  return content + NOTIFICATION_SECTION_EXTRA_GAP
}

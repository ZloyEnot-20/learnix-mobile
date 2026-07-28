import React, { useCallback, useEffect, useState } from "react"
import { InteractionManager, StyleSheet, Text, View } from "react-native"
import { TeacherHomeGroupCards } from "../teacher/TeacherHomeGroupCards"
import {
  TeacherGroupInfoModal,
  type TeacherGroupInfo,
} from "../teacher/TeacherGroupInfoModal"
import { useAdminGroupProgress } from "../../hooks/useAdminGroupProgress"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { Skeleton } from "../ui/Skeleton"
import { GROUP_CARD_SIZE } from "../teacher/TeacherHomeGroupCards"

type AdminGroupProgressSectionProps = {
  title?: string
  groupIds?: string[]
  embedded?: boolean
  bleed?: boolean
  onModalVisibilityChange?: (visible: boolean) => void
}

export function AdminGroupCardsSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <View style={[styles.skeletonRow, embedded && styles.skeletonRowEmbedded]}>
      {[0, 1, 2].map((i) => (
        <Skeleton
          key={i}
          width={GROUP_CARD_SIZE}
          height={GROUP_CARD_SIZE}
          borderRadius={radius.card}
        />
      ))}
    </View>
  )
}

export function AdminGroupProgressSection({
  title = "Groups",
  groupIds,
  embedded = false,
  bleed = true,
  onModalVisibilityChange,
}: AdminGroupProgressSectionProps) {
  const { loading, groupCards, load, enrichGroup } = useAdminGroupProgress(groupIds)
  const [selectedGroup, setSelectedGroup] = useState<TeacherGroupInfo | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  const openGroup = useCallback(
    (group: TeacherGroupInfo) => {
      onModalVisibilityChange?.(true)
      setSelectedGroup(group)
      InteractionManager.runAfterInteractions(() => {
        setSelectedGroup((current) => {
          if (!current || current.id !== group.id) return current
          return enrichGroup(group)
        })
      })
    },
    [enrichGroup, onModalVisibilityChange],
  )

  const closeGroup = useCallback(() => {
    setSelectedGroup(null)
    onModalVisibilityChange?.(false)
  }, [onModalVisibilityChange])

  return (
    <>
      {title ? <Text style={[styles.title, bleed && styles.titleBleed]}>{title}</Text> : null}
      {loading ? (
        <AdminGroupCardsSkeleton embedded={embedded} />
      ) : (
        <TeacherHomeGroupCards
          groups={groupCards}
          onPress={openGroup}
          embedded={embedded}
        />
      )}

      <TeacherGroupInfoModal
        visible={selectedGroup != null}
        group={selectedGroup}
        onClose={closeGroup}
        onOpenGroup={() => {}}
        onAssignHomework={() => {}}
        readOnly
      />
    </>
  )
}

const styles = StyleSheet.create({
  title: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  titleBleed: { marginLeft: 0 },
  skeletonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    marginHorizontal: -spacing.screen,
  },
  skeletonRowEmbedded: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
})

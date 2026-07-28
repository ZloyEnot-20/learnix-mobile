import React, { useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { BottomSheet } from "../ui/BottomSheet"
import { Skeleton } from "../ui/Skeleton"
import {
  loadMaterialPreview,
  type MaterialPreview,
} from "../../lib/teacher-material-preview"
import type { TeacherMaterialOption } from "../../lib/teacher-materials"
import { subjectFolderMeta, teacherColors } from "../../theme/teacher-tokens"
import { colors, radius, spacing, typography } from "../../theme/tokens"

type TeacherMaterialPreviewModalProps = {
  visible: boolean
  material: TeacherMaterialOption | null
  onClose: () => void
}

function PreviewSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <Skeleton width="75%" height={18} />
      <Skeleton width="45%" height={12} style={styles.skeletonGap} />
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={styles.skeletonLine}>
          <Skeleton width={22} height={22} borderRadius={11} />
          <View style={styles.skeletonLineBody}>
            <Skeleton width="90%" height={13} />
            <Skeleton width="55%" height={11} style={styles.skeletonGapSm} />
          </View>
        </View>
      ))}
    </View>
  )
}

export function TeacherMaterialPreviewModal({
  visible,
  material,
  onClose,
}: TeacherMaterialPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<MaterialPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible || !material) {
      setPreview(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setPreview(null)
    setError(null)

    loadMaterialPreview(material)
      .then((result) => {
        if (!cancelled) setPreview(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load preview")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [visible, material])

  const folderMeta = material ? subjectFolderMeta[material.folder] : null

  return (
    <BottomSheet
      visible={visible && material != null}
      onClose={onClose}
      title="Test preview"
      showCloseButton
      contentStyle={styles.sheetContent}
    >
      {loading ? (
        <PreviewSkeleton />
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : preview ? (
        <>
          <View style={styles.headerCard}>
            <Text style={styles.previewTitle}>{preview.title}</Text>
            <Text style={styles.previewSubtitle}>{preview.subtitle}</Text>
            {folderMeta ? (
              <Text style={styles.previewFolder}>{folderMeta.label}</Text>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Questions & content</Text>
          <ScrollView
            style={styles.linesScroll}
            contentContainerStyle={styles.linesContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {preview.lines.length === 0 ? (
              <Text style={styles.emptyText}>No preview content available</Text>
            ) : (
              preview.lines.map((line) => (
                <View key={`${line.index}-${line.text.slice(0, 24)}`} style={styles.lineRow}>
                  {line.index > 0 ? (
                    <View style={styles.lineIndex}>
                      <Text style={styles.lineIndexText}>{line.index}</Text>
                    </View>
                  ) : (
                    <View style={styles.lineIndexSpacer} />
                  )}
                  <View style={styles.lineBody}>
                    <Text style={styles.lineText}>{line.text}</Text>
                    {line.meta ? <Text style={styles.lineMeta}>{line.meta}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </>
      ) : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
    maxHeight: 520,
  },
  skeletonWrap: { paddingVertical: spacing.xs },
  skeletonGap: { marginTop: spacing.sm, marginBottom: spacing.lg },
  skeletonGapSm: { marginTop: spacing.xs },
  skeletonLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  skeletonLineBody: { flex: 1, minWidth: 0 },
  headerCard: {
    backgroundColor: teacherColors.accentLight,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: teacherColors.accentMuted,
  },
  previewTitle: { ...typography.label, color: colors.text, fontSize: 16 },
  previewSubtitle: {
    ...typography.caption,
    color: teacherColors.accentDark,
    marginTop: 4,
  },
  previewFolder: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  linesScroll: { maxHeight: 340 },
  linesContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
  },
  lineIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: teacherColors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  lineIndexSpacer: { width: 24 },
  lineIndexText: {
    ...typography.caption,
    color: teacherColors.accentDark,
    fontWeight: "800",
    fontSize: 11,
  },
  lineBody: { flex: 1, minWidth: 0 },
  lineText: { ...typography.bodySm, color: colors.text },
  lineMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: "center", padding: spacing.lg },
  errorCard: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { ...typography.bodySm, color: colors.error },
})

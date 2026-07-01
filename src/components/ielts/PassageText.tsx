import React from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { decodeReadingText } from "../../lib/ielts-reading"
import { colors, radius, spacing } from "../../theme/tokens"

const PASSAGE_LETTER_LINE = /^([A-Z])\.?$/
const LIST_ITEM_LINE = /^(?:\(?[ivxlcdm]+\)|[ivxlcdm]+\)|[A-Z]\.|[•●-])\s+/i
const SECTION_HEADING = /^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\)\s+/i

function passageMarkerLetter(line: string): string | null {
  const m = line.trim().match(PASSAGE_LETTER_LINE)
  return m ? m[1] : null
}

function normalizePassageSource(text: string): string {
  return decodeReadingText(text)
    .replace(/\r\n/g, "\n")
    .replace(/\n(\d+)\n/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim()
}

function shouldJoinLines(prev: string, next: string): boolean {
  const prevTrim = prev.trim()
  const nextTrim = next.trim()
  if (!prevTrim || !nextTrim) return false
  if (passageMarkerLetter(nextTrim) || LIST_ITEM_LINE.test(nextTrim) || SECTION_HEADING.test(nextTrim)) {
    return false
  }
  if (/[.!?]["')\]]?$/.test(prevTrim) && /^[A-Z("'«]/.test(nextTrim)) return false
  if (/[,;:]$/.test(prevTrim)) return true
  if (/^[a-z(]/.test(nextTrim)) return true
  if (prevTrim.endsWith("-")) return true
  return prevTrim.length < 72
}

function joinBrokenLines(lines: string[]): string[] {
  const paragraphs: string[] = []
  let current = ""

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (current) {
        paragraphs.push(current.trim())
        current = ""
      }
      continue
    }

    if (!current) {
      current = line
      continue
    }

    if (shouldJoinLines(current, line)) {
      current = `${current.replace(/-\s*$/, "")} ${line}`.replace(/\s{2,}/g, " ")
    } else {
      paragraphs.push(current.trim())
      current = line
    }
  }

  if (current) paragraphs.push(current.trim())
  return paragraphs
}

function splitPassageParagraphs(text: string): string[] {
  const normalized = normalizePassageSource(text)
  if (!normalized) return []

  const blocks = normalized.split(/\n{2,}/)
  return blocks.flatMap((block) => joinBrokenLines(block.split("\n"))).filter(Boolean)
}

function PassageMarker({ letter }: { letter: string }) {
  return (
    <View style={styles.marker} accessibilityLabel={`Passage ${letter}`}>
      <Text style={styles.markerText}>{letter}</Text>
    </View>
  )
}

function PassageSection({ letter, body }: { letter: string; body: string }) {
  const paragraphs = splitPassageParagraphs(body)
  return (
    <View style={styles.section}>
      <PassageMarker letter={letter} />
      <View style={styles.sectionBodyWrap}>
        {paragraphs.map((paragraph, index) => (
          <Text key={`${letter}-${index}`} style={styles.sectionBody}>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  )
}

export function PassageText({ text }: { text: string }) {
  const lines = normalizePassageSource(text).split("\n")
  const nodes: React.ReactNode[] = []
  let buffer: string[] = []
  let nodeKey = 0

  const flushBuffer = () => {
    const chunk = buffer.join("\n").trim()
    if (chunk) {
      const paragraphs = splitPassageParagraphs(chunk)
      for (const paragraph of paragraphs) {
        nodes.push(
          <Text key={`p-${nodeKey++}`} style={styles.paragraph}>
            {paragraph}
          </Text>,
        )
      }
    }
    buffer = []
  }

  let i = 0
  while (i < lines.length) {
    const letter = passageMarkerLetter(lines[i])
    if (letter) {
      flushBuffer()
      i += 1
      const bodyLines: string[] = []
      while (i < lines.length && !passageMarkerLetter(lines[i])) {
        bodyLines.push(lines[i])
        i += 1
      }
      const body = bodyLines.join("\n").trim()
      nodes.push(<PassageSection key={`s-${nodeKey++}`} letter={letter} body={body} />)
    } else {
      buffer.push(lines[i])
      i += 1
    }
  }
  flushBuffer()

  if (nodes.length === 0) {
    const paragraphs = splitPassageParagraphs(text)
    if (paragraphs.length === 0) {
      return <Text style={styles.paragraph}>{decodeReadingText(text)}</Text>
    }
    return (
      <View style={styles.root}>
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>
    )
  }

  return <View style={styles.root}>{nodes}</View>
}

const passageFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: undefined,
})

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 27,
    color: "#1F2937",
    fontFamily: passageFont,
    letterSpacing: 0.15,
  },
  section: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  markerText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  sectionBodyWrap: {
    flex: 1,
    gap: spacing.md,
  },
  sectionBody: {
    fontSize: 16,
    lineHeight: 27,
    color: "#1F2937",
    fontFamily: passageFont,
    letterSpacing: 0.15,
  },
})

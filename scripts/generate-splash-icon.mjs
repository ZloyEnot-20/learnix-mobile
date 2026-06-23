import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.join(__dirname, "..", "assets")
const sourcePath = path.join(assetsDir, "icon.png")
const outputPath = path.join(assetsDir, "splash-icon.png")

const CANVAS = 1024
const ICON_SIZE = 896
const CORNER_RADIUS = Math.round(ICON_SIZE * 0.2237)
const OFFSET = Math.round((CANVAS - ICON_SIZE) / 2)

const source = sharp(sourcePath)
const icon = await source
  .resize(ICON_SIZE, ICON_SIZE, { fit: "cover" })
  .png()
  .toBuffer()

const roundedMask = Buffer.from(
  `<svg width="${ICON_SIZE}" height="${ICON_SIZE}">
    <rect x="0" y="0" width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="white"/>
  </svg>`
)

const roundedIcon = await sharp(icon)
  .composite([{ input: roundedMask, blend: "dest-in" }])
  .png()
  .toBuffer()

const shadow = await sharp({
  create: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    channels: 4,
    background: { r: 15, g: 23, b: 42, alpha: 0.14 },
  },
})
  .png()
  .composite([{ input: roundedMask, blend: "dest-in" }])
  .blur(18)
  .toBuffer()

await sharp({
  create: {
    width: CANVAS,
    height: CANVAS,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: shadow, left: OFFSET, top: OFFSET + 14 },
    { input: roundedIcon, left: OFFSET, top: OFFSET },
  ])
  .png()
  .toFile(outputPath)

console.log(`Generated ${outputPath} (${ICON_SIZE}px icon, ${CORNER_RADIUS}px radius)`)

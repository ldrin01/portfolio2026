import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'

const files = [
  'public/pictures/ezgif-optimized.webp',
  'public/pictures/screenshot-2026-11-01-at-10-41-47-am.webp',
  'public/pictures/1719123393161.webp',
]
const LIMIT = 100 * 1024
const kb = (n) => Math.round(n / 1024) + 'KB'

for (const file of files) {
  const input = await readFile(file)
  const meta = await sharp(input, { animated: true }).metadata()
  const animated = (meta.pages ?? 1) > 1
  const widths = animated ? [800, 640, 520, 420] : [1200, 1000]
  const qualities = animated ? [70, 60, 50] : [72, 62]
  let best = null

  search: for (const w of widths) {
    for (const q of qualities) {
      const buf = await sharp(input, { animated: true })
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: q, effort: 6, smartSubsample: true })
        .toBuffer()
      if (!best || buf.length < best.length) best = buf
      if (buf.length <= LIMIT) { best = buf; break search }
    }
  }

  const note = `${meta.width}px${animated ? `, ${meta.pages} frames` : ''}`
  if (best && best.length < input.length) {
    await writeFile(file, best)
    console.log(`${file} (${note}): ${kb(input.length)} → ${kb(best.length)}${best.length > LIMIT ? '  ⚠ still over 100KB' : ''}`)
  } else {
    console.log(`${file} (${note}): ${kb(input.length)} kept, no smaller version found`)
  }
}

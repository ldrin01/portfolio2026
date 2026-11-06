import sharp from 'sharp'
import { readFile, writeFile, access } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const OUT = 'public/pictures/ezgif-optimized.webp'
const BACKUP = join(homedir(), 'Desktop/pictures-backup/ezgif-optimized.webp')
const TARGET = Number(process.argv[2] ?? 150) * 1024
const kb = (n) => Math.round(n / 1024) + 'KB'

const src = await access(BACKUP).then(() => BACKUP, () => OUT)
const input = await readFile(src)
const meta = await sharp(input, { animated: true }).metadata()
console.log(`source: ${src} (${kb(input.length)}, ${meta.width}px, ${meta.pages ?? 1} frames)`)

let best = null
search: for (const w of [480, 420, 360, 320, 280, 240]) {
  for (const q of [55, 48, 40, 34]) {
    const buf = await sharp(input, { animated: true })
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: q, effort: 6, smartSubsample: true })
      .toBuffer()
    if (!best || buf.length < best.buf.length) best = { buf, w, q }
    if (buf.length <= TARGET) { best = { buf, w, q }; break search }
  }
}
await writeFile(OUT, best.buf)
console.log(`result: ${kb(best.buf.length)} at ${best.w}px, quality ${best.q}${best.buf.length > TARGET ? '  ⚠ still over target' : ''}`)

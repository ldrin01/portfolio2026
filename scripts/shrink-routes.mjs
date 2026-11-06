import sharp from 'sharp'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const dir = process.argv[2] ?? 'public/pictures/about/routes'
let before = 0, after = 0

for (const f of await readdir(dir)) {
  if (!f.endsWith('.webp')) continue
  const p = join(dir, f)
  const input = await readFile(p)
  const buf = await sharp(input)
    .resize({ width: 320, withoutEnlargement: true })
    .webp({ quality: 10, alphaQuality: 70, effort: 6, smartSubsample: true })
    .toBuffer()
  before += input.length
  if (buf.length < input.length) { await writeFile(p, buf); after += buf.length } else after += input.length
}
console.log(`routes: ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB`)

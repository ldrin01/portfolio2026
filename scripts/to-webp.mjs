import sharp from 'sharp'
import { readdir, readFile } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'

const [dir, ...flags] = process.argv.slice(2)
const num = (f) => { const i = flags.indexOf(f); return i > -1 ? Number(flags[i + 1]) : undefined }
const lossless = flags.includes('--lossless')
const width = num('--width'), height = num('--height'), quality = num('--q') ?? 80

for (const f of await readdir(dir)) {
  if (!/\.(png|jpe?g|webp)$/i.test(f)) continue
  const input = await readFile(join(dir, f))
  let img = sharp(input)
  if (width || height) img = img.resize({ width, height, fit: 'inside', withoutEnlargement: true })
  const out = join(dir, basename(f, extname(f)) + '.webp')
  const info = await img
    .webp(lossless ? { lossless: true, effort: 6 } : { quality, alphaQuality: 100, effort: 5 })
    .toFile(out)
  console.log(f, '→', Math.round(info.size / 1024) + 'KB')
}

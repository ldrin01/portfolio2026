// Re-make every article cover light: main picture (16:9, WebP, about 120 KB) plus its thumb (640 wide, about 25 KB).
// Same rules as the admin upload (layers/admin/server/utils/covers.ts).
//   node tools/covers-optimize.mjs                 re-encode public/covers/*.webp in place
//   node tools/covers-optimize.mjs <sourceDir>      use <slug>.png / <slug>.webp from sourceDir as the originals
import { readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'covers')
const SRC = process.argv[2]
const MAIN_MAX = 120 * 1024, THUMB_MAX = 25 * 1024

async function main(input) {
  let buf
  for (const w of [1600, 1440, 1280]) for (let q = 80; q >= 50; q -= 6) {
    buf = await sharp(input).rotate().resize({ width: w, height: Math.round(w * 9 / 16), fit: 'cover' }).webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer()
    if (buf.length <= MAIN_MAX) return buf
  }
  return buf
}
async function thumb(input) {
  let buf
  for (let q = 62; q >= 30; q -= 6) {
    buf = await sharp(input).resize({ width: 640, height: 360, fit: 'cover' }).webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer()
    if (buf.length <= THUMB_MAX) return buf
  }
  return buf
}

const slugs = (await readdir(DIR)).filter(f => /\.webp$/.test(f) && !/-(480|thumb|thumb-custom)\.webp$/.test(f)).map(f => f.replace(/\.webp$/, ''))
let before = 0, after = 0, thumbs = 0
for (const slug of slugs) {
  const cur = join(DIR, `${slug}.webp`)
  const orig = SRC && existsSync(join(SRC, `${slug}.png`)) ? join(SRC, `${slug}.png`) : cur
  const input = await readFile(orig)
  const m = await main(input), t = await thumb(m)
  before += (await readFile(cur)).length
  await writeFile(cur, m); await writeFile(join(DIR, `${slug}-thumb.webp`), t)
  await rm(join(DIR, `${slug}-480.webp`), { force: true })
  after += m.length; thumbs += t.length
  console.log(slug.padEnd(36), `${(m.length / 1024).toFixed(0)} KB`, `thumb ${(t.length / 1024).toFixed(0)} KB`)
}
console.log(`main ${(before / 1024).toFixed(0)} -> ${(after / 1024).toFixed(0)} KB, thumbs ${(thumbs / 1024).toFixed(0)} KB total`)

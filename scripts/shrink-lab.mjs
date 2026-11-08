import sharp from 'sharp'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

// Recompresses lab JPG/PNG files in place (same name, same format) so no code needs to change.
// Dry run by default. Add --apply to overwrite. Revert anything with: git checkout public/lab
const apply = process.argv.includes('--apply')
const MAX_W = 1600
const kb = n => Math.round(n / 1024) + ' KB'

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(jpe?g|png)$/i.test(e.name) && !/-depth\./i.test(e.name)) yield p
  }
}

let before = 0, after = 0
for await (const f of walk('public/lab')) {
  const input = await readFile(f)
  const isPng = extname(f).toLowerCase() === '.png'
  const img = sharp(input).rotate().resize({ width: MAX_W, withoutEnlargement: true })
  const out = isPng
    ? await img.png({ palette: true, quality: 90, effort: 8, compressionLevel: 9 }).toBuffer()
    : await img.jpeg({ quality: 76, mozjpeg: true }).toBuffer()
  if (out.length >= input.length * 0.9) { console.log(`KEEP    ${f} (${kb(input.length)}), no real saving`); before += input.length; after += input.length; continue }
  console.log(`${apply ? 'DONE   ' : 'WOULD  '} ${f}: ${kb(input.length)} -> ${kb(out.length)}`)
  before += input.length; after += out.length
  if (apply) await writeFile(f, out)
}
console.log(`\n${apply ? 'Saved' : 'Would save'} ${kb(before - after)} (${kb(before)} -> ${kb(after)})`)
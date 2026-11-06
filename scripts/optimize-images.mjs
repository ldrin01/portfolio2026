import sharp from 'sharp'
import { readdir, readFile, writeFile, unlink, stat } from 'node:fs/promises'
import { join, extname, basename, dirname, relative } from 'node:path'

const [root = 'public/pictures', ...flags] = process.argv.slice(2)
const LIMIT = 100 * 1024
const MAX_W = 1600, MIN_W = 640
const del = flags.includes('--delete')
const fix = flags.includes('--fix-refs')
const renamed = []
const kb = (n) => Math.round(n / 1024) + 'KB'

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) yield p
  }
}

async function squeeze(input) {
  const meta = await sharp(input, { animated: true }).metadata()
  let w = Math.min(meta.width, MAX_W), best
  while (true) {
    for (let q = 82; q >= 62; q -= 5) {
      const buf = await sharp(input, { animated: true })
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: q, alphaQuality: 100, effort: 5 })
        .toBuffer()
      if (!best || buf.length < best.length) best = buf
      if (buf.length <= LIMIT) return buf
    }
    if (w <= MIN_W) return best
    w = Math.max(MIN_W, Math.round(w * 0.85))
  }
}

for await (const file of walk(root)) {
  const input = await readFile(file)
  if (extname(file).toLowerCase() === '.webp' && input.length <= LIMIT) continue
  const out = join(dirname(file), basename(file, extname(file)) + '.webp')
  const buf = await squeeze(input)
  await writeFile(out, buf)
  console.log(`${file}: ${kb(input.length)} → ${kb(buf.length)}${buf.length > LIMIT ? '  ⚠ still over 100KB' : ''}`)
  if (out !== file) {
    renamed.push([relative('public', file), relative('public', out)])
    if (del) await unlink(file)
  }
}

async function* walkText(p) {
  let st
  try { st = await stat(p) } catch { return }
  if (st.isDirectory()) { for (const e of await readdir(p)) yield* walkText(join(p, e)) }
  else if (/\.(json|vue|ts|js|md|yml|yaml|css|csv)$/.test(p)) yield p
}

if (fix && renamed.length) {
  const targets = ['content', 'components', 'pages', 'layouts', 'composables', 'app.vue', 'nuxt.config.ts']
  for (const t of targets) for await (const f of walkText(t)) {
    const old = await readFile(f, 'utf8')
    let s = old
    for (const [a, b] of renamed) s = s.split(a).join(b)
    if (s !== old) { await writeFile(f, s); console.log('updated refs in', f) }
  }
}
console.log(`done: ${renamed.length} files renamed to .webp`)

import sharp from 'sharp'
import { readdir, readFile, writeFile, unlink, stat } from 'node:fs/promises'
import { join, extname, basename, relative } from 'node:path'

// Converts leftover PNG/JPG files in public/ to WebP (under ~120 KB), but only the safe ones.
// Default is a dry run. Add --apply to really convert.
const apply = process.argv.includes('--apply')
const MAX_BYTES = 120 * 1024
const MAX_W = 2000
const kb = n => Math.round(n / 1024) + ' KB'
const exists = p => stat(p).then(() => true, () => false)
const SKIP_DIRS = new Set(['node_modules', '.nuxt', '.output', '.git', 'admin'])

async function walk(dir, exts) {
  const out = []
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...await walk(p, exts))
    else if (exts.includes(extname(e.name).toLowerCase())) out.push(p)
  }
  return out
}

async function squeeze(buf) {
  const meta = await sharp(buf).metadata()
  let w = Math.min(meta.width ?? MAX_W, MAX_W), best
  for (;;) {
    for (let q = 82; q >= 62; q -= 5) {
      const out = await sharp(buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: q, alphaQuality: 100, effort: 5 }).toBuffer()
      if (!best || out.length < best.length) best = out
      if (out.length <= MAX_BYTES) return out
    }
    if (w <= 800) return best
    w = Math.max(800, Math.round(w * 0.85))
  }
}

// site code: if any of it mentions a picture by name, that picture must keep its format
const codeRoots = ['app', 'layers', 'server', 'components', 'pages', 'layouts', 'composables', 'plugins', 'assets', 'utils', 'public/lab']
const codeFiles = [
  ...(await Promise.all(codeRoots.map(r => walk(r, ['.vue', '.ts', '.js', '.mjs', '.html', '.css', '.scss'])))).flat(),
  ...(await Promise.all(['nuxt.config.ts', 'app.vue'].map(async f => (await exists(f)) ? f : null))).filter(Boolean)
]
const codeText = await Promise.all(codeFiles.map(f => readFile(f, 'utf8')))
const contentFiles = await walk('content', ['.json', '.md'])
const contentText = await Promise.all(contentFiles.map(f => readFile(f, 'utf8')))

const images = await walk('public', ['.png', '.jpg', '.jpeg'])
let converted = 0
for (const file of images.sort()) {
  const rel = relative('public', file).split('\\').join('/')
  const name = basename(file)
  const newRel = rel.replace(/\.[^.]+$/, '.webp')
  const size = (await stat(file)).size
  const inContent = contentFiles.filter((_, i) => contentText[i].includes(rel))

  let why = ''
  if (/-depth\./i.test(name)) why = 'KEEP   depth map must stay PNG'
  else if (codeText.some(t => t.includes(rel) || t.includes(name))) why = 'KEEP   site code points to it by name'
  else if (await exists(join('public', newRel))) why = 'KEEP   a .webp with that name already exists'
  else if (!inContent.length) why = 'SKIP   not used in content, review by hand'

  if (why) { console.log(`${why.padEnd(8)} ${rel} (${kb(size)})${why.startsWith('KEEP') || why.startsWith('SKIP') ? '' : ''}`); continue }

  if (!apply) { console.log(`CONVERT  ${rel} (${kb(size)}), used in ${inContent.length} content file(s)`); continue }

  const out = await squeeze(await readFile(file))
  await writeFile(join('public', newRel), out)
  for (const f of inContent) await writeFile(f, (await readFile(f, 'utf8')).split(rel).join(newRel))
  await unlink(file)
  converted++
  console.log(`DONE     ${rel} (${kb(size)}) -> ${newRel} (${kb(out.length)}), updated ${inContent.length} content file(s)`)
}
console.log(apply ? `\nConverted ${converted} file(s).` : '\nDry run only. Run again with --apply to convert the CONVERT lines.')
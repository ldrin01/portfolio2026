/* The Works window's logic. mountWorks(root, { mode, onOpenPage, nextSection, data }) wires up the markup in WorksWindow.vue and returns a function that tears it all down again.
   data = { EXT, DATA, EXTRA }, built from content/works.json by WorksWindow.vue (edited in the admin under Pages → Works). */
let EXT = {}, DATA = [], EXTRA = {};
import { motifScene, motifGrid, setModels } from './motifs'
import { mountRedact } from './redact'


/* ============ DEFINITIONS ============ */
const ICONS = {
  all: '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>',
  doc: '<path d="M4 1.5h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z"/><path d="M9 1.5v3h3"/>',
  win: '<rect x="1.5" y="3" width="13" height="10" rx="1.5"/><path d="M1.5 6h13"/>',
  phone: '<rect x="4.5" y="1.5" width="7" height="13" rx="1.5"/><path d="M7 12.5h2"/>',
  bag: '<path d="M3 5h10l-.8 8.5H3.8z"/><path d="M5.5 5V4a2.5 2.5 0 0 1 5 0v1"/>',
  cursor: '<path d="M3 2l9 4.5-3.8 1.3L6.8 12z"/>',
  admin: '<path d="M2 4.5h12M2 8h12M2 11.5h12"/><circle cx="5" cy="4.5" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="6.5" cy="11.5" r="1.3"/>',
  cube: '<path d="M8 1.5l5.5 3v7L8 14.5l-5.5-3v-7z"/><path d="M2.5 4.5L8 7.5l5.5-3M8 7.5v7"/>'
};
const SIDE = [
  { head: 'Works', items: [
    ['All Works', 'all', 'all'], ['Informative', 'Informative Website', 'doc'], ['Web App', 'Web App', 'win'],
    ['Mobile App', 'Mobile App', 'phone'], ['E-commerce', 'E-commerce', 'bag'], ['Interactive', 'Interactive', 'cursor'],
    ['Admin', 'Admin System', 'admin'], ['3D', '3D Design', 'cube'] ] },
  { head: 'Tags', items: [
    ['Loyalty', 'Loyalty', '#ff5a2d'], ['Subscription', 'Subscription', '#2f6fdb'], ['Pre-order', 'Pre-order', '#3a9d5d'] ] }
];
// every other tag the projects carry gets its own filter too (most used first), so a link or a search can land on any of them
const TAG_DOTS = ['#d9a321', '#8a5cd0', '#17a2a2', '#d6477a', '#7a8b99', '#c46a2a', '#5aa02c'];
function addTagFilters() {
  const known = new Set(SIDE.flatMap((g) => g.items.map((it) => it[1])));
  const n = new Map();
  DATA.forEach((f) => f.tags.forEach((t) => { if (!known.has(t)) n.set(t, (n.get(t) || 0) + 1); }));
  [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([t], i) => SIDE[1].items.push([t, t, TAG_DOTS[i % TAG_DOTS.length]]));
}
const SORTS = [['default', 'As arranged'], ['name-asc', 'A–Z'], ['name-desc', 'Z–A']];
const COLS = [['name', 'Name'], ['type', 'Type'], ['role', 'Role'], ['tool', 'Tools']];
const KEY = { name: (f) => f.short, type: (f) => EXT[f.ext], role: (f) => f.role, tool: (f) => f.tool };

export function mountWorks(root, opts = {}) {
({ EXT, DATA, EXTRA } = opts.data);
setModels(Object.fromEntries(DATA.filter((f) => f.model).map((f) => [f.id, f.model])));   // projects with their own 3D icon

/* ============ STATE ============ */
const MODE = opts.mode === 'page' ? 'page' : 'window';
const LS_POS = 'works.pos.v1.' + MODE, LS_COLS = 'works.cols.v1';
const $ = (s) => root.querySelector(s);
const docEl = document.documentElement;
const offs = [];                                  // every listener put on window / document, removed again in destroy()
const on = (target, type, fn, o) => { target.addEventListener(type, fn, o); offs.push(() => target.removeEventListener(type, fn, o)); };
let dead = false;
const field = $('#field'), canvas = $('#canvas'), listEl = $('#list');
const mobileMQ = matchMedia('(max-width: 760px)');
const isMobile = () => mobileMQ.matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const els = new Map();
let canDrag = !coarse && innerWidth >= 700;
let filter = 'all', sort = 'default', view = 'icons', access = 'all';   // access: all / open (no NDA) / nda
let selectedId = null, zTop = 30;
let loose = {}, cur = {}, looseW = 0, looseC = 0;   // width and column count the hand-placed positions were made for
let CW = 148, FW = 136;                     // cell width, file width
const CH = 200, PAD = 12, GAP = 16;         // CH is only a scroll/fit estimate: rows size themselves to their tallest label

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nb = (t) => esc(t).replace(/[^\s]+-[^\s]+/g, (w) => `<span style="white-space:nowrap">${w}</span>`);
const labelOf = (key) => { for (const g of SIDE) for (const it of g.items) if (it[1] === key) return it[0]; return key; };

/* ============ LAYOUT ============ */
function measure() {                          // cell sizes follow the screen
  if (isMobile()) {                                                    // phones: two big columns, tight gaps
    const n = field.clientWidth >= 480 ? 3 : 2;   // wider phones / small tablets get 3 columns
    CW = Math.max(108, Math.floor((field.clientWidth - PAD) / n)); FW = CW - 6;
    const pw = Math.round(Math.min(96, FW * 0.5));
    field.style.setProperty('--pw', pw + 'px'); field.style.setProperty('--ph', Math.round(pw * 1.27) + 'px'); field.style.setProperty('--tp', '10px');
  } else {
    CW = 148; FW = CW - 12;
    ['--pw', '--ph', '--tp'].forEach((v) => field.style.removeProperty(v));
  }
  field.style.setProperty('--fw', FW + 'px');
}
const cols = () => Math.max(1, Math.floor((field.clientWidth - PAD) / CW));
function gridOf(list) {                       // centred columns; each row is as tall as its tallest label, so nothing overlaps
  const c = cols(), ox = Math.max(0, Math.floor((field.clientWidth - PAD - c * CW) / 2)), o = {};
  let y = PAD;
  for (let i = 0; i < list.length; i += c) {
    const row = list.slice(i, i + c);
    row.forEach((f, j) => (o[f.id] = { x: PAD + ox + j * CW, y }));
    y += Math.max(...row.map((f) => (els.get(f.id) ? els.get(f.id).offsetHeight : 150))) + (isMobile() ? 8 : GAP);
  }
  return o;
}
function scatterOf(list) {                    // hand-placed look: the grid plus a small deterministic wobble
  const g = gridOf(list), o = {};
  list.forEach((f, i) => {
    o[f.id] = { x: Math.max(4, g[f.id].x + (((i * 37) % 9) - 4)), y: Math.max(4, g[f.id].y + (((i * 53) % 7) - 3) + (i % 2 ? 4 : 0)) };
  });
  return o;
}
const scatter = () => scatterOf(DATA);
function loadLoose() {
  looseW = field.clientWidth; looseC = cols();
  if (!canDrag) return gridOf(DATA);
  try {
    const raw = JSON.parse(localStorage.getItem(LS_POS) || 'null');
    if (raw && raw.pos && DATA.every((f) => raw.pos[f.id])) { looseW = raw.w || looseW; looseC = raw.c || 0; return raw.pos; }
  } catch (e) {}
  return scatter();
}
const saveLoose = () => { try { localStorage.setItem(LS_POS, JSON.stringify({ w: looseW, c: looseC, pos: loose })); } catch (e) {} };
function reflow() {                           // new column count: keep the reading order, lay it out again for this width
  const byY = [...DATA].sort((a, b) => loose[a.id].y - loose[b.id].y), order = [];
  let row = [], y0 = null;
  const flush = () => { row.sort((a, b) => loose[a.id].x - loose[b.id].x); order.push(...row); row = []; };
  byY.forEach((f) => { const y = loose[f.id].y; if (y0 === null || y - y0 > 90) { flush(); y0 = y; } row.push(f); });
  flush();
  loose = scatterOf(order);
}
function refit() {                            // called whenever the arranged view is shown
  const W = field.clientWidth, c = cols();
  if (!looseW) return;
  if (c !== looseC) { reflow(); looseC = c; looseW = W; saveLoose(); return; }
  if (looseW === W) return;
  const a = Math.max(1, looseW - FW), b = Math.max(0, W - FW);   // same columns, slightly different width: just stretch
  Object.values(loose).forEach((p) => { p.x = Math.round((p.x * b) / a); });
  looseW = W; saveLoose();
}

function visibleList() {
  const l = DATA.filter((f) => (filter === 'all' || f.tags.includes(filter)) && (access === 'all' || (access === 'nda') === f.nda));
  if (sort !== 'default') {
    const [k, d] = sort.split('-'), sgn = d === 'desc' ? -1 : 1;
    l.sort((a, b) => sgn * KEY[k](a).localeCompare(KEY[k](b)) || a.short.localeCompare(b.short));
  }
  return l;
}
const isDefault = () => filter === 'all' && sort === 'default' && access === 'all';
const place = (el, p) => { el.style.transform = `translate(${p.x}px, ${p.y}px)`; };

function sync() {
  measure();
  const vis = visibleList(), show = new Set(vis.map((f) => f.id));
  if (isDefault()) {
    refit();
    cur = loose;
    const maxX = Math.max(0, field.clientWidth - FW);
    Object.values(cur).forEach((p) => { p.x = Math.min(p.x, maxX); });
  } else cur = gridOf(vis);
  const rank = new Map(vis.map((f, i) => [f.id, i]));
  els.forEach((el, id) => {
    const on = show.has(id);
    el.style.setProperty('--d', on ? Math.min(rank.get(id) * 18, 360) + 'ms' : '0ms');
    el.classList.toggle('hidden', !on);
    el.tabIndex = on ? 0 : -1;
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
    place(el, cur[id] || loose[id]);
  });
  fitHeight(vis);
  kickFade();
  if (selectedId && !show.has(selectedId)) select(null);
  $('#count').textContent = `${vis.length} item${vis.length === 1 ? '' : 's'}`;
  renderList(vis);
}
function fitHeight(vis = visibleList()) {
  let maxY = 0;
  vis.forEach((f) => { const p = cur[f.id]; if (p) maxY = Math.max(maxY, p.y); });
  // on the page the files are as long as they need to be and the page itself scrolls; in the framed window the canvas scrolls
  field.style.height = (MODE === 'page' ? maxY + CH + 40 : Math.max(canvas.clientHeight, maxY + CH + 130)) + 'px';
}


/* ============ PAGE MODE: files fade out under the toolbar and above the bottom bar ============ */
let fadeUntil = 0, fadeRaf = 0;
function fadeEdges() {
  const sd = $('.side').getBoundingClientRect();                      // once the side panel stops sticking and lifts away, the toolbar lifts with it
  const lift = isMobile() ? 0 : Math.max(0, 96 + sd.height - $('#win').getBoundingClientRect().bottom);
  $('.toolbar').style.transform = lift ? `translateY(${-lift}px)` : '';
  const lhd = root.querySelector('.lhead'); if (lhd) lhd.style.transform = lift ? `translateY(${-lift}px)` : '';   // the list header lifts away with the toolbar
  const tb = $('.toolbar').getBoundingClientRect(), sb = $('.statusbar').getBoundingClientRect();
  document.documentElement.style.setProperty('--tbh', Math.round(tb.height) + 'px');
  const lh = view === 'list' ? root.querySelector('.lhead') : null;
  const top = lh ? lh.getBoundingClientRect().bottom + 6 : tb.bottom - 10, bottom = sb.top;                       // the ramp is clear at the toolbar's edge and 32px below it, so a row at rest is never touched
  root.querySelectorAll('.file:not(.hidden), .lrow').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < top - 8 || r.top > bottom + 8) { el.style.setProperty('--ma', '9999px'); return; }   // fully off: masked out
    el.style.setProperty('--ma', (top - r.top) + 'px');
    el.style.setProperty('--mb', (bottom - r.top) + 'px');
  });
}
function kickFade(ms = 900) {                                        // runs while things move (scroll, layout glides), then rests
  if (MODE !== 'page') return;
  fadeUntil = performance.now() + ms;
  if (fadeRaf) return;
  const loop = (now) => { fadeEdges(); fadeRaf = now < fadeUntil ? requestAnimationFrame(loop) : 0; };
  fadeRaf = requestAnimationFrame(loop);
}

/* ============ PAGE MODE: wide list columns pan sideways inside the content width and fade at the edges ============ */
let pan = 0;
function updatePan() {
  if (MODE !== 'page') return;
  const wrap = root.querySelector('.lwrap');
  if (!wrap || isMobile()) { listEl.classList.remove('fade-l', 'fade-r'); return; }
  const max = Math.max(0, wrap.offsetWidth - listEl.clientWidth);
  pan = Math.max(0, Math.min(max, pan));
  listEl.style.setProperty('--pan', pan);
  listEl.classList.toggle('fade-l', pan > 2);
  listEl.classList.toggle('fade-r', pan < max - 2);
}
listEl.addEventListener('wheel', (e) => {                            // sideways trackpad swipe, or shift + wheel
  if (MODE !== 'page' || isMobile()) return;
  const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
  if (!dx) return;
  e.preventDefault(); pan += dx; updatePan(); kickFade(160);
}, { passive: false });
on(window, 'resize', updatePan);

/* ============ FILES ============ */
function thumbSVG(id) {                       // tiny faux text preview, unique per file
  let s = id * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = `<rect x="7" y="8" width="${22 + rnd() * 18}" height="3.4" rx="1.2" fill="#2a2a30" opacity=".85"/>`;
  for (let i = 0; i < 9; i++) {
    const y = 18 + i * 6.8;
    out += `<rect x="7" y="${y}" width="${34 + rnd() * 26}" height="2" rx="1" fill="#8b8d94" opacity=".55"/>`;
    if (i % 4 === 3) out += `<rect x="7" y="${y + 3.4}" width="${14 + rnd() * 20}" height="2" rx="1" fill="#8b8d94" opacity=".4"/>`;
  }
  return `<svg viewBox="0 0 72 92" aria-hidden="true">${out}</svg>`;
}
function build() {
  DATA.forEach((f, i) => {
    const el = document.createElement('div');
    el.className = 'file';
    el.style.setProperty('--n', i);
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${f.short}, .${f.ext}, ${EXT[f.ext]}`);
    el.innerHTML = `<div class="thumb"><div class="page-card">${thumbSVG(f.id)}</div></div><span class="label">${nb(f.short)}<span class="ext">.${f.ext}</span></span>`;
    field.appendChild(el);
    els.set(f.id, el);
    wire(el, f);
  });
}

function select(id) {
  selectedId = id;
  els.forEach((el, k) => el.classList.toggle('selected', k === id));
  listEl.querySelectorAll('.lrow').forEach((r) => r.classList.toggle('selected', +r.dataset.id === id));
  const f = DATA.find((d) => d.id === id);
  $('#selname').textContent = f ? `“${f.short}.${f.ext}” selected` : (coarse ? 'Tap a file to select, tap again to open' : '');
}
function wire(el, f) {
  let moved = false, lastTap = 0;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const wasSelected = selectedId === f.id;
    select(f.id);
    moved = false;
    if (!canDrag) {                                       // touch: tap to select, tap again to open
      if (wasSelected && Date.now() - lastTap < 2500) openQL(f);
      lastTap = Date.now();
      return;
    }
    const start = { x: e.clientX, y: e.clientY, ox: cur[f.id].x, oy: cur[f.id].y };
    el.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) { moved = true; el.classList.add('dragging'); el.style.zIndex = ++zTop; }
      cur[f.id] = {
        x: Math.min(Math.max(0, start.ox + dx), Math.max(0, field.clientWidth - FW)),
        y: Math.min(Math.max(0, start.oy + dy), field.clientHeight - 120)
      };
      place(el, cur[f.id]);
    };
    const up = () => {
      el.removeEventListener('pointermove', mv);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      if (moved) { if (isDefault()) saveLoose(); fitHeight(); setTimeout(() => { moved = false; }, 0); }
    };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
  el.addEventListener('dblclick', () => { if (canDrag && !moved) openQL(f); });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQL(f); }
    else if (e.key.startsWith('Arrow')) { e.preventDefault(); move(f, e.key); }
    else if (e.key === 'Escape') { select(null); el.blur(); }
  });
  el.addEventListener('focus', () => { if (selectedId !== f.id) select(f.id); });
}
function move(from, key) {                                 // arrow keys: nearest visible file that way
  const a = cur[from.id];
  const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
  let best = null, bestScore = Infinity;
  visibleList().forEach((f) => {
    if (f.id === from.id) return;
    const p = cur[f.id], dx = p.x - a.x, dy = p.y - a.y;
    const along = dx * dir[0] + dy * dir[1];
    if (along <= 4) return;
    const score = along + (Math.abs(dx * dir[1]) + Math.abs(dy * dir[0])) * 2;
    if (score < bestScore) { bestScore = score; best = f; }
  });
  if (!best) return;
  els.get(best.id).focus();
  const top = cur[best.id].y, beh = reduced ? 'auto' : 'smooth';
  if (top < canvas.scrollTop) canvas.scrollTo({ top: top - PAD, behavior: beh });
  else if (top + CH > canvas.scrollTop + canvas.clientHeight - 90) canvas.scrollTo({ top: top + CH - canvas.clientHeight + 110, behavior: beh });
}
canvas.addEventListener('pointerdown', (e) => { if (!e.target.closest('.file') && !e.target.closest('.preview')) select(null); });

/* ============ TRAFFIC LIGHTS ============ */
function lightsHTML() {
  return `<button class="tl r" type="button" aria-label="Close"><svg class="gl" viewBox="0 0 12 12"><path d="M3.2 3.2l5.6 5.6M8.8 3.2L3.2 8.8"/></svg></button>
<button class="tl y" type="button" aria-label="Minimise"><svg class="gl" viewBox="0 0 12 12"><path d="M2.8 6h6.4"/></svg><svg class="face" viewBox="0 0 12 12"><circle cx="4.2" cy="4.6" r=".9" fill="currentColor" stroke="none"/><circle cx="7.8" cy="4.6" r=".9" fill="currentColor" stroke="none"/><path d="M3.4 7.2c1.6 1.9 3.6 1.9 5.2 0"/></svg></button>
<button class="tl g" type="button" aria-label="Open the Works page"><svg class="gl" viewBox="0 0 12 12"><path d="M3.5 8.5l5-5M4.6 3.5h3.9v3.9"/></svg></button>`;
}
function flashSmile(btn) {                                 // the yellow dot turns into a smiley, then back right away
  btn.classList.add('smile');
  clearTimeout(btn._t);
  btn._t = setTimeout(() => btn.classList.remove('smile'), 650);
}
function initLights() {
  const side = $('#side');
  side.insertAdjacentHTML('afterbegin', `<div class="lights" id="lights" role="group" aria-label="Window controls">${lightsHTML()}</div>`);
  const L = $('#lights');
  L.querySelector('.r').addEventListener('click', () => {
    if (isMobile()) closeDrawer();                                    // in the drawer: close it
    else if (MODE === 'window') {                                     // on the page: scroll to the next frame
      const next = opts.nextSection && opts.nextSection();
      if (next) next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  });
  L.addEventListener('click', (e) => {                                // on phones the small lights enlarge on the first tap
    if (isMobile() && !L.classList.contains('expanded')) { e.stopPropagation(); e.preventDefault(); L.classList.add('expanded'); }
  }, true);
  side.addEventListener('pointerdown', (e) => { if (!e.target.closest('.lights')) collapseLights(); });
  L.querySelector('.y').addEventListener('click', (e) => flashSmile(e.currentTarget));
  const g = L.querySelector('.g');
  if (MODE === 'page') { g.disabled = true; g.title = 'You are already on the Works page'; }
  else g.addEventListener('click', () => { if (opts.onOpenPage) opts.onOpenPage(); });
  const q = $('#qlLights');                                           // Quick Look has its own set
  q.innerHTML = lightsHTML();
  $('.ql-top').prepend(q);                                           // inside the window's top bar, on every screen size
  q.querySelector('.r').id = 'qlClose';
  q.addEventListener('click', (e) => {                               // on phones the small lights enlarge on the first tap here too
    if (isMobile() && !q.classList.contains('expanded')) { e.stopPropagation(); e.preventDefault(); q.classList.add('expanded'); }
  }, true);
  $('#qlBack').addEventListener('pointerdown', (e) => { if (!e.target.closest('#qlLights')) q.classList.remove('expanded'); });
  q.querySelector('.r').addEventListener('click', () => closeQL());
  q.querySelector('.y').addEventListener('click', (e) => flashSmile(e.currentTarget));
  q.querySelector('.g').disabled = true;
}

/* ============ SIDEBAR / FILTER ============ */
function buildSide() {
  const side = $('#side');
  SIDE.forEach((g) => {
    const h = document.createElement('h4'); h.textContent = g.head; side.appendChild(h);
    g.items.forEach(([label, key, icon]) => {
      const n = key === 'all' ? DATA.length : DATA.filter((f) => f.tags.includes(key)).length;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'side-item'; b.dataset.key = key;
      const glyph = ICONS[icon] ? `<svg viewBox="0 0 16 16" aria-hidden="true">${ICONS[icon]}</svg>` : `<span class="dot" style="background:${icon}"></span>`;
      b.innerHTML = `${glyph}${esc(label)}<span class="n">${n}</span>`;
      b.addEventListener('click', () => { go(key); if (isMobile()) closeDrawer(); });
      side.appendChild(b);
    });
  });
}
const validKey = (k) => (k && SIDE.some((g) => g.items.some((it) => it[1] === k)) ? k : 'all');
// the page's URL (?f= filter, ?open= project) drives the window: used on load and whenever the address changes while you are already here
function showView(q = {}) {
  if (dead) return;
  if ('filter' in q) { const k = validKey(q.filter); if (k !== filter) go(k); }
  const f = q.open != null && DATA.find((d) => d.id === +q.open);
  if (f) openQL(f);
}
function go(key) {
  const changed = key !== filter;
  filter = key;
  if (changed && opts.onFilter) opts.onFilter(key);
  root.querySelectorAll('.side-item').forEach((b) => b.setAttribute('aria-current', b.dataset.key === key ? 'true' : 'false'));
  const tt = $('#titleText');
  tt.textContent = labelOf(key);
  if (changed) { tt.style.animation = 'none'; void tt.offsetWidth; tt.style.animation = ''; }
  canvas.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  if (MODE === 'page' && scrollY > 0) scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  listEl.scrollTo({ top: 0 });
  sync();
}

/* ============ NDA / OPEN SWITCH: only shown once the works include both kinds ============ */
function buildAccess() {
  const box = $('#access');
  box.hidden = !(DATA.some((f) => f.nda) && DATA.some((f) => !f.nda));
  box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    if (access === b.dataset.acc) return;
    access = b.dataset.acc;
    box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    sync();
  }));
}

/* ============ SORT (menu + list headers share one state) + CLEAN UP ============ */
const menu = $('#wkSortMenu'), sortBtn = $('#sortBtn');
const CHECK = '<svg class="ck" viewBox="0 0 14 14"><path d="M2.5 7.5l3 3 6-7"/></svg>';
let resorting = false, listShown = false;   // listShown: rows have popped in once; after that filter/sort only nudges them
function setSort(key) {
  sort = key;
  menu.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', x.dataset.key === key ? 'true' : 'false'));
  canvas.scrollTo({ top: 0 });
  resorting = true; sync(); resorting = false;
}
function buildMenu() {
  SORTS.forEach(([key, label], i) => {
    if (i === 1) menu.appendChild(document.createElement('hr'));
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.dataset.key = key;
    b.setAttribute('aria-checked', key === sort ? 'true' : 'false');
    b.innerHTML = `${CHECK}${esc(label)}`;
    b.addEventListener('click', () => { closeMenu(); setSort(key); });
    menu.appendChild(b);
  });
}
function openMenu() { menu.classList.add('open'); sortBtn.setAttribute('aria-expanded', 'true'); }
function closeMenu() { menu.classList.remove('open'); sortBtn.setAttribute('aria-expanded', 'false'); }
sortBtn.addEventListener('click', () => (menu.classList.contains('open') ? closeMenu() : openMenu()));
on(window, 'pointerdown', (e) => { if (!e.target.closest('.menu-wrap')) closeMenu(); });
$('#cleanup').addEventListener('click', (e) => {
  const b = e.currentTarget;
  b.classList.remove('sweeping'); void b.offsetWidth; b.classList.add('sweeping');      // the broom sweeps on the spot
  clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('sweeping'), 900);
  if (isDefault()) { loose = gridOf(DATA); looseW = field.clientWidth; looseC = cols(); saveLoose(); }
  sync();
});

/* ============ VIEW + LIST ============ */
function setView(v) {
  view = v;
  $('#win').dataset.view = v;
  $('#vIcons').setAttribute('aria-pressed', v === 'icons');
  $('#vList').setAttribute('aria-pressed', v === 'list');
  if (v === 'list') { listShown = false; listEl.querySelectorAll('.lrow').forEach((r) => r.classList.remove('resort')); clearTimeout(setView.t); setView.t = setTimeout(() => { listShown = true; }, 900); }   // choosing the list view = full pop
  if (v === 'icons') requestAnimationFrame(sync);
  else { updatePan(); requestAnimationFrame(() => { kickFade(900); fadeEdges(); }); }
}
$('#vIcons').addEventListener('click', () => setView('icons'));
$('#vList').addEventListener('click', () => setView('list'));

let colW = [340, 150, 200, 160];
(function () {
  try { const s = JSON.parse(localStorage.getItem(LS_COLS) || 'null'); if (Array.isArray(s) && s.length === 4) colW = s; else if (isMobile()) colW = [210, 110, 170, 130]; } catch (e) {}
})();
function applyCols() {
  listEl.style.setProperty('--cols', `${colW[0]}px ${colW[1]}px ${colW[2]}px minmax(${colW[3]}px, 1fr)`);
  listEl.style.setProperty('--lw', colW.reduce((a, b) => a + b, 0) + 'px');
  updatePan();
}
const MINI = `<svg class="mini" viewBox="0 0 20 24" aria-hidden="true"><path d="M3.2 1.5h9.3l5 5V21a1.5 1.5 0 0 1-1.5 1.5H3.2A1.5 1.5 0 0 1 1.7 21V3A1.5 1.5 0 0 1 3.2 1.5z" fill="#fff" stroke="#c4c6cc"/><path d="M12.5 1.5v3.8a1.5 1.5 0 0 0 1.5 1.5h3.5" fill="#e9eaee" stroke="#c4c6cc"/><rect x="4.4" y="8.6" width="6.5" height="1.3" rx=".6" fill="#4fb3e8"/><rect x="4.4" y="11" width="4.5" height="1.3" rx=".6" fill="#ee6aa7"/><rect x="4.4" y="13.8" width="11" height="1" rx=".5" fill="#b9bbc2"/><rect x="4.4" y="16" width="11" height="1" rx=".5" fill="#b9bbc2"/><rect x="4.4" y="18.2" width="7" height="1" rx=".5" fill="#b9bbc2"/></svg>`;
const ARROW = '<svg class="sarr" viewBox="0 0 10 10"><path d="M2 6.5L5 3.5l3 3"/></svg>';

function cycleSort(k) {                                    // none -> A-Z -> Z-A -> none
  setSort(sort === `${k}-asc` ? `${k}-desc` : sort === `${k}-desc` ? 'default' : `${k}-asc`);
}
function renderList(vis) {
  applyCols();
  const [sk, sd] = sort === 'default' ? [null, null] : sort.split('-');
  let html = '<div class="lwrap"><div class="lhead">';
  COLS.forEach(([k, label], i) => {
    html += `<div class="hcell" data-k="${k}" data-i="${i}" ${sk === k ? `data-dir="${sd}"` : ''} role="columnheader" tabindex="0" aria-sort="${sk === k ? (sd === 'asc' ? 'ascending' : 'descending') : 'none'}"><span>${label}</span>${ARROW}<i class="rz" data-i="${i}"></i></div>`;
  });
  html += '</div><div class="lrows" id="lrows"></div></div>';
  const sx = listEl.scrollLeft, sy = listEl.scrollTop;
  listEl.innerHTML = html;
  const rows = $('#lrows');
  if (!vis.length) rows.innerHTML = '<div class="lrow"><span class="lcell">No files match.</span></div>';
  vis.forEach((f, i) => {
    const r = document.createElement('div');
    r.className = 'lrow' + (f.id === selectedId ? ' selected' : '') + (listShown ? ' resort' : '');
    r.tabIndex = 0; r.setAttribute('role', 'button'); r.dataset.id = f.id;
    r.style.setProperty('--n', i);
    r.innerHTML = `<div class="lname">${MINI}<span class="t">${esc(f.short)}</span><em>.${f.ext}</em></div><div class="lcell">${esc(EXT[f.ext])}</div><div class="lcell">${esc(f.role)}</div><div class="lcell">${esc(f.tool)}</div>`;
    r.addEventListener('click', () => { if (coarse && selectedId === f.id) openQL(f); else select(f.id); });
    r.addEventListener('dblclick', () => openQL(f));
    r.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openQL(f);
      else if (e.key === 'ArrowDown' && r.nextElementSibling) { e.preventDefault(); r.nextElementSibling.focus(); }
      else if (e.key === 'ArrowUp' && r.previousElementSibling) { e.preventDefault(); r.previousElementSibling.focus(); }
    });
    r.addEventListener('focus', () => { if (selectedId !== f.id) select(f.id); });
    rows.appendChild(r);
  });
  listEl.scrollLeft = sx; listEl.scrollTop = sy;
  updatePan();
  listEl.querySelectorAll('.hcell').forEach((h) => {
    h.addEventListener('click', () => cycleSort(h.dataset.k));
    h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleSort(h.dataset.k); } });
  });
  listEl.querySelectorAll('.rz').forEach((z) => {          // drag the edge to widen / narrow a column
    z.addEventListener('click', (e) => e.stopPropagation());
    z.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const i = +z.dataset.i, x0 = e.clientX, w0 = colW[i];
      z.setPointerCapture(e.pointerId); z.classList.add('on');
      const mv = (ev) => { colW[i] = Math.max(70, Math.round(w0 + ev.clientX - x0)); applyCols(); };
      const up = () => {
        z.classList.remove('on');
        z.removeEventListener('pointermove', mv); z.removeEventListener('pointerup', up); z.removeEventListener('pointercancel', up);
        try { localStorage.setItem(LS_COLS, JSON.stringify(colW)); } catch (e2) {}
      };
      z.addEventListener('pointermove', mv); z.addEventListener('pointerup', up); z.addEventListener('pointercancel', up);
    });
  });
  listShown = true;
}

/* ============ 50x50 LIGHT GRID ============ */
const N = 50;
/* big grid for the Quick Look window: e-ink feel. Off cells are see-through, lit cells are pale gray squares with small gaps; the picture is a per-project motif (motifs.js),
   a faint cool tint, and a quick refresh sweep when the window opens. Same look for every project. */
let litRaf = 0, litRO = null, lastLit = null;   // lastLit: the picture on screen, so stepping to the next project can wipe it away cell by cell
function drawLit(cv, id) {
  const scene = motifScene(id);                               // a real little 3D model, rendered into the 50x50 grid
  const dark = docEl.dataset.theme !== 'light';
  const SNAP = Math.PI / 4, TILT = 0.21;                              // snap every 45 degrees; tilt up to ~12 degrees
  const st = { yaw: scene.yaw0, pitch: scene.pitch0, vy: 0, vp: 0, target: null, drag: false, live: reduced, dirty: false };
  let grid = scene.render(st.yaw, st.pitch);
  const prevLit = !reduced && lastLit && lastLit.id !== id ? lastLit : null;
  lastLit = { grid, id, cells: null };                                // cells: where every cell is right now while the picture is still forming
  const hsl2rgb = (h, sa, l) => { const a = sa * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)].map((q) => Math.round(q * 255)); };
  const grayRgb = (v) => hsl2rgb(205, (dark ? 6 : 8) / 100, (dark ? 42 + v * 50 : 30 + v * 44) / 100);
  const rgbAt = (g, k) => (g.rgb && g.rgb[k * 4 + 3] ? [g.rgb[k * 4], g.rgb[k * 4 + 1], g.rgb[k * 4 + 2]] : grayRgb(g[k]));
  // the cells on screen right now: still forming (clicked next again mid-way) = where they are and the colour they have; settled = the picture
  const src = prevLit ? (prevLit.cells || (() => { const a = []; for (let k = 0; k < N * N; k++) if (prevLit.grid[k] >= 0.07) a.push({ x: k % N, y: (k / N) | 0, c: rgbAt(prevLit.grid, k) }); return a; })()) : null;
  const outgoing = src;
  const mixRgb = (a, b, u) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`;
  /* entrance: every lit cell is reached by a little light that walks in from a random point (any side, corner or inside), like an ant:
     lights come from everywhere, not from the nearest edge.
     The walk wanders (sideways steps, stalls and bursts) and never goes in a straight line. */
  let seed = id * 2654435761 >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let trav = [], tEnd = 0;
  /* Cells never re-aim while walking. Once a cell has landed it sits on the live model: if turning the model leaves its spot dark, it hops to the
     nearest free lit spot (occ = which spots are taken). So the model turns for real while the picture is still filling in. */
  const occ = new Uint8Array(N * N);
  const nearestFree = (x0, y0) => {                                   // the closest free lit spot: a landed cell never goes far, so nothing looks like it is chasing
    let best = -1, bd = 1e9;
    for (let r = 0; r < N; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const k = y * N + x; if (occ[k] || grid[k] < 0.07) continue;
        const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; }
      }
      if (best >= 0 && bd < (r + 1) * (r + 1)) break;
    }
    return best;
  };
  const seatWalker = (c) => {
    if (c.px === undefined) { c.px = c.x; c.py = c.y; }
    const k = nearestFree(Math.round(c.px), Math.round(c.py));
    if (k < 0) { c.dead = true; return; }
    c.seat = k; occ[k] = 1;
  };
  /* stepping to another project (outgoing = the picture on screen): the cells on screen walk to the new picture the same way, hop by hop,
     each to the nearest free cell. If the new picture needs more cells, the extras start somewhere around the middle (a loose area, not the
     exact centre). If it needs fewer, the spare cells walk toward the middle and vanish. */
  const hub = () => [Math.max(0, Math.min(N - 1, Math.round(N / 2 - 0.5 + (rnd() - 0.5) * 16))), Math.max(0, Math.min(N - 1, Math.round(N / 2 - 0.5 + (rnd() - 0.5) * 16)))];
  /* plan(): where every cell goes from where it is right now. Used when the picture starts forming, and again whenever the model is turned
     while it is still forming (quick: no waiting, the cells are already moving). */
  const plan = (outgoing, quick) => {
    trav = []; tEnd = 0; occ.fill(0);
    const jobs = [];
    if (outgoing) {
      const A = outgoing, B = [];
      for (let k = 0; k < N * N; k++) if (grid[k] >= 0.07) B.push(k);
      // pairing: cells already on a lit spot of the new picture stay; every other new spot, in random order, takes the nearest unused cell (ring search, cheap even with hundreds of cells)
      const usedA = new Uint8Array(A.length), pair = new Int32Array(B.length).fill(-1), at = new Array(N * N);
      A.forEach((a, i) => { const k = Math.max(0, Math.min(N - 1, Math.round(a.y))) * N + Math.max(0, Math.min(N - 1, Math.round(a.x))); (at[k] || (at[k] = [])).push(i); });
      const todo = [];
      B.forEach((b, j) => { const l = at[b]; const i = l && l.find((q) => !usedA[q] && !A[q].light && A[q].x === b % N && A[q].y === ((b / N) | 0)); if (i !== undefined) { usedA[i] = 1; pair[j] = i; } else todo.push(j); });
      for (let n = todo.length - 1; n > 0; n--) { const m = (rnd() * (n + 1)) | 0; [todo[n], todo[m]] = [todo[m], todo[n]]; }
      let freeA = A.length - usedA.reduce((p, q) => p + q, 0);
      for (const j of todo) {
        if (!freeA) break;
        const bx = B[j] % N, by = (B[j] / N) | 0; let bi = -1, bd = 1e9;
        for (let r = 0; r < N && !(bi >= 0 && bd < r * r); r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const x = bx + dx, y = by + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue;
            const l = at[y * N + x]; if (!l) continue;
            for (const q of l) if (!usedA[q] && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; bi = q; }
          }
        }
        if (bi >= 0) { usedA[bi] = 1; pair[j] = bi; freeA--; }
      }
      const anyColour = () => (A.length ? A[(rnd() * A.length) | 0].c : grayRgb(0.8)), anyTarget = () => (B.length ? rgbAt(grid, B[(rnd() * B.length) | 0]) : grayRgb(0.8));
      // colours are not matched on purpose: a cell keeps its own colour at the start and drifts to whatever its new place needs, near or far
      B.forEach((b, j) => jobs.push({ x: b % N, y: (b / N) | 0, v: grid[b], c1: rgbAt(grid, b), ...(pair[j] >= 0 && !A[pair[j]].light && A[pair[j]].x === b % N && A[pair[j]].y === ((b / N) | 0) ? { stay: true, c0: A[pair[j]].c } : pair[j] >= 0 ? { start: [A[pair[j]].x, A[pair[j]].y], c0: A[pair[j]].c, hold: true, light: A[pair[j]].light } : { start: hub(), c0: anyColour() }) }));
      A.forEach((a, i) => { if (!usedA[i]) { const [tx, ty] = hub(); jobs.push({ x: tx, y: ty, v: 0.5, start: [a.x, a.y], c0: a.c, c1: anyTarget(), hold: true, light: a.light, gone: true }); } });
    } else for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = grid[y * N + x]; if (v >= 0.07) jobs.push({ x, y, v, c1: rgbAt(grid, y * N + x) }); }
    for (const job of jobs) {
      const { x, y, v } = job;
      if (job.stay) {                                                 // a cell already on its spot in the new picture just stays lit: nothing leaves, nothing flashes
        occ[y * N + x] = 1;
        trav.push({ x, y, v, path: Float32Array.of(x, y), len: 1, delay: -10, step: 0.01, ph: 0, seat: y * N + x, dead: false, reserved: -1, c1: job.c1, sc0: job.c0, sdl: rnd() * 0.6, sdu: 0.5 + rnd() * 0.6 }); const q = trav[trav.length - 1]; tEnd = Math.max(tEnd, q.sdl + q.sdu + 0.1);   // sc0: it keeps the colour it had and drifts to the new one while it stands
        continue;
      }
      const cl = (n) => Math.max(0, Math.min(N - 1, n)), pick = rnd();
      let px, py;
      if (job.start) { px = job.start[0]; py = job.start[1]; }
      else if (pick < 0.72) {                                   // anywhere along the whole border: any side, any corner, whatever it likes
        const q = rnd() * 4 * (N - 1), s = Math.floor(q % (N - 1)), side = Math.floor(q / (N - 1));
        px = side === 0 ? s : side === 1 ? N - 1 : side === 2 ? N - 1 - s : 0;
        py = side === 0 ? 0 : side === 1 ? s : side === 2 ? N - 1 : N - 1 - s;
      } else if (pick < 0.86) { px = Math.floor(rnd() * N); py = Math.floor(rnd() * N); }                      // drifts in from somewhere inside the grid
      else { px = cl(x + Math.round((rnd() - 0.5) * 18)); py = cl(y + Math.round((rnd() - 0.5) * 18)); }        // starts close to home
      const wob = 0.03 + rnd() * 0.08;                          // only ~10% of moves are extra detours
      if (job.start) { px = cl(Math.round(job.start[0])); py = cl(Math.round(job.start[1])); }
      const path = job.start && (job.start[0] !== px || job.start[1] !== py) ? [job.start[0], job.start[1], px, py] : [px, py];
      for (let n = 0; n < 200 && (px !== x || py !== y); n++) {
        const ddx = x - px, ddy = y - py, ax = Math.abs(ddx), ay = Math.abs(ddy);
        let mx = 0, my = 0;
        if (rnd() < wob) { if (rnd() < 0.5) mx = rnd() < 0.5 ? -1 : 1; else my = rnd() < 0.5 ? -1 : 1; }     // wander
        else if (rnd() < ax / (ax + ay || 1)) mx = Math.sign(ddx); else my = Math.sign(ddy);                    // head for home
        px = cl(px + mx); py = cl(py + my);
        path.push(px, py);
      }
      if (px !== x || py !== y) path.push(x, y);
      const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      const c = { x, y, v, path: Float32Array.from(path), len: path.length / 2, delay: quick || job.light ? rnd() * 0.06 : (hash % 1000) / 1000 * 0.75, step: 0.0072 + rnd() * 0.0075, ph: rnd() * 6.28, hold: job.hold, gone: job.gone, c0: job.c0, c1: job.c1, seat: -1, dead: false, reserved: -1 };
      tEnd = Math.max(tEnd, c.delay + (c.len + 2) * c.step + 0.25);
      trav.push(c);
    }
  };
  plan(src, false);
  const mouse = { x: -99, y: -99 }, sm = { x: 25, y: 25, k: 0 };
  let t0 = performance.now(), catchUp = 0;
  let cell = 0, W = 0, last = t0, force = true, offCv = null, offDirty = true;
  /* e-ink touches: ink bloom (a soft spread around lit cells), a faint panel-edge shade, a quick full refresh flash when a picture arrives,
     ghosting (a faint remnant where the model was), single cells that re-flash now and then, and a little speckle when left alone */
  let lc = null, vigCv = null, lastAct = t0, lastFx = 0, twNext = t0 + 1200, specNext = 0;
  const ghost = new Float32Array(N * N), tw = new Float32Array(N * N), specks = [];   // force: draw once more even when nothing moved (first frame, resize)
  const size = () => {
    const css = cv.clientWidth; if (!css) return;
    cv.style.height = css + 'px';                                     // always a perfect square
    W = Math.round(css * Math.min(devicePixelRatio || 1, 2));
    if (cv.width !== W) cv.width = cv.height = W;                     // setting the size clears the canvas, so only when it really changed
    cell = W / N; force = true; offDirty = true;
    /* rounded corners that follow the CRT glass: a rounded rectangle in grid space, pushed through the same barrel curve as the cells */
    const RR = 0.1, K = 12, E = 16, arcs = [[RR, RR, Math.PI], [1 - RR, RR, Math.PI * 1.5], [1 - RR, 1 - RR, 0], [RR, 1 - RR, Math.PI / 2]].map(([cx, cy, a0]) => {
      const a = []; for (let i = 0; i <= K; i++) { const t = a0 + i / K * Math.PI / 2; a.push([cx + RR * Math.cos(t), cy + RR * Math.sin(t)]); } return a;
    });
    const poly = [];
    arcs.forEach((a, i) => {
      poly.push(...a);
      const p = a[K], q = arcs[(i + 1) % 4][0];
      for (let k = 1; k < E; k++) poly.push([p[0] + (q[0] - p[0]) * k / E, p[1] + (q[1] - p[1]) * k / E]);   // straight sides, sampled so they bow with the glass
    });
    cv.style.clipPath = 'polygon(' + poly.map(([x, y]) => { const w = wp(x * W, y * W); return (w[0] / W * 100).toFixed(2) + '% ' + (w[1] / W * 100).toFixed(2) + '%'; }).join(',') + ')';
  };
  const tone = (v, flash) => {                                        // light gray ink; more light = brighter gray
    const l = dark ? 42 + v * 50 + flash * 6 : 30 + v * 44 + flash * 8;   // light mode keeps the same shading: top face lightest, shaded sides darker
    return `hsl(205 ${dark ? 6 : 8}% ${l}%)`;
  };
  const rectOf = (x, y, grow) => {                                    // every lit cell, gray or coloured, leaves the same gap as the faint off cells
    const g0 = Math.max(1, Math.round(cell * 0.14)), gp = g0, ex = grow ? g0 * 0.5 * grow : 0;
    const x0 = Math.round(x * cell), y0 = Math.round(y * cell);
    return [x0 + gp / 2 - ex, y0 + gp / 2 - ex, Math.round((x + 1) * cell) - x0 - gp + ex * 2, Math.round((y + 1) * cell) - y0 - gp + ex * 2];
  };
  const colorOf = (x, y, v, vv, flash) => {                           // a coloured model: the cell's own colour, lifted a little by hover / flash; '' for a gray cell
    const rgb = grid.rgb, j = (y * N + x) * 4; if (!rgb || !rgb[j + 3]) return '';
    const up = (vv - v) * 140 + flash * 40, c = (k) => Math.round(Math.max(0, Math.min(255, rgb[j + k] + up)));
    return `rgb(${c(0)},${c(1)},${c(2)})`;
  };
  const snapTo = (a) => Math.round(a / SNAP) * SNAP;
  const step = (dt) => {                                              // inertia, soft snap to the nearest 45 degrees, tilt springs back
    if (st.drag) return;
    if (st.target != null) {
      if (reduced) { st.yaw = st.target; st.vy = 0; st.target = null; st.dirty = true; }
      else {
        st.vy += ((st.target - st.yaw) * 150 - st.vy * 15) * dt; st.yaw += st.vy * dt; st.dirty = true;
        if (Math.abs(st.target - st.yaw) < 0.0015 && Math.abs(st.vy) < 0.02) { st.yaw = st.target; st.vy = 0; st.target = null; }
      }
    }
    if (st.pitch !== scene.pitch0 || st.vp) {
      if (reduced) st.pitch = scene.pitch0;
      else {
        st.vp += ((scene.pitch0 - st.pitch) * 110 - st.vp * 13) * dt; st.pitch += st.vp * dt; st.dirty = true;
        if (Math.abs(scene.pitch0 - st.pitch) < 0.0008 && Math.abs(st.vp) < 0.01) { st.pitch = scene.pitch0; st.vp = 0; }
      }
      st.dirty = true;
    }
  };
  const H = new Float32Array(N * N), OX = new Float32Array(N * N), OY = new Float32Array(N * N), GR = new Float32Array(N * N);   // hover: per-cell swell + push
  /* CRT glass: every cell corner is pushed through a barrel curve (the centre swells a little, the edges ease in) */
  const CRT = 0.07;
  const wp = (px, py) => { const u = (px / W - 0.5) * 2, v = (py / W - 0.5) * 2, f = 1 + CRT * (1 - (u * u + v * v)); return [(u * f / 2 + 0.5) * W, (v * f / 2 + 0.5) * W]; };
  const fq = (g, r) => {
    const a = wp(r[0], r[1]), b = wp(r[0] + r[2], r[1]), c = wp(r[0] + r[2], r[1] + r[3]), d = wp(r[0], r[1] + r[3]);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
  };
  const paint = (now) => {
    if (!W) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let t = reduced ? 99 : (now - t0) / 1000;
    let redraw = force || !st.live; force = false;                     // a still grid is not repainted: only the entrance, a turn, a hover or a resize are
    if (!st.live && t > tEnd) {
      // landed. If the model was turned meanwhile, the cells make up to two more short walks to fill the spots the turn left empty (only after you let go: while you hold the model it just follows your hand)
      let off = false; if (!st.drag && catchUp < 1) for (let j = 0; j < N * N; j++) if (grid[j] >= 0.07 && !occ[j]) { off = true; break; }
      if (off && lastLit.cells) { catchUp++; plan(lastLit.cells, true); t0 = now; t = 0; }
      else { st.live = true; lastLit.cells = null; }
    }
    step(dt);
    if (st.live && lastLit.cells) lastLit.cells = null;
    if (st.dirty) {
      const prev = grid; grid = scene.render(st.yaw, st.pitch); st.dirty = false; redraw = true; st.dirty0 = true; lastLit = { grid, id, cells: lastLit.cells };
      if (!reduced) for (let j = 0; j < N * N; j++) if (prev[j] >= 0.07 && grid[j] < 0.07) ghost[j] = Math.max(ghost[j], prev[j]);   // ghosting: where the model just was
    }
    if (!st.live && st.dirty0) for (const c of trav) if (c.seat >= 0 && grid[c.seat] < 0.07) { occ[c.seat] = 0; c.seat = -1; }   // the model turned: landed cells whose spot went dark glide to the nearest free lit spot
    st.dirty0 = false;
    let ghosting = false, twitching = false;
    if (!reduced) {
      const kg = Math.exp(-dt / 0.7), kt = Math.exp(-dt / 0.12);
      for (let j = 0; j < N * N; j++) {
        if (ghost[j] > 0.004) { ghost[j] *= kg; ghosting = true; } else ghost[j] = 0;
        if (tw[j] > 0.02) { tw[j] *= kt; twitching = true; } else tw[j] = 0;
      }
      if (st.live && now > twNext) {                                   // now and then two cells refresh on their own
        twNext = now + 900 + Math.random() * 1100;
        for (let n = 0; n < 2; n++) for (let tries = 0; tries < 24; tries++) { const j = (Math.random() * N * N) | 0; if (grid[j] >= 0.07) { tw[j] = 1; break; } }
      }
    }
    const idle = st.live && !st.drag && !reduced && now - lastAct > 4000;
    if (idle && now > specNext) {                                       // left alone: faint speckle drifts through the empty cells
      specNext = now + 650;
      for (let n = 0; n < 12; n++) { const j = (Math.random() * N * N) | 0; if (grid[j] < 0.07) specks.push({ j, born: now }); }
    }
    while (specks.length && now - specks[0].born > 1500) specks.shift();
    const fl = !reduced && !outgoing && t < 0.16 ? Math.sin(Math.PI * t / 0.16) : 0;   // the full refresh: one fast flash across the whole panel, only when the window opens (stepping between projects just wipes cell by cell)
    const wiping = false;
    sm.k += ((mouse.x > -50 ? 1 : 0) - sm.k) * 0.12;                  // hover strength eases in and out
    if (mouse.x > -50) { sm.x += (mouse.x - sm.x) * 0.25; sm.y += (mouse.y - sm.y) * 0.25; }
    let hot = mouse.x > -50 || sm.k > 0.004;
    if (!hot) for (let j = 0; j < N * N; j++) if (H[j] >= 0.01) { hot = true; break; }
    const loud = redraw || hot || ghosting || fl > 0 || wiping;
    if (!loud && !twitching && !specks.length) return;
    if (!loud && now - lastFx < 50) return;                           // only a twitch or speckle to show: ~20 frames a second is plenty
    lastFx = now;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, W);
    if (offDirty) {                                                   // the 2,500 faint off cells never move: drawn once per size, then just stamped
      offCv = offCv || document.createElement('canvas'); offCv.width = offCv.height = W;
      const og = offCv.getContext('2d'); og.fillStyle = dark ? 'rgba(255,255,255,.045)' : 'rgba(22,22,27,.034)';
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = rectOf(x, y); fq(og, r); }
      vigCv = vigCv || document.createElement('canvas'); vigCv.width = vigCv.height = W;
      const vg = vigCv.getContext('2d'), gr = vg.createRadialGradient(W / 2, W / 2, W * 0.32, W / 2, W / 2, W * 0.74);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, dark ? 'rgba(0,0,0,.16)' : 'rgba(22,22,27,.06)');
      vg.fillStyle = gr; vg.fillRect(0, 0, W, W);
      offDirty = false;
    }
    g.drawImage(offCv, 0, 0);
    for (const sp of specks) {
      const a = 0.08 * Math.sin(Math.PI * Math.min(1, (now - sp.born) / 1500));
      g.fillStyle = dark ? `rgba(255,255,255,${a})` : `rgba(22,22,27,${a * 1.4})`; fq(g, rectOf(sp.j % N, (sp.j / N) | 0));
    }
    if (!lc) lc = document.createElement('canvas');
    if (lc.width !== W) lc.width = lc.height = W;
    const lg = lc.getContext('2d'); lg.clearRect(0, 0, W, W);        // the picture is drawn here first, so its ink can bloom
    const hx = mouse.x > -50 ? Math.floor(mouse.x) : -1, hy = mouse.y > -50 ? Math.floor(mouse.y) : -1;
    OX.fill(0); OY.fill(0); GR.fill(0);
    for (let j = 0; j < N * N; j++) {                                  // the exact cell under the pointer swells; its neighbours ease outward, very slightly
      const on = (j % N === hx && ((j / N) | 0) === hy) ? 1 : 0;
      H[j] += (on - H[j]) * (on ? 0.3 : 0.14);
      const h = H[j]; if (h < 0.01) continue;
      const cx = j % N, cy = (j / N) | 0; GR[j] = Math.max(GR[j], h * 3);
      for (let yy = Math.max(0, cy - 6); yy <= Math.min(N - 1, cy + 6); yy++) for (let xx = Math.max(0, cx - 6); xx <= Math.min(N - 1, cx + 6); xx++) {
        if (xx === cx && yy === cy) continue;
        const dx = xx - cx, dy = yy - cy, d = Math.hypot(dx, dy); if (d > 6.5) continue;
        const f = (1 - d / 6.5); const m = h * f * f * 0.14 / d, k = yy * N + xx;
        OX[k] += dx * m; OY[k] += dy * m;
      }
    }
    const lift = (x, y, v) => {
      const i = y * N + x, g = GR[i];
      return [Math.min(1, v + H[i] * 0.16), g, OX[i], OY[i]];
    };
    for (let k = 0; k < N * N; k++) {                                 // ghosting: a faint remnant where the model was a moment ago
      if (ghost[k] <= 0.01) continue;
      lg.globalAlpha = Math.min(0.2, ghost[k] * 0.2); lg.fillStyle = tone(0.8, 0); fq(lg, rectOf(k % N, (k / N) | 0));
    }
    lg.globalAlpha = 1;
    if (st.live) {                                                    // live model: every cell shows the current view
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = grid[y * N + x]; if (v < 0.07) continue;
        const [vv, grow, ox, oy] = lift(x, y, v), tf = tw[y * N + x] * 2, col = colorOf(x, y, v, vv, tf), r = rectOf(x + ox, y + oy, grow);
        lg.fillStyle = col || tone(vv, tf); fq(lg, r);
      }
    } else {
    const heads = [], cur = [];                                       // cur: where every cell is this frame and what colour it has, so a click on next mid-way starts from here
    for (const c of trav) {
      let h = (t - c.delay) / c.step;
      if (h < 0) {
        if (c.hold) { lg.fillStyle = `rgb(${c.c0})`; fq(lg, rectOf(c.path[0], c.path[1])); cur.push({ x: c.path[0], y: c.path[1], c: c.c0 }); }   // not its turn yet: still where the last picture had it, in its colour
        continue;
      }
      if (h < c.len - 1) {                                            // still walking: glides cell to cell, each hop eased in and out
        for (let k = 0; k < 3; k++) {
          const hh = h - k * 0.9; if (hh < 0) break;
          const p = Math.floor(hh), f = hh - p, e = f * f * (3 - 2 * f), p2 = Math.min(p + 1, c.len - 1);
          const px = c.path[p * 2] + (c.path[p2 * 2] - c.path[p * 2]) * e, py = c.path[p * 2 + 1] + (c.path[p2 * 2 + 1] - c.path[p * 2 + 1]) * e;
          const u = Math.min(1, hh / Math.max(1, c.len - 1)), rgbv = c.c0 ? [0, 1, 2].map((q) => c.c0[q] + (c.c1[q] - c.c0[q]) * u * u * (3 - 2 * u)) : null;   // the colour changes a little with every hop
          heads.push([px, py, c.c0 ? [1, 0.55, 0.3][k] : 0.6 - k * 0.2, rgbv ? mixRgb(rgbv, rgbv, 0) : null]);
          if (k === 0) cur.push({ x: px, y: py, c: rgbv ? rgbv.map(Math.round) : c.c1 });
        }
        continue;
      }
      if (c.gone) continue;                                           // a spare cell has reached the middle: it vanishes
      if (c.seat < 0 && !c.dead) seatWalker(c);                       // landed: takes its spot on the live model
      if (c.dead) continue;
      if (c.px === undefined) { c.px = c.seat % N; c.py = (c.seat / N) | 0; }
      const sx = c.seat % N, sy = (c.seat / N) | 0, flash = Math.max(0, 1 - (h - c.len + 1) * c.step / 0.14); // soft refresh flash on arrival
      c.px += (sx - c.px) * 0.4; c.py += (sy - c.py) * 0.4;           // a hop to a new spot is a quick glide
      const lv = grid[c.seat], [vv, grow, ox, oy] = lift(sx, sy, lv), r = rectOf(c.px + ox, c.py + oy, grow);
      let col = '';
      if (c.sc0) { const u = (t - c.sdl) / c.sdu; if (u < 1) col = mixRgb(c.sc0, rgbAt(grid, c.seat), u <= 0 ? 0 : u * u * (3 - 2 * u)); }   // a cell that did not move: its colour changes gradually, never at once
      if (!col) col = colorOf(sx, sy, lv, vv, flash);
      lg.fillStyle = col || tone(vv, flash); fq(lg, r);
      cur.push({ x: c.px, y: c.py, c: c.c1 });
    }
    lastLit.cells = cur;
    for (const [x, y, a, col] of heads) { lg.fillStyle = col || tone(1, 0.6); const r = rectOf(x, y); lg.globalAlpha = Math.max(0, a); fq(lg, r); }
    lg.globalAlpha = 1;
    }
    if ('filter' in g) {                                              // ink bloom: the same picture again, blurred and faint, underneath
      g.save(); g.filter = `blur(${Math.max(2, cell * 0.8)}px)`; g.globalAlpha = dark ? 0.2 : 0.14; g.drawImage(lc, 0, 0); g.restore();
    }
    g.drawImage(lc, 0, 0);
    if (vigCv) g.drawImage(vigCv, 0, 0);                              // the panel's edges sit a touch darker
    if (fl > 0) {                                                     // full refresh: every cell flashes once, fast
      g.fillStyle = dark ? `rgba(255,255,255,${fl * 0.5})` : `rgba(22,22,27,${fl * 0.55})`;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) fq(g, rectOf(x, y));
    }
    g.globalAlpha = 1;
  };
  cancelAnimationFrame(litRaf); if (litRO) litRO.disconnect();
  size();
  if (!reduced) paint(performance.now());                            // draw the first frame now, so the canvas is never empty for a frame between two projects
  const loop = (now) => { paint(now); litRaf = requestAnimationFrame(loop); };
  if (reduced) { st.live = true; paint(performance.now()); }
  litRO = new ResizeObserver(() => { size(); if (reduced) paint(performance.now()); }); litRO.observe(cv);
  if (!reduced) litRaf = requestAnimationFrame(loop);
  /* drag to turn the model: horizontal = spin (snaps to 45 degrees on release), vertical = a light tilt (springs back) */
  let px = 0, py = 0, vel = 0, lt = 0;
  cv.onpointerdown = (e) => {
    if (e.button) return;
    lastAct = performance.now();
    st.drag = true; st.target = null; st.vy = 0; st.vp = 0; px = e.clientX; py = e.clientY; vel = 0; lt = performance.now();
    cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing');
  };
  cv.onpointermove = (e) => {
    lastAct = performance.now();
    const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * N; mouse.y = (e.clientY - r.top) / r.height * N;
    if (!st.drag) return;
    const dx = e.clientX - px, dy = e.clientY - py, now = performance.now(), dtm = Math.max(1, now - lt) / 1000;
    px = e.clientX; py = e.clientY; lt = now;
    st.yaw -= dx * 0.011; vel = vel * 0.6 + (-dx * 0.011 / dtm) * 0.4;
    if (e.pointerType !== 'touch') st.pitch = Math.max(scene.pitch0 - TILT, Math.min(scene.pitch0 + TILT, st.pitch + dy * 0.004));
    st.dirty = true;
  };
  const release = () => {
    if (!st.drag) return;
    st.drag = false; cv.classList.remove('grabbing');
    st.vy = Math.max(-9, Math.min(9, vel)); st.target = snapTo(st.yaw + st.vy * 0.12);
    if (reduced) { st.yaw = st.target; st.target = null; st.pitch = scene.pitch0; st.dirty = true; paint(performance.now()); }
  };
  cv.onpointerup = release; cv.onpointercancel = release;
  cv.onlostpointercapture = release;
  cv.ondblclick = () => { st.live = true; st.target = snapTo(scene.yaw0 + Math.round((st.yaw - scene.yaw0) / (2 * Math.PI)) * 2 * Math.PI); };   // back to the starting view
  cv.onpointerleave = () => { if (!st.drag) mouse.x = mouse.y = -99; };
}
function stopLit() { cancelAnimationFrame(litRaf); if (litRO) litRO.disconnect(); }

/* ============ QUICK LOOK (placeholder for the detail page) ============ */
let lastFocus = null, qlId = null, extraTok = 0;
function renderExtra(f) {                                              // small notes on faint cards under the description
  const x = EXTRA[f.id], box = $('#qlExtra'); if (!x) { box.innerHTML = ''; return; }
  const li = (a) => a.map((s) => `<li>${esc(s)}</li>`).join('');
  const rel = DATA.filter((d) => d.id !== f.id).map((d) => ({ d, s: (d.ext === f.ext ? 3 : 0) + d.tags.filter((t) => f.tags.includes(t)).length * 2 - Math.abs(d.id - f.id) / 100 })).sort((a, b) => b.s - a.s).slice(0, 3).map((r) => r.d);
  box.innerHTML = `<div class="xrow x2"><div class="xcard"><h4>The challenge</h4><p>${esc(x.c)}</p></div><div class="xcard"><h4>The approach</h4><p>${esc(x.a)}</p></div></div>
    <div class="xrow x3"><div class="xcard"><h4>Key features</h4><div class="chips">${x.f.map((s) => `<span>${esc(s)}</span>`).join('')}</div></div><div class="xcard"><h4>What I delivered</h4><ul>${li(x.d)}</ul></div><div class="xcard"><h4>At a glance</h4><ul>${li(x.g)}</ul></div></div>
    <div class="xout"><h4>Keep exploring</h4><div class="xlike">${rel.map((r) => `<button type="button" data-id="${r.id}"><canvas width="150" height="150" data-id="${r.id}"></canvas><b>${esc(r.short)}</b></button>`).join('')}</div></div>`;
  box.querySelectorAll('.xlike canvas').forEach((cv) => {
    const g = cv.getContext('2d'), gr = motifGrid(+cv.dataset.id), dk = docEl.dataset.theme !== 'light';
    for (let yy = 0; yy < 50; yy++) for (let xx = 0; xx < 50; xx++) {
      const v = gr[yy * 50 + xx]; if (v < 0.07) continue;
      g.fillStyle = `hsl(205 ${dk ? 6 : 8}% ${dk ? 42 + v * 50 : 30 + v * 44}%)`; g.fillRect(xx * 3, yy * 3, 2.5, 2.5);
    }
  });
  box.querySelectorAll('.xlike button').forEach((b) => b.addEventListener('click', () => openQL(DATA.find((d) => d.id === +b.dataset.id))));
}
function openQL(f) {
  $('#qlLights').classList.remove('expanded');
  const wasOpen = $('#qlBack').classList.contains('open');
  if (!wasOpen) lastFocus = document.activeElement;
  qlId = f.id;
  const many = visibleList().length > 1;
  $('#qlPrev').disabled = $('#qlNext').disabled = $('#qlPrev2').disabled = $('#qlNext2').disabled = !many;
  $('#qlName').textContent = f.short;
  $('#qlTitle').textContent = f.discreet;
  $('#qlTags').innerHTML = f.tags.map((t) => `<span>${esc(t)}</span>`).join('');
  $('#qlSnippet').textContent = f.snippet;
  $('#qlRole').textContent = f.role;
  $('#qlTool').textContent = f.tool;
  mountRedact($('#qlClient'));
  $('#qlClient').closest('div').style.display = f.nda ? '' : 'none';   // open work: no client to hide
  if (wasOpen) { const tok = ++extraTok; setTimeout(() => { if (tok === extraTok && qlId === f.id) { renderExtra(f); fitQL(); } }, 90); }   // stepping: the cards below wait a moment so the canvas starts moving at once
  else { extraTok++; renderExtra(f); }
  $('#qlBack').classList.add('open');
  docEl.classList.add('ql-lock');
  $('.ql-body').scrollTop = 0;
  drawLit($('#qlCanvas'), f.id);
  if (!wasOpen) $('#qlClose').focus();
  fitQL();
  const L = $('.ql-left'); L.style.animation = 'none'; void L.offsetWidth; L.style.animation = '';   // content eases in again when you step to another project
}
function fitQL() {                                                     // window runs off the bottom of the screen when its content is taller
  const body = $('.ql-body'); $('#qlBack .ql').classList.toggle('full', body.scrollHeight > body.clientHeight + 1);
}
on(window, 'resize', () => { if ($('#qlBack').classList.contains('open')) fitQL(); });
function stepQL(d) {                                                   // previous / next project in what the window currently shows (filter + sort), wraps around
  const list = visibleList(), i = list.findIndex((p) => p.id === qlId);
  if (i < 0 || list.length < 2) return;
  openQL(list[(i + d + list.length) % list.length]);
}
$('#qlPrev').addEventListener('click', () => stepQL(-1));
$('#qlNext').addEventListener('click', () => stepQL(1));
$('#qlPrev2').addEventListener('click', () => stepQL(-1));
$('#qlNext2').addEventListener('click', () => stepQL(1));
on(window, 'keydown', (e) => {
  if (!$('#qlBack').classList.contains('open') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); stepQL(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); stepQL(-1); }
});
function closeQL() {
  stopLit(); lastLit = null;
  docEl.classList.remove('ql-lock');
  $('#qlBack').classList.remove('open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
$('#qlBack').addEventListener('pointerdown', (e) => { if (e.target.id === 'qlBack') closeQL(); });
$('#qlDone').addEventListener('click', closeQL);
on(window, 'keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('#qlBack').classList.contains('open')) closeQL(); else if (docEl.classList.contains('drawer-open')) closeDrawer(); else closeMenu();
});

/* ============ MOBILE: filter drawer ============ */
const scrim = document.createElement('div');
scrim.className = 'scrim';
$('#win').appendChild(scrim);
scrim.addEventListener('pointerdown', () => { if (docEl.classList.contains('drawer-open')) closeDrawer(); });
function openDrawer() {
  docEl.classList.add('drawer-open');
  $('#filterBtn').setAttribute('aria-expanded', 'true');
  const c = root.querySelector('.side-item[aria-current="true"]'); if (c) c.focus({ preventScroll: true });
}
function collapseLights() { const L = $('#lights'); if (L) L.classList.remove('expanded'); }
function closeDrawer() { docEl.classList.remove('drawer-open'); $('#filterBtn').setAttribute('aria-expanded', 'false'); collapseLights(); }
function syncMobile() { $('#filterBtn').tabIndex = isMobile() ? 0 : -1; }
$('#filterBtn').addEventListener('click', () => { if (isMobile()) openDrawer(); });

/* ============ INIT ============ */
let resizeT = 0;
function init() {
  on(window, 'scroll', () => kickFade(160), { passive: true });
  on(window, 'resize', () => kickFade(600));
  initLights();
  measure();
  build();
  measure();                                                // now that files exist, size the cell to the tallest label
  loose = loadLoose();
  addTagFilters();
  buildSide();
  buildMenu();
  syncMobile();
  canvas.classList.toggle('can-drag', canDrag);
  buildAccess();
  go(validKey(opts.initial && opts.initial.filter));
  $('#win').classList.add('ready');
  if (opts.initial && opts.initial.open) setTimeout(() => showView({ open: opts.initial.open }), 60);
  on(window, 'resize', () => {
    if (!reduced) docEl.classList.add('resizing');                  // files pause and dim while the size is still changing...
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {                                          // ...then settle into the right spacing for the new size
      if (!isMobile()) closeDrawer();
      syncMobile();
      canDrag = !coarse && innerWidth >= 700;
      canvas.classList.toggle('can-drag', canDrag);
      measure();
      if (!canDrag) { loose = gridOf(DATA); looseW = field.clientWidth; looseC = cols(); }
      sync();
      docEl.classList.remove('resizing');
    }, 420);
  });
}
init();

/* ============ TEAR DOWN (leaving the page) ============ */
function destroy() {
  dead = true;
  offs.forEach((f) => f());
  cancelAnimationFrame(fadeRaf); stopLit();
  els.forEach((el) => clearTimeout(el._t));
  clearTimeout(resizeT); clearTimeout(setView.t);
  docEl.classList.remove('ql-lock', 'drawer-open', 'resizing');
  docEl.style.removeProperty('--tbh');
  if (litRO) litRO.disconnect();
}
destroy.show = showView;
return destroy;


}

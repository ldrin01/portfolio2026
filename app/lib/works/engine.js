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
let filter = 'all', sort = 'default', view = 'icons';
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
    CW = Math.max(108, Math.floor((field.clientWidth - PAD) / 2)); FW = CW - 6;
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
  const l = DATA.filter((f) => filter === 'all' || f.tags.includes(filter));
  if (sort !== 'default') {
    const [k, d] = sort.split('-'), sgn = d === 'desc' ? -1 : 1;
    l.sort((a, b) => sgn * KEY[k](a).localeCompare(KEY[k](b)) || a.short.localeCompare(b.short));
  }
  return l;
}
const isDefault = () => filter === 'all' && sort === 'default';
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
  $('.toolbar').style.transform = isMobile() ? '' : `translateY(${-Math.max(0, 96 + sd.height - $('#win').getBoundingClientRect().bottom)}px)`;
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
  const place = () => { if (isMobile()) $('#qlBack').appendChild(q); else $('.ql-top').prepend(q); };   // on phones the lights float outside the window, over its top-left corner
  place(); on(mobileMQ, 'change', place);
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
function go(key) {
  const changed = key !== filter;
  filter = key;
  root.querySelectorAll('.side-item').forEach((b) => b.setAttribute('aria-current', b.dataset.key === key ? 'true' : 'false'));
  const tt = $('#titleText');
  tt.textContent = labelOf(key);
  if (changed) { tt.style.animation = 'none'; void tt.offsetWidth; tt.style.animation = ''; }
  canvas.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  if (MODE === 'page' && scrollY > 0) scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  listEl.scrollTo({ top: 0 });
  sync();
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
let litRaf = 0, litRO = null;
function drawLit(cv, id) {
  const scene = motifScene(id);                               // a real little 3D model, rendered into the 50x50 grid
  const dark = docEl.dataset.theme !== 'light';
  const SNAP = Math.PI / 4, TILT = 0.21;                              // snap every 45 degrees; tilt up to ~12 degrees
  const st = { yaw: scene.yaw0, pitch: scene.pitch0, vy: 0, vp: 0, target: null, drag: false, live: reduced, dirty: false };
  let grid = scene.render(st.yaw, st.pitch);
  /* entrance: every lit cell is reached by a little light that walks in from a random point (any side, corner or inside), like an ant:
     lights come from everywhere, not from the nearest edge.
     The walk wanders (sideways steps, stalls and bursts) and never goes in a straight line. */
  let seed = id * 2654435761 >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const trav = []; let tEnd = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = grid[y * N + x]; if (v < 0.07) continue;
    const cl = (n) => Math.max(0, Math.min(N - 1, n)), pick = rnd();
    let px, py;
    if (pick < 0.72) {                                        // anywhere along the whole border: any side, any corner, whatever it likes
      const q = rnd() * 4 * (N - 1), s = Math.floor(q % (N - 1)), side = Math.floor(q / (N - 1));
      px = side === 0 ? s : side === 1 ? N - 1 : side === 2 ? N - 1 - s : 0;
      py = side === 0 ? 0 : side === 1 ? s : side === 2 ? N - 1 : N - 1 - s;
    } else if (pick < 0.86) { px = Math.floor(rnd() * N); py = Math.floor(rnd() * N); }                      // drifts in from somewhere inside the grid
    else { px = cl(x + Math.round((rnd() - 0.5) * 18)); py = cl(y + Math.round((rnd() - 0.5) * 18)); }        // starts close to home
    const wob = 0.03 + rnd() * 0.08;                          // only ~10% of moves are extra detours
    const path = [px, py];
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
    const c = { x, y, v, path: Uint8Array.from(path), len: path.length / 2, delay: (hash % 1000) / 1000 * 0.75, step: 0.0072 + rnd() * 0.0075, ph: rnd() * 6.28 };
    tEnd = Math.max(tEnd, c.delay + (c.len + 2) * c.step + 0.25);
    trav.push(c);
  }
  const mouse = { x: -99, y: -99 }, sm = { x: 25, y: 25, k: 0 }, t0 = performance.now();
  let cell = 0, W = 0, last = t0;
  const size = () => {
    const css = cv.clientWidth; if (!css) return;
    cv.style.height = css + 'px';                                     // always a perfect square
    W = Math.round(css * Math.min(devicePixelRatio || 1, 2));
    cv.width = cv.height = W; cell = W / N;
  };
  const tone = (v, flash) => {                                        // light gray ink; more light = brighter gray
    const l = dark ? 42 + v * 50 + flash * 6 : 30 + v * 44 + flash * 8;   // light mode keeps the same shading: top face lightest, shaded sides darker
    return `hsl(205 ${dark ? 6 : 8}% ${l}%)`;
  };
  const rectOf = (x, y, grow) => {
    const gp = Math.max(1, Math.round(cell * 0.14)), ex = grow ? gp * 0.5 * grow : 0;
    const x0 = Math.round(x * cell), y0 = Math.round(y * cell);
    return [x0 + gp / 2 - ex, y0 + gp / 2 - ex, Math.round((x + 1) * cell) - x0 - gp + ex * 2, Math.round((y + 1) * cell) - y0 - gp + ex * 2];
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
  const paint = (now) => {
    if (!W) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = reduced ? 99 : (now - t0) / 1000;
    if (!st.live && t > tEnd) st.live = true;
    step(dt);
    if (st.dirty) { grid = scene.render(st.yaw, st.pitch); st.dirty = false; }
    sm.k += ((mouse.x > -50 ? 1 : 0) - sm.k) * 0.12;                  // hover strength eases in and out
    if (mouse.x > -50) { sm.x += (mouse.x - sm.x) * 0.25; sm.y += (mouse.y - sm.y) * 0.25; }
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, W);
    g.fillStyle = dark ? 'rgba(255,255,255,.02)' : 'rgba(22,22,27,.018)';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = rectOf(x, y); g.fillRect(r[0], r[1], r[2], r[3]); }   // off cells
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
    if (st.live) {                                                    // live model: every cell shows the current view
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = grid[y * N + x]; if (v < 0.07) continue;
        const [vv, grow, ox, oy] = lift(x, y, v), r = rectOf(x + ox, y + oy, grow);
        g.fillStyle = tone(vv, 0); g.fillRect(r[0], r[1], r[2], r[3]);
      }
      return;
    }
    const heads = [];
    for (const c of trav) {
      let h = (t - c.delay) / c.step;
      if (h < 0) continue;
      if (h < c.len - 1) {                                            // still walking: glides cell to cell, each hop eased in and out
        for (let k = 0; k < 3; k++) {
          const hh = h - k * 0.9; if (hh < 0) break;
          const p = Math.floor(hh), f = hh - p, e = f * f * (3 - 2 * f), p2 = Math.min(p + 1, c.len - 1);
          heads.push([c.path[p * 2] + (c.path[p2 * 2] - c.path[p * 2]) * e, c.path[p * 2 + 1] + (c.path[p2 * 2 + 1] - c.path[p * 2 + 1]) * e, 0.6 - k * 0.2]);
        }
        continue;
      }
      const flash = Math.max(0, 1 - (h - c.len + 1) * c.step / 0.14); // soft refresh flash on arrival
      const [vv, grow, ox, oy] = lift(c.x, c.y, c.v), r = rectOf(c.x + ox, c.y + oy, grow);
      g.fillStyle = tone(vv, flash); g.fillRect(r[0], r[1], r[2], r[3]);
    }
    g.fillStyle = tone(1, 0.6);
    for (const [x, y, a] of heads) { const r = rectOf(x, y); g.globalAlpha = Math.max(0, a); g.fillRect(r[0], r[1], r[2], r[3]); }
    g.globalAlpha = 1;
  };
  cancelAnimationFrame(litRaf); if (litRO) litRO.disconnect();
  size();
  const loop = (now) => { paint(now); litRaf = requestAnimationFrame(loop); };
  if (reduced) { st.live = true; paint(performance.now()); }
  litRO = new ResizeObserver(() => { size(); if (reduced) paint(performance.now()); }); litRO.observe(cv);
  if (!reduced) litRaf = requestAnimationFrame(loop);
  /* drag to turn the model: horizontal = spin (snaps to 45 degrees on release), vertical = a light tilt (springs back) */
  let px = 0, py = 0, vel = 0, lt = 0;
  cv.onpointerdown = (e) => {
    if (e.button) return;
    st.drag = true; st.live = true; st.target = null; st.vy = 0; st.vp = 0; px = e.clientX; py = e.clientY; vel = 0; lt = performance.now();
    cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing');
  };
  cv.onpointermove = (e) => {
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
let lastFocus = null, qlId = null;
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
  renderExtra(f);
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
  stopLit();
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
  buildSide();
  buildMenu();
  syncMobile();
  canvas.classList.toggle('can-drag', canDrag);
  go('all');
  $('#win').classList.add('ready');
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
return function destroy() {
  dead = true;
  offs.forEach((f) => f());
  cancelAnimationFrame(fadeRaf); stopLit();
  els.forEach((el) => clearTimeout(el._t));
  clearTimeout(resizeT); clearTimeout(setView.t);
  docEl.classList.remove('ql-lock', 'drawer-open', 'resizing');
  docEl.style.removeProperty('--tbh');
  if (litRO) litRO.disconnect();
};


}

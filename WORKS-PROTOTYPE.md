# Works page prototype: working log

Written 2026-11-10 so any session (or the owner) can pick this up or back-track. Nothing here is wired into the Nuxt app yet. It is all static HTML/CSS/JS served from `public/`, so it appears on the dev server at `http://localhost:3000/...`.

## What exists (all in `public/`)

| File | URL | Purpose |
| --- | --- | --- |
| `works-prototype.html` | `/works-prototype.html` | **Framed window** version: a placeholder homepage frame (blank blocks) with a Finder-style window in the middle. This is the future homepage "Works" teaser. |
| `works-page-prototype.html` | `/works-page-prototype.html` | **Full-page** version: the page itself is the window (no frame). This is the future `/works` page. |
| `works.css`, `works.js` | n/a | Shared styles and logic. Both pages use these, so every change lands on both. Mode comes from `<html data-mode="window\|page">`. |
| `works-data.js` | n/a | The 25 projects (public columns only, **no client names**). `EXT` maps file extensions to categories. |
| `redact.js` | n/a | The decoy client-name effect (see below). |
| `nda-prototype.html` | `/nda-prototype.html` | Plain "why is this name hidden" page that the NDA pill links to. |
| `fonts/funnel-display-latin-wght-normal.woff2` | n/a | Copy of the site font so the static pages load it. |

**Before launch:** `public/` ships with the site. Delete these prototype files and `public/fonts/` (or move the useful parts into `app/` and `content/`).

**Rule for edits:** keep both prototypes in sync by editing the shared `works.css` / `works.js` / `works-data.js`, never one HTML shell only. (The owner flagged this: "apply things synchronously".)

## Design decisions (owner-approved)

- **Concept:** works are *files* in a macOS Finder window. Homepage shows a Finder window (to be trimmed to only a few files, not all 25). The Works page is the window itself, with all controls but no frame or traffic lights.
- **Extensions** (by main feature): `.inf` informative, `.web` web app, `.app` mobile app, `.shp` e-commerce, `.sys` admin/system, `.fx` interactive, `.3d` 3D. Defined in `works-data.js`.
- **Selection colour:** blue in light mode, yellow in dark mode. Single click selects, double-click opens (tap, then tap again on touch).
- **Icons:** white page thumbnail with faint generated text lines, left edge aligned to the left edge of the title text; selected = soft rounded tile + solid label pill.
- **Files are freely draggable and may overlap**; positions are saved per browser (`localStorage` key `works.proto.pos.v5.<mode>`). Clean up snaps them to a grid.
- **Sort:** one control, button always says "Sort". Menu = As arranged, A–Z, Z–A (name). List-view column headers also sort (Name, Type, Role, Tools; asc, desc, none) and share the same state.
- **Filters** in the sidebar (Works: All, Informative, Web App, Mobile App, E-commerce, Interactive, Admin, 3D; Tags: Loyalty, Subscription, Pre-order). Search was **removed** on request.
- **Status bar:** count on the left, selected name in the middle, "Clean up" with a broom on the right (broom sweeps when clicked).
- **List view:** Finder-style rows, striping starts on the 2nd row, header line runs edge to edge, columns resizable and sortable, whole list scrolls sideways, last row clears the bottom fade.
- **Traffic lights (window mode):** red scrolls to the next frame, yellow flashes a smiley then returns, green opens the Works page. In page mode green is disabled.
- **Preview card:** clicking a file once shows a card with the 50×50 "light grid", discreet title, tags, redacted client + NDA link, role, tools, type, Open button. **The light grid is a demo** (procedural picture -> auto-levels -> Bayer dither -> on/off dots tinted by average colour). The real version will take an uploaded image through the same steps at build time and store the cell array.
- **Quick Look:** double-click opens a modal placeholder for the future detail page. Planned: ~8-10 strongest projects get a full page (#5, 7, 11, 12, 15, 18, 20, 23, 24, 25 in the sheet); thin ones (#3, 10, 14, 16, 19) stay Quick Look only.
- **Decoy client name** (`redact.js`): black block of text; random length each time; hover scrambles only the hovered characters, click sends a quick radial wave; terminal-style stepped swaps (~48ms), tiny scale/lift only; slow idle flicker; decoy only, never real text; `aria-label="Client name hidden under NDA"`, tooltip "nothing to find here", console message; respects reduced motion. Client name only.
- **NDA rule:** all client work is under NDA. Never put client names, logos or links in any file. `NOTES.md` has the industries list. The sheet `~/Downloads/Portfolio_Projects_Final.xlsx` has private columns B and I (real names and notes): never copy those.

## Responsive behaviour

- **Resizing:** files dim and pause while the size is changing, then ~0.4s after you stop they glide into the layout for the new width. When the column count changes the arrangement is re-laid out in reading order (not stretched). Cell sizes are 148px desktop and 108px phone; each grid row is as tall as its tallest label, so nothing overlaps in the default or Clean up layouts.
- **Phone (<=760px):**
  - Sidebar becomes a drawer opened by a chevron-right button; the title text sits next to it.
  - Sort becomes a chevron-down icon button.
  - The drawer's traffic lights start at web size, and the first tap enlarges them into a pill with big buttons (x closes the drawer, - flashes the smiley, up-right arrow goes to the Works page).
  - Preview becomes a bottom sheet with a grabber (swipe down or tap the backdrop to dismiss).
  - Quick Look has a Done button and a big close target.
  - No dragging on touch (grid only); list scrolls sideways.
  - Status bar shows "Tap a file to preview, tap again to open".
- **Reduced motion:** all transitions and animations are disabled.
- **Motion language:** springy `cubic-bezier(.3, 1.4, .5, 1)` pops and `(.2, .8, .2, 1)` glides, copied from the site's menu components. The drawer slide uses the non-bouncing ease on purpose.

## Mistakes already fixed (do not reintroduce)

- A dark overlay was layered above the mobile drawer, so taps hit the overlay. Overlay, drawer and sheet now live inside `.win`.
- A listener was bound before its element existed (broke init). Everything that touches built DOM runs after `init()` builds it.
- Quick Look's close dot was hidden by a mobile rule. It is now always visible.
- Saved positions from a wide window piled files up when the window narrowed. Now re-laid out when the column count changes.
- Status bar was clipped off the bottom (grid row `min-height` issue). Fixed with `grid-template-rows: minmax(0, 1fr)` and `.main { min-height: 0 }`.

## Still to do (owner has not asked for these yet unless noted)

1. **Homepage teaser:** trim the framed window to a few files (the owner does not want everything shown at once); consider a closed-folder teaser with a zoom-open transition into the Works page.
2. **Detail page** per work: long discreet title on the left, 50×50 light grid on the right, modular data cards below (type, label, value). Use structural facts (e.g. "3 sites, 1 structure", "2 apps"), **not** real client metrics (NDA).
3. **Real light-grid pipeline:** build-time script that takes an image, averages to 50×50, auto-levels, dithers, stores the cells and average colours. Per-project invert and threshold options.
4. **Blank Role/Tool list** for the 25 projects was offered but not sent.
5. **Move into the Nuxt app:** components under `app/`, content under `content/`. Follow the loader rule (nothing shows over the DRINWORKS loader; wait for `loaderDone`) and read `~/Code/CMS-RULES.md` before any admin/CMS work.
6. **Real NDA page** on the site (the prototype's `nda-prototype.html` is a stand-in).
7. Verify animations and dragging on a real device (only tested with headless Chrome and synthetic events so far).

## How it was tested

Headless Chrome driven over the DevTools protocol (Node 24, no extra packages) with real touch/pointer events at 390, 820, 1000, 1100 and 1440 wide: overlap checks, filter counts, sorts, drag and clamping, drawer, sheet, Quick Look, resize reflow, list geometry, column resize. Scripts lived in a temp scratchpad (`/private/tmp/...`) and may be gone; recreate them if needed. Backups of earlier versions (v3 window, v6 css/js) were in `/private/tmp/wp/bak` (temporary).

## Update 2026-11-11: project window (Quick Look) rebuilt

- Double-click opens a big window: title + tags + stacked Client / Role / Tools on the left, the 50x50 grid on the right (always a perfect square), long description bottom (left-aligned). No eyebrow, no rule, no hr lines, no extension text. The old right-side preview card was removed. Background scroll is locked while it is open (`html.ql-lock`).
- Grid look: e-ink. Lit cells = light gray squares with small gaps, faint cool tint, same for every project. Off cells = barely-there faint squares. No dither, no pattern fill: each cell takes its gray from the project's motif.
- `motifs.js` (loaded by both pages) draws one motif per project (100x100 units), crops to ink, scales uniformly (ratio locked) to touch the edges on the long side, samples 50x50 grays. Ids 12, 15, 23 have no project (fallback ring).
- NDA block (`redact.js`): light-gray ink tiles that touch (no gaps), same gray as the grid (`--ink`). Hover/click wipes the tile colour for a moment and shows terminal symbols, click = radial wave. Name shape is random: one word, "The X", "X Inc./Corp.", or several words (spaces are empty cells). Bar height equals the Role/Tools text height.

## Update 2026-11-11 (later): motifs are now isometric dioramas

- `public/motifs.js` redrawn: every project is an isometric object (30-degree angle, light from top-left: top face brightest, left mid, right darkest, thin dark seams between faces), no ground slab, so all objects use the cells. Same hand for all 22. A flat version is saved at `/private/tmp/motifs.flat.bak` (temporary).
- Grid entrance: each lit cell is reached by a light that wanders in ant-like from its nearest edge. Chevrons/arrow keys follow the current filter and sort.

## Update 2026-11-11 (latest): 3D motifs you can turn + fixed project window frame

- `public/motifs.js` is now a tiny 3D engine + 22 real 3D models (boxes, tubes, tori, extrusions, spheres; thin pieces are real 3D too). `motifScene(id).render(yaw, pitch)` rasterises a z-buffer at 200x200, one fixed light, thin seams, 4x4 average to 50x50. Default view = isometric. Scaled once so it never pulses while turning (84% fit). The earlier flat isometric drawings are in `/private/tmp/motifs.iso2d.bak` (temporary).
- `works.js` `drawLit`: drag the grid to turn it (horizontal = spin, snaps to the nearest 45 degrees with a soft spring; vertical = light tilt up to ~12 degrees that springs back; touch = spin only, vertical scroll still works). Double-click returns to the starting view. Ant entrance plays on the starting view, then the grid goes live.
- Project window: top edge and top bar never move (window anchored 32px from the top, 20px on phones). Taller content runs off the bottom and scrolls under the translucent bar (`.ql-body` is the scroller, `.ql.full` squares the bottom corners). Backdrop z-index 2000 so it covers the site header.
- Placeholder frames (`.ql-more`) under the description: skeleton paragraphs, a wide frame, two frames, a split, three small frames. Static, same in both pages. Delete when real content exists.

## Update 2026-11-12: motif refresh

- Motifs rebuilt in `public/motifs.js`: 4 (magnifier + 3D user icon), 5 (monogram-style handbag, no brand), 8 (burger + iced drink with straw; replaces drumstick), 9 (tall milk bottle), 10 (envelope + big heart), 11 (capsule, no ring), 12 (wine bottle + glass), 15 (shopping bags + clapperboard), 22 (croissant), 23 (ringed sphere, cube, cone, ball). Previous drumstick version: `/private/tmp/motifs.pre-burger.bak` (temporary).
- Project window: `.ql-main` aligned to top so the grid stays put between projects; description flush with the left edge of the title column.

## Update 2026-11-12: project notes under the description

- Placeholder frames replaced by faint small-text cards in `#qlExtra` (rendered by `renderExtra` in `works.js`): The challenge, The approach, Key features, What I delivered, At a glance, and 3 "more like this" model thumbnails that open that project.
- Text lives in `EXTRA` at the bottom of `works-data.js` (first person, no client names or metrics). It was written from the snippets, so the owner should correct anything that is not accurate. Backup before: `/private/tmp/works-data.pre-extra.bak` (temporary).

## Update 2026-11-12: moved into the Nuxt app

- **Live on the site:** `/works` (`app/pages/works.vue`, mode `page`), the home page's "Works" frame (`app/pages/index.vue`, mode `window`, lazy: `LazyWorksWindow hydrate-on-visible`), `/nda` (`app/pages/nda.vue`, replaces `nda-prototype.html`).
- **Where things went:** markup `app/components/WorksWindow.vue`; behaviour `app/lib/works/engine.js` (`mountWorks(root, opts)` returns a destroy function; global listeners are tracked and removed on leave); `motifs.js` and `redact.js` beside it; data `app/data/works.js` (`DATA`, `EXT`, `EXTRA`); styles `app/assets/css/works.css` (every rule under `.wk`, keyframes prefixed `wk-`, so nothing touches the rest of the site).
- **Edit here now, not in `public/`.** The `public/works*.{html,css,js}`, `motifs.js`, `redact.js`, `nda-prototype.html`, `fonts/` and the empty `orks.js` are now stale copies: delete before launch.
- **Menu revision:** `content/header.json` has Works (3rd link, so the footer and search get it too); `SiteMenu.vue` link size is now `clamp(34px, min(6.6vw, 9vh), 92px)`, line-height .98, no padding.
- **Changes from the prototype:** theme is the site's own toggle (no prototype button); saved positions use `works.pos.v1.<mode>` / `works.cols.v1`; the sort menu id is `wkSortMenu` (the site menu owns `#menu`); the window is a `div`, not a `section` (the site styles every `section` full-screen); SEO entries `works` and `nda` in `content/seo.json`.
- **Still open:** works data is not in the CMS yet (it lives in `app/data/works.js`); the home frame still shows all 25 files (trim idea in "Still to do" #1 not done); per-project detail pages; real light-grid pipeline.

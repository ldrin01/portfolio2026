/* A Works project's own 3D icon, written as JSON (usually by an AI from a reference picture, see MODEL_PROMPT).
   readModel() checks it and returns a clean copy (known fields only, numbers rounded and kept in range) plus plain-language
   problems (block saving) and warnings (saved anyway). Used by the admin's 3D icon tab and by the save check on the server.
   motifs.js draws the clean copy with the same renderer as the built-in icons. */

export const MODEL_MAX_PARTS = 25;

export const MODEL_PROMPT = `I attach a reference image of an object. Make a lightweight 3D model of it as
ONE JSON file. Reply with only the JSON in a code block, nothing else.

FORMAT (use only these part types and fields):

{
  "name": "short object name",
  "parts": [
    { "type": "box",     "pos": [x,y,z], "size": [w,d,h], "turn": 0, "shade": 1 },
    { "type": "tube",    "from": [x,y,z], "to": [x,y,z], "r0": 1, "r1": 1, "shade": 1 },
    { "type": "sphere",  "pos": [x,y,z], "r": 1, "shade": 1 },
    { "type": "torus",   "pos": [x,y,z], "axis": "z", "R": 3, "r": 0.5, "arc": 360, "turn": 0, "shade": 1 },
    { "type": "extrude", "plane": "xy", "points": [[a,b], ...], "at": 0, "h": 1, "shade": 1 }
  ]
}

WHAT EACH FIELD MEANS
- Z is up. X is left-right, Y is front-back. Units are arbitrary; keep the
  proportions true. Stand the object on z = 0 and centre it on x = 0, y = 0.
- box: "pos" is the CENTRE of the box. "size" is [width along x, depth along y,
  height along z]. "turn" (optional) rotates it around the up axis, in degrees.
- tube: a cylinder or cone from "from" to "to". "r0" is the radius at "from",
  "r1" at "to". Use r1 = 0 for a point (cone). Both ends are closed.
- sphere: "pos" is the centre, "r" the radius.
- torus: a ring. "pos" is its centre, "axis" is the direction its hole faces
  ("x", "y" or "z"), "R" is the ring radius, "r" the thickness radius.
  "arc" (optional, degrees, default 360) makes a partial ring, e.g. 180 for a
  handle or an arch. "turn" (optional, degrees) spins the arc around its axis.
- extrude: a flat outline given a thickness.
  "plane": "xy" = the outline lies flat and rises up from z = "at" by "h".
  "plane": "xz" = the outline stands upright (points are [x, z]) and is "h"
  thick along y, starting at y = "at".
  The outline must be CONVEX (no inward corners). Split a concave shape into
  several convex extrudes.
- shade (optional, 0.4 to 1, default 1): 1 is the normal surface, lower is
  darker. Use it to separate key areas (a screen, tyres, a door), never for
  colour.

RULES
- One main object, optionally one small partner object beside it. 25 parts at
  most.
- Chunky and simplified: no thin parts, no fine detail, no text, no logos. It
  must still read clearly as a tiny 50 x 50 pixel silhouette.
- Parts may overlap. Do not leave gaps between parts that should touch.
- It must look right from every side, not only from the front.
- Numbers only: no comments, no extra fields, no trailing commas.`;

// the file name a model is kept under: "coffee-mug.json" (from the uploaded file, or made from the model's name)
export function modelFileName(name, fallback = 'model') {
  const base = String(name ?? '').replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${base || fallback}.json`;
}

const TYPES = ['box', 'tube', 'sphere', 'torus', 'extrude'];
const r3 = (n) => Math.round(n * 1000) / 1000;
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const isVec = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);

// is the outline convex (all turns the same way)?
function convex(pts) {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], c = pts[(i + 2) % pts.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-9) continue;
    if (sign && Math.sign(z) !== sign) return false;
    sign = Math.sign(z);
  }
  return true;
}

// input: the pasted text (code fences allowed) or an already parsed object
export function readModel(input) {
  const problems = [], warnings = [];
  let raw = input;
  if (typeof input === 'string') {
    const text = input.trim().replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
    if (!text) return { model: null, problems: ['Paste the JSON first.'], warnings };
    try { raw = JSON.parse(text); } catch (e) { return { model: null, problems: [`This is not valid JSON (${String(e.message).replace(/^JSON\.parse: /, '')}).`], warnings }; }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { model: null, problems: ['The JSON must be one object with "name" and "parts".'], warnings };
  if (!Array.isArray(raw.parts) || !raw.parts.length) return { model: null, problems: ['It needs a "parts" list with at least one part.'], warnings };
  if (raw.parts.length > MODEL_MAX_PARTS) problems.push(`It has ${raw.parts.length} parts. The limit is ${MODEL_MAX_PARTS}: ask the AI to simplify it.`);

  const parts = [];
  raw.parts.forEach((p, i) => {
    const at = `Part ${i + 1}`;
    if (!p || typeof p !== 'object') { problems.push(`${at} is not a part.`); return; }
    if (!TYPES.includes(p.type)) { problems.push(`${at}: "${p.type}" is not a part type. Use box, tube, sphere, torus or extrude.`); return; }
    const out = { type: p.type };
    const need = (k, ok, what) => { if (!ok(p[k])) { problems.push(`${at} (${p.type}): "${k}" ${what}.`); return false; } return true; };
    const pos = (k) => need(k, (v) => isVec(v, 3), 'must be three numbers [x, y, z]') && (out[k] = p[k].map(r3));
    const size = (k) => need(k, (v) => isNum(v) && v > 0, 'must be a number above 0') && (out[k] = r3(p[k]));
    if (p.type === 'box') {
      pos('pos');
      if (need('size', (v) => isVec(v, 3) && v.every((n) => n > 0), 'must be three numbers above 0 [width, depth, height]')) out.size = p.size.map(r3);
      if (p.turn != null && need('turn', isNum, 'must be a number of degrees') && p.turn % 360) out.turn = r3(p.turn % 360);
    } else if (p.type === 'tube') {
      pos('from'); pos('to');
      if (need('r0', (v) => isNum(v) && v >= 0, 'must be 0 or more')) out.r0 = r3(p.r0);
      if (need('r1', (v) => isNum(v) && v >= 0, 'must be 0 or more')) out.r1 = r3(p.r1);
      if (out.r0 === 0 && out.r1 === 0) problems.push(`${at} (tube): "r0" and "r1" can't both be 0.`);
      if (out.from && out.to && out.from.every((n, k) => n === out.to[k])) problems.push(`${at} (tube): "from" and "to" are the same point.`);
    } else if (p.type === 'sphere') {
      pos('pos'); size('r');
    } else if (p.type === 'torus') {
      pos('pos'); size('R'); size('r');
      if (need('axis', (v) => v == null || ['x', 'y', 'z'].includes(v), 'must be "x", "y" or "z"')) out.axis = p.axis ?? 'z';
      if (p.arc != null && need('arc', (v) => isNum(v) && v > 0, 'must be degrees above 0')) out.arc = r3(Math.min(360, p.arc));
      if (p.turn != null && need('turn', isNum, 'must be a number of degrees') && p.turn % 360) out.turn = r3(p.turn % 360);
    } else {
      if (need('plane', (v) => v == null || v === 'xy' || v === 'xz', 'must be "xy" or "xz"')) out.plane = p.plane ?? 'xy';
      if (need('points', (v) => Array.isArray(v) && v.length >= 3 && v.every((q) => isVec(q, 2)), 'must be at least three points [a, b]')) {
        out.points = p.points.map((q) => q.map(r3));
        if (!convex(out.points)) warnings.push(`${at} (extrude) has an inward corner, so it may show holes. Ask the AI to split it into convex pieces.`);
      }
      if (need('at', (v) => v == null || isNum(v), 'must be a number')) out.at = r3(p.at ?? 0);
      size('h');
    }
    if (p.shade != null) {
      if (!isNum(p.shade)) problems.push(`${at}: "shade" must be a number from 0.4 to 1.`);
      else { const s = Math.min(1, Math.max(0.4, p.shade)); if (s !== p.shade) warnings.push(`${at}: shade ${p.shade} was set to ${s} (the range is 0.4 to 1).`); if (s !== 1) out.shade = r3(s); }
    }
    parts.push(out);
  });

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : '';
  const clean = { name, parts };
  if (typeof raw.file === 'string' && raw.file.trim()) clean.file = modelFileName(raw.file);   // kept by the admin beside the parts
  return { model: problems.length ? null : clean, problems, warnings };
}

/* Motifs for the 50x50 light grid: real little 3D models, drawn by one hand, rendered live into the pixel grid.
   - Every project is a handful of 3D parts (boxes, tubes, tori, extrusions, spheres) built with the Scene API below.
   - render(yaw, pitch) turns the model, rasterises it into a small z-buffer, shades it with ONE fixed light (top-left-front), draws thin seams
     between faces, then averages 4x4 blocks down to 50x50 gray values. So rotating really changes which faces catch the light.
   - Default view = classic isometric (yaw 45deg, pitch 35.26deg). The model is centred on its rotation axis and scaled ONCE (ratio locked,
     72% of the grid, enough air on all sides even while it turns).
   motifGrid(id) = default view. motifScene(id) = the model, for dragging. */
const _motifs = (function () {
  var N = 50, RES = 200, BLK = RES / N, FILL = 0.84;
  var YAW0 = Math.PI / 4, PITCH0 = Math.atan(1 / Math.SQRT2);               // isometric
  var LX = -0.45, LU = 0.65, LV = 0.62, LN = Math.hypot(LX, LU, LV); LX /= LN; LU /= LN; LV /= LN;
  var NORM = 0.89;                                                          // light on a top face at the default view = full tone

  function Scene() {
    var S = { polys: [], spheres: [], gid: 1, pal: [] };
    S.newGroup = function () { return S.gid++; };
    S.poly = function (pts, n, m, g, tone, decal) { S.polys.push({ p: pts, n: n, m: m == null ? 1 : m, g: g || S.gid++, t: tone == null ? null : tone, d: !!decal }); };
    function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function add(a, b, s) { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; }

    S.box = function (x, y, z, w, d, h, m) {
      var x1 = x + w, y1 = y + d, z1 = z + h;
      S.poly([[x, y1, z], [x1, y1, z], [x1, y1, z1], [x, y1, z1]], [0, 1, 0], m);
      S.poly([[x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1]], [1, 0, 0], m);
      S.poly([[x, y, z], [x, y1, z], [x, y1, z1], [x, y, z1]], [-1, 0, 0], m);
      S.poly([[x, y, z], [x1, y, z], [x1, y, z1], [x, y, z1]], [0, -1, 0], m);
      S.poly([[x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1]], [0, 0, 1], m);
    };
    /* tube / cone / cylinder between two points; r0 at p0, r1 at p1; smooth (no seams around it) */
    S.tube = function (p0, p1, r0, r1, m, o) {
      o = o || {}; var seg = o.seg || 18, w = norm(sub(p1, p0)), h = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      var t = Math.abs(w[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u = norm(cross(w, t)), v = cross(w, u), g = o.grp || S.gid++;
      var ring = function (p, r, a) { return add(add(p, u, r * Math.cos(a)), v, r * Math.sin(a)); };
      for (var i = 0; i < seg; i++) {
        var a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, am = (a0 + a1) / 2;
        var nr = [u[0] * Math.cos(am) + v[0] * Math.sin(am), u[1] * Math.cos(am) + v[1] * Math.sin(am), u[2] * Math.cos(am) + v[2] * Math.sin(am)];
        var sl = (r0 - r1) / (h || 1), n = norm([nr[0] + w[0] * sl, nr[1] + w[1] * sl, nr[2] + w[2] * sl]);
        S.poly([ring(p0, r0, a0), ring(p0, r0, a1), ring(p1, r1, a1), ring(p1, r1, a0)], n, m, g);
      }
      if (o.cap1 !== false && r1 > 0.02) { var c1 = [], k; for (k = 0; k < seg; k++) c1.push(ring(p1, r1, k / seg * 6.2832)); S.poly(c1, w, o.capm == null ? m : o.capm); }
      if (o.cap0 && r0 > 0.02) { var c0 = [], k2; for (k2 = 0; k2 < seg; k2++) c0.push(ring(p0, r0, k2 / seg * 6.2832)); S.poly(c0, [-w[0], -w[1], -w[2]], m); }
    };
    S.frustum = function (cx, cy, z0, r0, r1, h, m, o) { S.tube([cx, cy, z0], [cx, cy, z0 + h], r0, r1, m, o); };
    S.cyl = function (cx, cy, z0, r, h, m, o) { S.tube([cx, cy, z0], [cx, cy, z0 + h], r, r, m, o); };
    S.path = function (pts, r, m) { var g = S.gid++; for (var i = 0; i + 1 < pts.length; i++) S.tube(pts[i], pts[i + 1], r, r, m, { seg: 6, grp: g, cap1: false }); };
    S.torus = function (c, u, v, R, r, a0, a1, m, n) {                      // tube swept along an arc in the plane spanned by u, v
      n = n || 22; var g = S.gid++, pts = [];
      for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; pts.push([c[0] + R * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), c[1] + R * (Math.cos(a) * u[1] + Math.sin(a) * v[1]), c[2] + R * (Math.cos(a) * u[2] + Math.sin(a) * v[2])]); }
      for (var j = 0; j + 1 < pts.length; j++) S.tube(pts[j], pts[j + 1], r, r, m, { seg: 7, grp: g, cap1: false });
    };
    S.sphere = function (x, y, z, r, m, o) { o = o || {}; S.spheres.push({ c: [x, y, z], r: r, m: m == null ? 1 : m, g: o.grp || S.gid++, o: o }); };
    S.extrude = function (pts, plane, off, th, m) {                        // plane 'xy' (rises along z) or 'xz' (thick along y)
      var P = function (p, k) { return plane === 'xy' ? [p[0], p[1], off + k] : [p[0], off + k, p[1]]; };
      var nTop = plane === 'xy' ? [0, 0, 1] : [0, 1, 0], nBot = [-nTop[0], -nTop[1], -nTop[2]], cx = 0, cy = 0, i;
      pts.forEach(function (p) { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
      for (i = 0; i < pts.length; i++) {
        var p = pts[i], q = pts[(i + 1) % pts.length], ex = q[0] - p[0], ey = q[1] - p[1], nx = ey, ny = -ex, mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy;
        if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
        var l = Math.hypot(nx, ny) || 1, n = plane === 'xy' ? [nx / l, ny / l, 0] : [nx / l, 0, ny / l];
        S.poly([P(p, 0), P(q, 0), P(q, th), P(p, th)], n, m);
      }
      S.poly(pts.map(function (p) { return P(p, th); }), nTop, m);
      S.poly(pts.map(function (p) { return P(p, 0); }), nBot, m);
    };
    S.taperBox = function (cx, cy, z0, a0, b0, a1, b1, h, m) {            // box that narrows towards the top (half widths a, half depths b)
      var bt = [[cx - a0, cy - b0, z0], [cx + a0, cy - b0, z0], [cx + a0, cy + b0, z0], [cx - a0, cy + b0, z0]], tp = [[cx - a1, cy - b1, z0 + h], [cx + a1, cy - b1, z0 + h], [cx + a1, cy + b1, z0 + h], [cx - a1, cy + b1, z0 + h]];
      for (var i = 0; i < 4; i++) { var j = (i + 1) % 4; S.poly([bt[i], bt[j], tp[j], tp[i]], norm(cross(sub(bt[j], bt[i]), sub(tp[i], bt[i]))), m); }
      S.poly(tp, [0, 0, 1], m);
    };
    S.rotZ = function (from, ang) {                                       // turn polygons added since `from` about the vertical axis
      var c = Math.cos(ang), s = Math.sin(ang), rp = function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
      for (var i = from; i < S.polys.length; i++) { var q = S.polys[i]; q.p = q.p.map(rp); q.n = rp(q.n); }
    };
    S.pyramidFrustum = function (cx, cy, z0, r, t, h, m) {                 // square crown (gem)
      var b = [[cx - r, cy - r, z0], [cx + r, cy - r, z0], [cx + r, cy + r, z0], [cx - r, cy + r, z0]], u = [[cx - t, cy - t, z0 + h], [cx + t, cy - t, z0 + h], [cx + t, cy + t, z0 + h], [cx - t, cy + t, z0 + h]];
      for (var i = 0; i < 4; i++) { var j = (i + 1) % 4, a = sub(b[j], b[i]), c = sub(u[i], b[i]); S.poly([b[i], b[j], u[j], u[i]], norm(cross(a, c)), m); }
      S.poly(u, [0, 0, 1], m);
    };
    /* decals: flat marks lying just above a face (own tone, no seams) */
    var E = 0.04;
    S.dTop = function (x0, x1, y0, y1, z, tone) { S.poly([[x0, y0, z + E], [x1, y0, z + E], [x1, y1, z + E], [x0, y1, z + E]], [0, 0, 1], 1, null, tone, true); };
    S.dYp = function (x0, x1, y, z0, z1, tone) { S.poly([[x0, y + E, z0], [x1, y + E, z0], [x1, y + E, z1], [x0, y + E, z1]], [0, 1, 0], 1, null, tone, true); };
    S.dYm = function (x0, x1, y, z0, z1, tone) { S.poly([[x0, y - E, z0], [x1, y - E, z0], [x1, y - E, z1], [x0, y - E, z1]], [0, -1, 0], 1, null, tone, true); };
    S.dXp = function (x, y0, y1, z0, z1, tone) { S.poly([[x + E, y0, z0], [x + E, y1, z0], [x + E, y1, z1], [x + E, y0, z1]], [1, 0, 0], 1, null, tone, true); };
    S.dXm = function (x, y0, y1, z0, z1, tone) { S.poly([[x - E, y0, z0], [x - E, y1, z0], [x - E, y1, z1], [x - E, y0, z1]], [-1, 0, 0], 1, null, tone, true); };
    S.dDisc = function (cx, cy, z, r, tone, n) { var p = []; n = n || 14; for (var i = 0; i < n; i++) p.push([cx + r * Math.cos(i / n * 6.2832), cy + r * Math.sin(i / n * 6.2832), z + E]); S.poly(p, [0, 0, 1], 1, null, tone, true); };
    S.dDiscY = function (cx, cz, y, r, tone, sg, nn) { var p = [], n = nn || 14; for (var i = 0; i < n; i++) p.push([cx + r * Math.cos(i / n * 6.2832), y + sg * E, cz + r * Math.sin(i / n * 6.2832)]); S.poly(p, [0, sg, 0], 1, null, tone, true); };
    S.dCyl = function (cx, cy, z0, z1, r, a0, a1, tone) {                  // a band wrapped around a cylinder
      var n = 8; for (var i = 0; i < n; i++) { var A = a0 + (a1 - a0) * i / n, B = a0 + (a1 - a0) * (i + 1) / n, rr = r + E, am = (A + B) / 2;
        S.poly([[cx + rr * Math.cos(A), cy + rr * Math.sin(A), z0], [cx + rr * Math.cos(B), cy + rr * Math.sin(B), z0], [cx + rr * Math.cos(B), cy + rr * Math.sin(B), z1], [cx + rr * Math.cos(A), cy + rr * Math.sin(A), z1]], [Math.cos(am), Math.sin(am), 0], 1, null, tone, true); }
    };
    S.windows = function (x, y, z, w, d, h, ncx, ncy, nr, tone) {          // dark windows on all four sides of a box
      var t = tone == null ? 0.05 : tone, i, j;
      for (i = 0; i < ncx; i++) for (j = 0; j < nr; j++) {
        var a = x + (i + 0.22) * w / ncx, b = x + (i + 0.78) * w / ncx, c = z + (j + 0.25) * h / nr, e = z + (j + 0.8) * h / nr;
        S.dYp(a, b, y + d, c, e, t); S.dYm(a, b, y, c, e, t);
      }
      for (i = 0; i < ncy; i++) for (j = 0; j < nr; j++) {
        var a2 = y + (i + 0.22) * d / ncy, b2 = y + (i + 0.78) * d / ncy, c2 = z + (j + 0.25) * h / nr, e2 = z + (j + 0.8) * h / nr;
        S.dXp(x + w, a2, b2, c2, e2, t); S.dXm(x, a2, b2, c2, e2, t);
      }
    };
    return S;
  }
  function starPts(cx, cy, R, r) { var p = []; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; p.push([cx + d * Math.cos(a), cy + d * Math.sin(a)]); } return p; }
  function heartPts(cx, cz, sc) { var p = []; for (var i = 0; i < 30; i++) { var t = i / 30 * 6.2832; p.push([cx + sc * 16 * Math.pow(Math.sin(t), 3), cz + sc * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } return p; }
  var PI = Math.PI;

  var M = {
    1: function (s) { // university: temple with columns all around
      s.box(-7, -6, 0, 14, 12, 0.9);
      s.box(-6, -4, 0.9, 12, 8, 7.6, 0.85);
      [-5, -1.7, 1.7, 5].forEach(function (x) { s.cyl(x, 5, 0.9, 1, 7.6); s.cyl(x, -5, 0.9, 1, 7.6); });
      [-2.4, 2.4].forEach(function (y) { s.cyl(-6.2, y, 0.9, 0.9, 7.6, 0.9); s.cyl(6.2, y, 0.9, 0.9, 7.6, 0.9); });
      s.box(-7, -6, 8.5, 14, 12, 1.4);
      s.extrude([[-7, 9.9], [7, 9.9], [0, 13.6]], 'xz', -6, 12, 0.95);
    },
    2: function (s) { // multi-country bank: globe
      s.cyl(0, 0, 0, 3.6, 1.2); s.cyl(0, 0, 1.2, 1.2, 2.2);
      s.sphere(0, 0, 9, 6.2, 1, { grid: true });
    },
    3: function (s) { // legal: scales
      s.frustum(0, 0, 0, 4, 2.6, 1.4); s.cyl(0, 0, 1.4, 0.8, 9.6);
      s.box(-6.5, -0.7, 11, 13, 1.4, 0.9); s.sphere(0, 0, 13.3, 1.1);
      [-6, 6].forEach(function (cx) {
        s.frustum(cx, 0, 5.4, 2.1, 2.9, 1.1);
        [90, 210, 330].forEach(function (a) { var r = a / 180 * PI; s.tube([cx, 0, 11.45], [cx + 2.8 * Math.cos(r), 2.8 * Math.sin(r), 6.5], 0.16, 0.16, 0.7, { seg: 5, cap1: false }); });
      });
    },
    4: function (s) { // job search: 3D user icon + magnifier
      s.sphere(0, 0, 9.4, 3.1, 1);
      s.sphere(0, 0, 0, 6.2, 0.92, { clip: [0, 0, 1] });
      s.torus([3.6, 7.2, 6.6], [1, 0, 0], [0, 0, 1], 3.5, 0.85, 0, 6.2832, 1, 36);
      var d = []; for (var i = 0; i < 20; i++) d.push([3.6 + 3.2 * Math.cos(i / 20 * 6.2832), 7.2, 6.6 + 3.2 * Math.sin(i / 20 * 6.2832)]);
      s.poly(d, [0, 1, 0], 1, null, 0.3, true);
      s.poly(d.slice().reverse(), [0, -1, 0], 1, null, 0.3, true);       // glass seen from the back too (one-sided it vanished and left an empty hoop)
      s.tube([3.6 + 2.5, 7.2, 6.6 - 2.5], [3.6 + 6.6, 7.2, 6.6 - 6.6], 0.85, 0.85, 0.62, { seg: 8, cap0: true });
    },
    5: function (s) { // luxury fashion: structured monogram handbag (the vibe of a classic maison bag, no brand marks)
      var a0 = 5.8, b0 = 3.4, a1 = 4.8, b1 = 2.7, h = 7.4;
      s.taperBox(0, 0, 0, a0, b0, a1, b1, h, 1);
      var F = function (sg, u, z) { var k = z / h; return [u * (a0 + (a1 - a0) * k), sg * (b0 + (b1 - b0) * k + 0.05), z]; };
      var nrm = function (sg) { return [0, sg * 0.995, 0.0946]; };
      var band = function (sg, u0, u1, z0, z1, t) { s.poly([F(sg, u0, z0), F(sg, u1, z0), F(sg, u1, z1), F(sg, u0, z1)], nrm(sg), 1, null, t, true); };
      [1, -1].forEach(function (sg) {
        band(sg, -1, 1, 0, 1.1, 0.34); band(sg, -1, 1, 6.5, 7.4, 0.34);
        for (var r = 0; r < 4; r++) for (var c = 0; c < 5; c++) {
          var u = -0.8 + c * 0.4 + (r % 2 ? 0.2 : 0), z = 2.2 + r * 1.1; if (Math.abs(u) > 0.86) continue;
          s.poly([F(sg, u, z - 0.46), F(sg, u + 0.09, z), F(sg, u, z + 0.46), F(sg, u - 0.09, z)], nrm(sg), 1, null, 0.3, true);
        }
        band(sg, -0.1, 0.1, 5.1, 6.3, 1);
      });
      s.torus([0, 0, h - 0.2], [1, 0, 0], [0, 0, 1], 3.2, 0.5, 0, PI, 0.85, 22);
    },
    6: function (s) { // exam review: clipboard answer sheet + pencil
      s.box(-5.5, -0.7, 0, 11, 1.4, 14);
      s.box(-2.2, -1.2, 12.6, 4.4, 2.4, 1.8, 0.62);
      var cols = [-3, 0, 3], rows = [2.8, 5.4, 8, 10.6], filled = { '0,0': 1, '1,2': 1, '2,1': 1, '3,2': 1 };
      for (var r = 0; r < 4; r++) for (var q = 0; q < 3; q++) {
        s.dDiscY(cols[q], rows[r], 0.7, 1.0, 0.22, 1);
        if (!filled[r + ',' + q]) s.dDiscY(cols[q], rows[r], 0.7, 0.6, 1, 1);
      }
      s.tube([-4.8, 4.2, 0.95], [5.2, 2.6, 0.95], 0.95, 0.95, 1, { seg: 6, cap0: true });
      s.tube([5.2, 2.6, 0.95], [6.4, 2.4, 0.95], 0.95, 0.95, 0.3, { seg: 6 });
      s.tube([-4.8, 4.2, 0.95], [-7.2, 4.6, 0.95], 0.95, 0.12, 0.55, { seg: 6 });
    },
    7: function (s) { // gamified app: trophy
      s.torus([-5.4, 0, 8.4], [1, 0, 0], [0, 0, 1], 2.3, 0.5, 0, 6.2832, 0.8, 18);
      s.torus([5.4, 0, 8.4], [1, 0, 0], [0, 0, 1], 2.3, 0.5, 0, 6.2832, 0.8, 18);
      s.box(-4, -4, 0, 8, 8, 1.2); s.cyl(0, 0, 1.2, 1.4, 2.4);
      s.frustum(0, 0, 3.6, 2.3, 4.9, 6.6);
      s.dDisc(0, 0, 10.2, 4.1, 0.3, 20);
      [1, -1].forEach(function (sg) { var st = starPts(0, 7.3, 1.7, 0.75).map(function (p) { return [p[0], sg * 3.75 + sg * E2, p[1]]; }); s.poly(st, [0, sg, 0], 1, null, 0.22, true); });
    },
    8: function (s) { // casual dining: a burger and an iced drink
      var X = -3.5, Y = 4.5;
      s.frustum(X, Y, 0, 4.8, 5.2, 2.0, 0.8);                                    // bottom bun
      s.cyl(X, Y, 2.0, 5.3, 2.4, 0.3);                                           // patty
      s.box(X - 5.4, Y - 5.4, 4.4, 10.8, 10.8, 0.8, 1);                          // cheese slice, corners hang over
      s.frustum(X, Y, 5.2, 5.9, 5.4, 1.4, 0.95);                                 // lettuce frill
      s.cyl(X, Y, 6.6, 5.0, 1.0, 0.42);                                          // tomato
      s.frustum(X, Y, 7.6, 5.2, 5.3, 1.0, 0.75);                                 // top bun, domed in steps
      s.frustum(X, Y, 8.6, 5.3, 4.7, 1.4, 0.75); s.frustum(X, Y, 10.0, 4.7, 3.4, 1.2, 0.75); s.frustum(X, Y, 11.2, 3.4, 1.2, 0.9, 0.75);
      [[-1.6, -1.2], [0.4, -2], [1.8, 0.4], [-0.6, 1.4], [0.6, 0.2], [-2.2, 0.6], [1.2, -1.2]].forEach(function (q) { s.sphere(X + q[0], Y + q[1], 10.9 - (Math.abs(q[0]) + Math.abs(q[1])) * 0.3, 0.42, 1); });
      var CX = 5, CY = -5;
      s.frustum(CX, CY, 0, 3.0, 3.9, 12, 0.55, { capm: 0.3 });                   // cup
      s.cyl(CX, CY, 12, 4.0, 0.6, 1);                                            // rim
      s.box(CX - 2.8, CY - 1.8, 11.4, 2.4, 2.4, 2.4, 1); s.box(CX + 0.2, CY + 0.2, 11.8, 2.4, 2.4, 2.4, 0.8); s.box(CX - 1.4, CY - 3, 11.2, 2.2, 2.2, 2.2, 0.9);   // ice cubes
      s.tube([CX + 1, CY + 0.8, 6], [CX + 2.8, CY + 1.2, 19], 0.4, 0.4, 1, { seg: 8 });  // straw
    },
    9: function (s) { // dairy: tall glass milk bottle with a dark cap
      s.cyl(0, 0, 0, 3.3, 0.5, 0.7);
      s.cyl(0, 0, 0.5, 3.2, 11, 1);                                              // milk
      s.frustum(0, 0, 11.5, 3.2, 2.7, 1.4, 1); s.frustum(0, 0, 12.9, 2.7, 1.9, 1.5, 1);
      s.cyl(0, 0, 14.4, 1.9, 1.2, 1);                                            // milk up to the fill line
      s.cyl(0, 0, 15.6, 1.95, 3.2, 0.6);                                         // clear glass neck
      s.cyl(0, 0, 18.8, 2.25, 1.5, 0.2);                                         // dark metal cap
      s.dCyl(0, 0, 1.5, 12, 3.2, PI / 2 - 1.15, PI / 2 - 0.85, 0.12);            // glass glints
      s.dCyl(0, 0, 2.2, 11, 3.2, PI / 2 + 0.55, PI / 2 + 0.75, 1);
    },
    10: function (s) { // nonprofit: an envelope, and a big heart
      s.box(-6.5, -4.2, 0, 13, 8.4, 1);
      s.poly([[-6.5, -4.2, 1.05], [-6.5, 4.2, 1.05], [-0.2, 0, 1.05]], [0, 0, 1], 1, null, 0.5, true);
      s.poly([[6.5, -4.2, 1.05], [6.5, 4.2, 1.05], [0.2, 0, 1.05]], [0, 0, 1], 1, null, 0.42, true);
      s.poly([[-6.5, 4.2, 1.05], [6.5, 4.2, 1.05], [0, -0.1, 1.05]], [0, 0, 1], 1, null, 0.66, true);
      s.extrude([[-6.5, -4.2], [6.5, -4.2], [0, 0.2]], 'xy', 1, 0.25, 0.9);
      var h0 = s.polys.length; s.extrude(heartPts(0, 11.2, 0.27), 'xz', -1.4, 2.8, 1); s.rotZ(h0, -PI / 4);   // heart faces the starting view
    },
    11: function (s) { // pharma: capsule + tablets (each half is one smooth piece, no ring where the dome meets the body)
      var gA = s.newGroup(), gB = s.newGroup();
      s.tube([-6.2, -2.5, 2.9], [0, -2.5, 2.9], 2.9, 2.9, 1, { cap1: false, grp: gA });
      s.tube([0, -2.5, 2.9], [6.2, -2.5, 2.9], 2.9, 2.9, 0.74, { cap1: false, grp: gB });
      s.sphere(-6.2, -2.5, 2.9, 2.9, 1, { clip: [-1, 0, 0], grp: gA }); s.sphere(6.2, -2.5, 2.9, 2.9, 0.74, { clip: [1, 0, 0], grp: gB });
      [[-4.5, 5.2], [4.8, 4.4]].forEach(function (p) {
        s.cyl(p[0], p[1], 0, 2.7, 1.3); s.dTop(p[0] - 0.4, p[0] + 0.4, p[1] - 1.5, p[1] + 1.5, 1.3, 0.2); s.dTop(p[0] - 1.5, p[0] + 1.5, p[1] - 0.4, p[1] + 0.4, 1.3, 0.2);
      });
    },
    12: function (s) { // wine brand: bottle + glass
      s.cyl(-3.2, 0, 0, 2.7, 9, 0.5); s.frustum(-3.2, 0, 9, 2.7, 1.0, 2.6, 0.5); s.cyl(-3.2, 0, 11.6, 1.0, 4.2, 0.5); s.cyl(-3.2, 0, 15.8, 1.15, 1.2, 0.85);
      s.dCyl(-3.2, 0, 2.2, 6.4, 2.7, PI / 2 - 1.2, PI / 2 + 1.2, 0.95); s.dCyl(-3.2, 0, 3.6, 5.0, 2.7, PI / 2 - 0.7, PI / 2 + 0.7, 0.2);
      s.dCyl(-3.2, 0, 7.2, 8.6, 2.7, PI / 2 - 1.2, PI / 2 + 1.2, 0.95);
      s.cyl(4.6, 2.4, 0, 1.9, 0.35, 1); s.cyl(4.6, 2.4, 0.35, 0.28, 4.4, 1);
      s.frustum(4.6, 2.4, 4.7, 1.2, 2.7, 3.6, 1);
      s.dDisc(4.6, 2.4, 8.3, 2.3, 0.22, 20);
    },
    15: function (s) { // multi-mall: shopping bags + cinema clapper
      var bag = function (x, y, w, d, h, mm) {
        s.box(x, y, 0, w, d, h, mm);
        s.torus([x + w / 2, y + d / 2, h], [0, 1, 0], [0, 0, 1], d * 0.42, 0.28, 0, PI, mm * 0.9, 14);
        s.dYp(x + w * 0.15, x + w * 0.85, y + d, h * 0.35, h * 0.6, 0.3); s.dYm(x + w * 0.15, x + w * 0.85, y, h * 0.35, h * 0.6, 0.3);
      };
      bag(-7, -4, 6, 4.4, 8.4, 1); bag(-2.4, 1.2, 5, 3.6, 6.2, 0.82);
      s.box(1.4, -5.6, 0, 6.8, 1.2, 5.2, 0.7);
      for (var i = 0; i < 4; i++) s.dYp(1.7 + i * 1.6, 2.7 + i * 1.6, -4.4, 4.9, 5.1, 0.16);
      s.box(1.4, -5.8, 5.2, 6.8, 1.4, 1.2, 0.55);
      for (var j = 0; j < 4; j++) s.dYp(1.5 + j * 1.7, 2.5 + j * 1.7, -4.4, 5.3, 6.3, j % 2 ? 0.15 : 0.95);
      s.tube([1.4, -5.6, 7.1], [7.2, -5.6, 9.6], 0.7, 0.7, 0.8, { seg: 6, cap0: true });
      s.dTop(2.6, 3.6, -5.2, -4.6, 5.2, 0.9);
    },
    23: function (s) { // creative brand with a 3D hero: playful primitives
      s.sphere(0, 0, 7.5, 3.4);
      s.torus([0, 0, 7.5], [1, 0, 0], [0, 0.5, 0.87], 6, 0.75, 0, 6.2832, 0.88, 34);
      s.box(-8, 2.8, 0, 4.4, 4.4, 4.4, 1);
      s.tube([6.4, -2.4, 0], [6.4, -2.4, 7], 2.7, 0.05, 0.92, { seg: 20, cap0: true });
      s.sphere(-5.8, -4.6, 1.6, 1.6, 0.9);
    },
    13: function (s) { // boutique hotels: bed
      s.box(-7.4, -4, 0, 1.2, 8, 7.4);
      s.box(-6.2, -4, 0.8, 13.4, 8, 1.4); s.box(7.2, -4, 0, 0.8, 8, 3.2);
      s.box(-6, -3.7, 2.2, 13, 7.4, 2.2);
      s.dTop(-1.2, 7, -3.7, 3.7, 4.4, 0.7); s.dTop(-1.2, -0.6, -3.7, 3.7, 4.4, 0.4);
      s.box(-5.8, -3, 4.4, 3, 6, 1.1, 1);
      s.box(-6.6, 4.6, 0, 3.2, 3, 3.6, 0.85);
    },
    14: function (s) { // hotel group: service bell
      s.cyl(0, 0, 0, 7, 1.3);
      s.sphere(0, 0, 1.3, 5.8, 1, { clip: [0, 0, 1] });
      s.cyl(0, 0, 7.0, 0.7, 1); s.sphere(0, 0, 8.6, 1.4);
    },
    16: function (s) { // industry association: network of nodes
      var N4 = [[-5.5, -5.5, 2.2], [5.5, -5.5, 2.2], [5.5, 5.5, 2.2], [-5.5, 5.5, 2.2]], c = [0, 0, 6.5];
      N4.forEach(function (n, i) { s.tube(n, c, 0.28, 0.28, 0.6, { seg: 6 }); s.tube(n, N4[(i + 1) % 4], 0.22, 0.22, 0.45, { seg: 6 }); });
      N4.forEach(function (n) { s.sphere(n[0], n[1], n[2], 1.9); });
      s.sphere(0, 0, 6.5, 3);
    },
    17: function (s) { // pawnshop: ring with a gem
      s.torus([0, 0, 5.6], [1, 0, 0], [0, 0, 1], 4.4, 0.95, 0, 6.2832, 0.8, 28);
      s.pyramidFrustum(0, 0, 10.3, 2.2, 1.2, 2.6, 1);
    },
    18: function (s) { // author platform: open book
      s.box(-6.8, -5.2, 0, 13.6, 10.4, 1, 0.72);
      s.box(-6.2, -4.7, 1, 12.4, 9.4, 2.2);
      for (var i = 0; i < 3; i++) {
        var z0 = 1.5 + i * 0.55, z1 = z0 + 0.14;
        s.dYp(-6.2, 6.2, 4.7, z0, z1, 0.3); s.dYm(-6.2, 6.2, -4.7, z0, z1, 0.3); s.dXp(6.2, -4.7, 4.7, z0, z1, 0.14); s.dXm(-6.2, -4.7, 4.7, z0, z1, 0.14);
      }
      s.dTop(-0.25, 0.25, -4.7, 4.7, 3.2, 0.2);
      for (var j = 0; j < 4; j++) { s.dTop(-5.2, -1, -3.4 + j * 2.1, -2.7 + j * 2.1, 3.2, 0.38); s.dTop(1, 5.2, -3.4 + j * 2.1, -2.7 + j * 2.1, 3.2, 0.38); }
    },
    19: function (s) { // veterans assistance: star medal
      s.extrude(starPts(0, 0, 8.4, 3.6), 'xy', 0, 3, 1);
    },
    20: function (s) { // courier: parcel with a pin
      s.box(-5, -4, 0, 10, 8, 6.5);
      s.dTop(-0.9, 0.9, -4, 4, 6.5, 0.55); s.dYp(-0.9, 0.9, 4, 0, 6.5, 0.4); s.dYm(-0.9, 0.9, -4, 0, 6.5, 0.4);
      s.dXp(5, -2.8, 2.6, 1.6, 4.6, 0.95); [-2, -0.9, 0.2, 1.4].forEach(function (y, i) { s.dXp(5.04, y, y + (i % 2 ? 0.35 : 0.2), 2, 4.2, 0.14); });
      s.tube([0, 0, 8.2], [0, 0, 11.2], 0.05, 2.5, 1, { cap1: false });
      s.sphere(0, 0, 12.6, 2.7);
    },
    21: function (s) { // multi-brand hotels: three towers
      s.box(-3.5, -3, 0, 5, 5, 9.5); s.windows(-3.5, -3, 0.8, 5, 5, 8.1, 3, 3, 5);
      s.box(-7, 1.5, 0, 5, 5, 6); s.windows(-7, 1.5, 0.8, 5, 5, 4.6, 3, 3, 3);
      s.box(1, -7, 0, 5.5, 5.5, 14); s.windows(1, -7, 0.8, 5.5, 5.5, 12.6, 3, 3, 7);
    },
    22: function (s) { // bakery & dining: a croissant
      for (var i = 0; i < 9; i++) {
        var t = i / 8, th = (-98 + t * 196) / 180 * PI, r = 0.9 + 2.7 * Math.pow(Math.sin(PI * (i + 0.5) / 9), 1.2);
        s.sphere(7.4 * Math.sin(th), 7.4 * Math.cos(th) - 4.6, r * 0.92, r, i % 2 ? 0.88 : 1);
      }
    },
    24: function (s) { // editorial publishing: stack of magazines
      s.box(-6, -5, 0, 12, 10, 1.2, 0.8);
      s.box(-5.4, -4.2, 1.2, 12, 9.4, 1.2, 0.92);
      s.box(-6.2, -5.4, 2.4, 12, 10, 1.3);
      s.dTop(-5.2, 4.8, -4.7, -3, 3.7, 0.2); s.dTop(-5.2, -0.8, -2.2, 2.2, 3.7, 0.52);
      for (var i = 0; i < 4; i++) s.dTop(0.2, 4.8 - (i === 3 ? 2 : 0), -2.2 + i * 1.15, -1.7 + i * 1.15, 3.7, 0.34);
      for (var j = 0; j < 2; j++) s.dTop(-5.2, 4.8 - j * 3, 3.1 + j * 0.8, 3.5 + j * 0.8, 3.7, 0.34);
    },
    25: function (s) { // inventory: stacked boxes with a barcode
      s.box(-7.2, -5, 0, 6.6, 10, 5.4); s.box(0.2, -5, 0, 7, 10, 5.4);
      s.dTop(-4.6, -3.4, -5, 5, 5.4, 0.55); s.dYp(-4.6, -3.4, 5, 0, 5.4, 0.4); s.dYm(-4.6, -3.4, -5, 0, 5.4, 0.4);
      s.box(-4, -3.5, 5.4, 8, 7, 5, 0.95);
      s.dTop(-0.8, 0.8, -3.5, 3.5, 10.4, 0.55); s.dYp(-0.8, 0.8, 3.5, 5.4, 10.4, 0.4); s.dYm(-0.8, 0.8, -3.5, 5.4, 10.4, 0.4);
      s.dYp(1.5, 6.2, 5, 1.2, 4.4, 0.97);
      [0, 0.7, 1.2, 2, 2.5, 3.2, 3.6, 4.3].forEach(function (x, i) { s.dYp(1.8 + x * 0.95, 1.8 + x * 0.95 + (i % 3 ? 0.28 : 0.46), 5.04, 1.7, 3.9, 0.12); });
    }
  };
  var E2 = 0.05;

  /* ---------- renderer ---------- */
  var zb = new Float32Array(RES * RES), tb = new Float32Array(RES * RES), ib = new Int32Array(RES * RES), ci = new Int32Array(RES * RES), seam = new Uint8Array(RES * RES);

  /* a project's own model, as JSON (checked and cleaned by readModel in model.js): the same shapes the built-in icons use */
  function fromModel(S, model) {
    var D = Math.PI / 180;
    (model.parts || []).forEach(function (p) {
      var m = p.shade == null ? 1 : p.shade, np0 = S.polys.length, ns0 = S.spheres.length;
      if (p.type === 'box') {                                              // pos = centre, optional turn around the up axis
        var c = p.pos, w = p.size[0] / 2, d = p.size[1] / 2, z0 = c[2] - p.size[2] / 2, z1 = c[2] + p.size[2] / 2;
        var t = (p.turn || 0) * D, ct = Math.cos(t), st = Math.sin(t);
        var xy = [[-w, -d], [w, -d], [w, d], [-w, d]].map(function (q) { return [c[0] + q[0] * ct - q[1] * st, c[1] + q[0] * st + q[1] * ct]; });
        for (var i = 0; i < 4; i++) {
          var a = xy[i], b = xy[(i + 1) % 4], nx = b[1] - a[1], ny = a[0] - b[0], l = Math.hypot(nx, ny) || 1;
          S.poly([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], [nx / l, ny / l, 0], m);
        }
        S.poly(xy.map(function (q) { return [q[0], q[1], z1]; }), [0, 0, 1], m);
        S.poly(xy.map(function (q) { return [q[0], q[1], z0]; }), [0, 0, -1], m);
      } else if (p.type === 'tube') {
        S.tube(p.from, p.to, p.r0, p.r1, m, { cap0: true });
      } else if (p.type === 'sphere') {
        S.sphere(p.pos[0], p.pos[1], p.pos[2], p.r, m);
      } else if (p.type === 'torus') {                                     // the hole faces `axis`; arc and turn in degrees
        var U = { x: [0, 1, 0], y: [1, 0, 0], z: [1, 0, 0] }[p.axis || 'z'], V = { x: [0, 0, 1], y: [0, 0, 1], z: [0, 1, 0] }[p.axis || 'z'];
        var a0 = (p.turn || 0) * D;
        S.torus(p.pos, U, V, p.R, p.r, a0, a0 + (p.arc || 360) * D, m, Math.max(8, Math.round(22 * (p.arc || 360) / 360)));
      } else if (p.type === 'extrude') {
        S.extrude(p.points, p.plane || 'xy', p.at || 0, p.h, m);
      }
      if (p.color) {                                                       // real colour: every poly / sphere this part made points at it
        S.pal.push([parseInt(p.color.slice(1, 3), 16), parseInt(p.color.slice(3, 5), 16), parseInt(p.color.slice(5, 7), 16)]);
        var k, id = S.pal.length;
        for (k = np0; k < S.polys.length; k++) S.polys[k].col = id;
        for (k = ns0; k < S.spheres.length; k++) S.spheres[k].col = id;
      }
    });
  }

  function build(id, model) {
    var s = Scene();
    if (model) fromModel(s, model); else (M[id] || function (q) { q.sphere(0, 0, 5, 5); })(s);
    var mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    var ext = function (x, y) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; };
    s.polys.forEach(function (p) { p.p.forEach(function (v) { ext(v[0], v[1]); }); });
    s.spheres.forEach(function (q) { ext(q.c[0] - q.r, q.c[1] - q.r); ext(q.c[0] + q.r, q.c[1] + q.r); });
    s.ox = (mnx + mxx) / 2; s.oy = (mny + mxy) / 2;                                 // centre on the rotation axis
    // fit: one scale for every angle, so the model never pulses while it turns
    var halfW = 0, halfH = 0, cyAcc = 0, cn = 0, views = [], a, pi;
    for (a = 0; a < 360; a += 15) for (pi = -1; pi <= 1; pi++) views.push([a / 180 * PI, PITCH0 + pi * 0.22]);
    views.forEach(function (v) {
      var cy = Math.cos(v[0]), sy = Math.sin(v[0]), cp = Math.cos(v[1]), sp = Math.sin(v[1]), lo = 1e9, hi = -1e9, hw = 0;
      var f = function (x, y, z, r) { x -= s.ox; y -= s.oy; var x1 = x * cy - y * sy, y1 = x * sy + y * cy, Y = y1 * sp - z * cp; hw = Math.max(hw, Math.abs(x1) + r); lo = Math.min(lo, Y - r); hi = Math.max(hi, Y + r); };
      s.polys.forEach(function (p) { p.p.forEach(function (q) { f(q[0], q[1], q[2], 0); }); });
      s.spheres.forEach(function (q) { f(q.c[0], q.c[1], q.c[2], q.r); });
      halfW = Math.max(halfW, hw);
      if (v[1] === PITCH0) { cyAcc += (lo + hi) / 2; cn++; }
      views.cyH = Math.max(views.cyH || 0, (hi - lo) / 2);
    });
    s.cy0 = cyAcc / cn; halfH = views.cyH;
    s.sc = (RES * FILL / 2) / Math.max(halfW, halfH + 0.4);
    return s;
  }

  function render(s, yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), R = RES, half = R / 2, SC = s.sc;
    zb.fill(1e9); tb.fill(0); ib.fill(0); ci.fill(0);
    var proj = function (x, y, z) { x -= s.ox; y -= s.oy; var x1 = x * cy - y * sy, y1 = x * sy + y * cy; return [half + x1 * SC, half + (y1 * sp - z * cp - s.cy0) * SC, -(y1 * cp + z * sp)]; };
    var tri = function (a, b, c, tone, id, bias, col) {
      var minx = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), maxx = Math.min(R - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      var miny = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), maxy = Math.min(R - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      var den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-9) return;
      for (var y = miny; y <= maxy; y++) for (var x = minx; x <= maxx; x++) {
        var px = x + 0.5, py = y + 0.5, w0 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den, w1 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den, w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        var d = w0 * a[2] + w1 * b[2] + w2 * c[2] + bias, i = y * R + x;
        if (d < zb[i]) { zb[i] = d; tb[i] = tone; ib[i] = id; ci[i] = col; }
      }
    };
    s.polys.forEach(function (p) {
      var nx1 = p.n[0] * cy - p.n[1] * sy, ny1 = p.n[0] * sy + p.n[1] * cy, X = nx1, V = ny1 * cp + p.n[2] * sp, U = -ny1 * sp + p.n[2] * cp;
      if (V <= 0.0005) return;
      var tone = p.t != null ? p.t : Math.min(1, 0.3 + 0.7 * Math.max(0, (LX * X + LU * U + LV * V) / NORM)) * p.m;
      var pts = p.p.map(function (q) { return proj(q[0], q[1], q[2]); }), cx = 0, cyy = 0, cd = 0;
      pts.forEach(function (q) { cx += q[0]; cyy += q[1]; cd += q[2]; }); var ctr = [cx / pts.length, cyy / pts.length, cd / pts.length];
      var id = p.d ? -p.g : p.g, bias = p.d ? -0.06 : 0;
      for (var i = 0; i < pts.length; i++) tri(ctr, pts[i], pts[(i + 1) % pts.length], tone, id, bias, p.col || 0);
    });
    s.spheres.forEach(function (q) {                                                  // shaded impostor spheres
      var c = proj(q.c[0], q.c[1], q.c[2]), r = q.r * SC, o = q.o;
      var x0 = Math.max(0, Math.floor(c[0] - r)), x1 = Math.min(R - 1, Math.ceil(c[0] + r)), y0 = Math.max(0, Math.floor(c[1] - r)), y1 = Math.min(R - 1, Math.ceil(c[1] + r));
      for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
        var dx = (x + 0.5 - c[0]) / r, dy = (y + 0.5 - c[1]) / r, d2 = dx * dx + dy * dy; if (d2 > 1) continue;
        var dz = Math.sqrt(1 - d2), X = dx, U = -dy, V = dz;
        var y1c = V * cp - U * sp, zw = V * sp + U * cp, xw1 = X, xw = xw1 * cy + y1c * sy, yw = -xw1 * sy + y1c * cy;     // normal back in world space
        if (o.clip && xw * o.clip[0] + yw * o.clip[1] + zw * o.clip[2] < 0) continue;
        var tone = Math.min(1, 0.3 + 0.7 * Math.max(0, (LX * X + LU * U + LV * V) / NORM)) * q.m;
        if (o.grid) {
          var ty = yw * Math.cos(0.41) - zw * Math.sin(0.41), tz = yw * Math.sin(0.41) + zw * Math.cos(0.41), lat = Math.asin(Math.max(-1, Math.min(1, tz))), lon = Math.atan2(ty, xw);
          var dl = Math.abs(((lon + 0.2618) % 0.5236 + 0.5236) % 0.5236 - 0.2618), dt = Math.abs(((lat + 0.2618) % 0.5236 + 0.5236) % 0.5236 - 0.2618);
          if (dl * Math.cos(lat) < 0.05 || dt < 0.05) tone = 0.06;
        }
        var i = y * R + x, dep = c[2] - dz * q.r; if (dep < zb[i]) { zb[i] = dep; tb[i] = tone; ib[i] = q.g; ci[i] = q.col || 0; }
      }
    });
    // thin dark seams between different solid faces (decals and the background are left alone)
    seam.fill(0); var x, y;
    for (y = 1; y < R; y++) for (x = 1; x < R; x++) {
      var i = y * R + x, a = ib[i], l = ib[i - 1], u = ib[i - R];
      if (a > 0 && ((l > 0 && l !== a) || (u > 0 && u !== a))) seam[i] = 1;
    }
    for (y = 1; y < R; y++) for (x = 1; x < R; x++) { var j = y * R + x; if (seam[j] || seam[j - 1] || seam[j - R]) { if (ib[j] > 0) tb[j] = 0; } }
    var out = new Float32Array(N * N), inv = 1 / (BLK * BLK), pal = s.pal, rgb = pal.length ? new Float32Array(N * N * 4) : null;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var sum = 0, cov = 0;
      for (var by = 0; by < BLK; by++) for (var bx = 0; bx < BLK; bx++) { var q = (y * BLK + by) * R + x * BLK + bx; sum += tb[q]; if (zb[q] < 1e8) cov++; }
      var v = sum * inv;
      out[y * N + x] = (cov >= BLK * BLK / 2 && v < 0.12) ? 0.12 : v;
      if (rgb && cov) {                                                  // colour of the cell = average of its covered pixels (colour x light; plain parts stay gray)
        var rr = 0, gg = 0, bb = 0, nc = 0;
        for (var cy2 = 0; cy2 < BLK; cy2++) for (var cx2 = 0; cx2 < BLK; cx2++) {
          var q2 = (y * BLK + cy2) * R + x * BLK + cx2; if (zb[q2] >= 1e8) continue;
          var cc = ci[q2], tt = Math.min(1, tb[q2]);
          if (cc) { var bc = pal[cc - 1], kk = 0.4 + 0.6 * tt; rr += bc[0] * kk; gg += bc[1] * kk; bb += bc[2] * kk; nc++; }
          else { var gv = 60 + tt * 170; rr += gv; gg += gv; bb += gv; }
        }
        var j4 = (y * N + x) * 4;
        rgb[j4] = rr / cov; rgb[j4 + 1] = gg / cov; rgb[j4 + 2] = bb / cov; rgb[j4 + 3] = nc ? 1 : 0;
      }     // a mostly-solid cell the seams darkened to ~0 stays lit (dark), not a white hole
    }
    out.rgb = rgb;                                                      // null for a gray model
    return out;
  }

  var scenes = {}, MODELS = {};
  var wrap = function (s) { return { yaw0: YAW0, pitch0: PITCH0, render: function (yaw, pitch) { return render(s, yaw, pitch); } }; };
  var motifScene = function (id) { return wrap(scenes[id] || (scenes[id] = build(id, MODELS[id]))); };
  var motifGrid = function (id) { var m = motifScene(id); return m.render(YAW0, PITCH0); };
  // projects with their own JSON model (content/works.json → model), keyed by project id; they replace the built-in drawing
  var setModels = function (map) { MODELS = map || {}; scenes = {}; };
  var modelScene = function (model) { return wrap(build(0, model)); };   // one model on its own (the admin's preview), not cached
  var hasBuiltIn = function (id) { return !!M[id]; };
  return { motifScene: motifScene, motifGrid: motifGrid, setModels: setModels, modelScene: modelScene, hasBuiltIn: hasBuiltIn };
})();
export const motifScene = _motifs.motifScene;
export const motifGrid = _motifs.motifGrid;
export const setModels = _motifs.setModels;
export const modelScene = _motifs.modelScene;
export const hasBuiltIn = _motifs.hasBuiltIn;

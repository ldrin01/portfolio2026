// Builds app/data/qc-map.json for the contact page: the Philippines, NCR and Quezon City as plain SVG path data in one
// shared coordinate space, so the page can zoom between them just by moving the viewBox.
//
//   node scripts/build-qc-map.mjs <dir with the source files>
//
// Source: faeldon/philippines-json-maps (PSA boundaries, PSGC 3Q 2026, MIT). The dir needs:
//   country.json                              GeoJSON of the regions (latest/geojson/country/*)
//   m_<code>.topo.json x4                     TopoJSON hires municities of the NCR districts 1303900000, 1307400000, 1307500000, 1307600000
//   qc_barangays.topo.json                    TopoJSON hires barangays of Quezon City (municities/hires/bgysubmuns-municity-1381300000)
import { readFileSync, writeFileSync } from 'node:fs'
import { geoMercator } from 'd3-geo'
import { feature } from 'topojson-client'
import { topology } from 'topojson-server'
import { presimplify, simplify } from 'topojson-simplify'

const dir = process.argv[2]
if (!dir) throw new Error('usage: node scripts/build-qc-map.mjs <source dir>')
const read = f => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))
const topo = f => { const t = read(f); return feature(t, Object.values(t.objects)[0]).features }

// 1 degree of latitude is about 1450 units here, so the whole country is ~24000 tall and Quezon City ~ 200 wide
const proj = geoMercator().center([122, 12.5]).scale(82800).translate([0, 0])
const flat = ([x, y]) => proj([x, y])

// project, simplify in the flat space (Visvalingam: drop the points that change the shape least), write as a path
const ringsOf = g => g.type === 'Polygon' ? [g.coordinates] : g.coordinates
const toPath = (features, weight, digits) => {
  const projected = features.map(f => ({
    type: 'Feature', properties: f.properties,
    geometry: { type: 'MultiPolygon', coordinates: ringsOf(f.geometry).map(poly => poly.map(ring => ring.map(flat))) }
  }))
  const t = presimplify(topology({ a: { type: 'FeatureCollection', features: projected } }))
  const s = simplify(t, weight)
  const f = feature(s, s.objects.a).features
  const num = n => +n.toFixed(digits)
  return f.map(ft => ({
    props: ft.properties,
    d: ringsOf(ft.geometry).map(poly => poly.map(ring => {
      if (ring.length < 4) return ''
      return 'M' + ring.slice(0, -1).map(p => `${num(p[0])} ${num(p[1])}`).join('L') + 'Z'
    }).join('')).join('')
  }))
}

const country = toPath(read('country.json').features, 220, 0)
const cities = ['1303900000', '1307400000', '1307500000', '1307600000'].flatMap(c => topo(`m_${c}.topo.json`))
const ncr = toPath(cities, 1.2, 1)
const qcFeature = cities.filter(f => f.properties.adm3_psgc === 1381300000)
const qc = toPath(qcFeature, .15, 1)[0].d
const barangays = toPath(topo('qc_barangays.topo.json'), .12, 1)

const [px, py] = flat([121.0509, 14.6515]) // the Quezon Memorial Circle
const bbox = d => { // x y w h of a path's points
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number); let a = 1e9, b = 1e9, c = -1e9, e = -1e9
  for (let i = 0; i < n.length; i += 2) { a = Math.min(a, n[i]); c = Math.max(c, n[i]); b = Math.min(b, n[i + 1]); e = Math.max(e, n[i + 1]) }
  return [a, b, c - a, e - b]
}
const all = bbox(country.map(c => c.d).join(''))
const ncrBox = bbox(ncr.map(c => c.d).join('')), qcBox = bbox(qc)

const out = {
  attribution: 'Boundaries: PSA via faeldon/philippines-json-maps',
  boxes: { ph: all, ncr: ncrBox, qc: qcBox },
  pin: [+px.toFixed(1), +py.toFixed(1)],
  regions: country.map(c => ({ name: c.props.adm1_en, d: c.d })),
  cities: ncr.map(c => ({ name: c.props.adm3_en, qc: c.props.adm3_psgc === 1381300000, d: c.d })),
  qc,
  barangays: barangays.map(b => ({ name: b.props.adm4_en, d: b.d }))
}
writeFileSync(new URL('../app/data/qc-map.json', import.meta.url), JSON.stringify(out))
console.log('boxes', out.boxes, 'pin', out.pin, 'bytes', JSON.stringify(out).length)

// Builds app/data/world.json for the globe at the start of the contact page's zoom: land outlines and country borders
// as plain GeoJSON, coarse on purpose (the globe is only ever seen far away).
//
//   node scripts/build-world.mjs <path to countries-110m.json>      (from the world-atlas package, Natural Earth, public domain)
import { readFileSync, writeFileSync } from 'node:fs'
import { feature, mesh } from 'topojson-client'

const file = process.argv[2]
if (!file) throw new Error('usage: node scripts/build-world.mjs <countries-110m.json>')
const t = JSON.parse(readFileSync(file, 'utf8'))
const round = c => typeof c[0] === 'number' ? c.map(n => +n.toFixed(2)) : c.map(round)
const land = feature(t, t.objects.land).features[0].geometry
const borders = mesh(t, t.objects.countries, (a, b) => a !== b)
writeFileSync(new URL('../app/data/world.json', import.meta.url), JSON.stringify({
  land: { ...land, coordinates: round(land.coordinates) },
  borders: { ...borders, coordinates: round(borders.coordinates) }
}))
console.log('land + borders written')

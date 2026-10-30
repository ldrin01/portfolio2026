// Cut thin glasses out of photo.png (dark frames on light green paper), using Vision's mask.png only to find the frame.
// Writes glasses.png (cutout) and glasses-depth.png (R = depth, 40 far .. 255 near, A = cutout), both cropped.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

func load(_ path: String) -> (data: [UInt8], w: Int, h: Int) {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil)!
  let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
  let w = img.width, h = img.height
  var data = [UInt8](repeating: 0, count: w * h * 4)
  let ctx = CGContext(data: &data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
  return (data, w, h)
}
func save(_ data: [UInt8], _ w: Int, _ h: Int, _ path: String) {
  var d = data
  let ctx = CGContext(data: &d, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
  CGImageDestinationFinalize(dest)
}

let dir = CommandLine.arguments[1]
let (P, W, H) = load(dir + "/photo.png")
let (M, _, _) = load(dir + "/mask.png")
let N = W * H

// HSV per pixel
var hue = [Float](repeating: 0, count: N), sat = hue, val = hue
for i in 0..<N {
  let r = Float(P[i * 4]) / 255, g = Float(P[i * 4 + 1]) / 255, b = Float(P[i * 4 + 2]) / 255
  let mx = max(r, g, b), mn = min(r, g, b), d = mx - mn
  var hh: Float = 0
  if d > 0 { hh = mx == r ? 60 * ((g - b) / d).truncatingRemainder(dividingBy: 6) : mx == g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4) }
  if hh < 0 { hh += 360 }
  hue[i] = hh; sat[i] = mx > 0 ? d / mx : 0; val[i] = mx
}
// paper (also in shadow, and seen through the lenses): green-yellow hue, some saturation
var paper = [Bool](repeating: false, count: N)
// the paper is mint (hue ~115); the clear nose pads are a more saturated yellow-green (hue 65-80), so they are not paper
for i in 0..<N { paper[i] = hue[i] > 55 && hue[i] < 175 && sat[i] > 0.1 && val[i] > 0.3 && !(hue[i] < 90 && sat[i] > 0.24) }
// the paper's top edge per column: first row where a long run of paper starts; nothing above it counts
var paperTop = [Int](repeating: H, count: W)
for x in 0..<W {
  var run = 0
  for y in 0..<H { run = paper[y * W + x] ? run + 1 : 0; if run >= 40 { paperTop[x] = y - 39; break } }
}
// candidates on the paper
var cand = [Bool](repeating: false, count: N)
for y in 0..<H { for x in 0..<W {
  let i = y * W + x
  if y < paperTop[x] + 6 { continue }
  // the frame is translucent, so paper tints it green: judge by darkness, not hue. Plus white highlights
  // (and the silicone sleeve), and the cream nose pads. Mid-tone green (soft shadows) stays out.
  let dark = val[i] < 0.5
  let highlight = sat[i] < 0.12 && val[i] > 0.72
  let pad = hue[i] > 28 && hue[i] < 90 && sat[i] > 0.24 && val[i] > 0.45 && M[i * 4] > 128 // inside Vision's rough outline, so light focused by the lenses onto the paper stays out
  cand[i] = dark || highlight || pad
} }
// keep only what connects to the frame Vision found (its mask, grown a little)
var seed = [Bool](repeating: false, count: N)
for i in 0..<N where M[i * 4] > 128 && cand[i] { seed[i] = true }
var keep = [Bool](repeating: false, count: N)
var stack = [Int]()
for i in 0..<N where seed[i] { keep[i] = true; stack.append(i) }
while let i = stack.popLast() {
  let x = i % W, y = i / W
  for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)] {
    let nx = x + dx, ny = y + dy
    if nx < 0 || ny < 0 || nx >= W || ny >= H { continue }
    let j = ny * W + nx
    if cand[j] && !keep[j] { keep[j] = true; stack.append(j) }
  }
}
// close 1px gaps: a pixel with 5+ kept neighbours is kept
var closed = keep
for y in 1..<(H - 1) { for x in 1..<(W - 1) {
  let i = y * W + x
  if keep[i] { continue }
  var n = 0
  for dy in -1...1 { for dx in -1...1 where keep[(y + dy) * W + x + dx] { n += 1 } }
  if n >= 5 { closed[i] = true }
} }
// bounding box
var x0 = W, y0 = H, x1 = 0, y1 = 0, count = 0
for y in 0..<H { for x in 0..<W where closed[y * W + x] { count += 1; x0 = min(x0, x); y0 = min(y0, y); x1 = max(x1, x); y1 = max(y1, y) } }
print("kept px:", count, "bbox:", x0, y0, x1, y1)
let pad = 16
x0 = max(0, x0 - pad); y0 = max(0, y0 - pad); x1 = min(W - 1, x1 + pad); y1 = min(H - 1, y1 + pad)
let cw = x1 - x0 + 1, ch = y1 - y0 + 1

// soft alpha: 3x3 average of the hard mask
func alphaAt(_ x: Int, _ y: Int) -> Float {
  var s: Float = 0, n: Float = 0
  for dy in -1...1 { for dx in -1...1 {
    let nx = x + dx, ny = y + dy
    if nx < 0 || ny < 0 || nx >= W || ny >= H { continue }
    s += closed[ny * W + nx] ? 1 : 0; n += 1
  } }
  return s / n
}
// depth: this photo looks at the glasses from the front, low: the frame (bottom) is nearest,
// the temples run away up the picture to their tips (far)
let frameTop = Float(M.indices.lazy.filter { $0 % 4 == 0 && M[$0] > 128 }.map { ($0 / 4) / W }.min() ?? y0)
var cut = [UInt8](repeating: 0, count: cw * ch * 4), dep = cut
for y in 0..<ch { for x in 0..<cw {
  let sx = x + x0, sy = y + y0, i = sy * W + sx, o = (y * cw + x) * 4
  let a = alphaAt(sx, sy)
  if a <= 0 { continue }
  let fy = Float(sy)
  var d: Float
  if fy >= frameTop { d = 0.82 + 0.18 * min(1, (fy - frameTop) / max(1, Float(y1) - frameTop)) }
  else { let t = (fy - Float(y0)) / max(1, frameTop - Float(y0)); d = 0.12 + 0.7 * t * t * (3 - 2 * t) }
  let A = UInt8(a * 255)
  for c in 0..<3 { cut[o + c] = UInt8(Float(P[i * 4 + c]) * a) } // premultiplied
  cut[o + 3] = A
  let R = UInt8((40 + 215 * d) * a)
  dep[o] = R; dep[o + 1] = R; dep[o + 2] = R; dep[o + 3] = A
} }
save(cut, cw, ch, dir + "/glasses.png")
save(dep, cw, ch, dir + "/glasses-depth.png")
print("out:", cw, ch)

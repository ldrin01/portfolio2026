// Cut the subject out of a photo with Vision (macOS subject lifting) and save the cutout plus its mask.
// usage: swift cutout.swift <in.jpg> <out-dir> <max-width>
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import UniformTypeIdentifiers

let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1]), outDir = URL(fileURLWithPath: args[2])
let maxW = CGFloat(Double(args[3]) ?? 1200)
let ctx = CIContext()

guard var img = CIImage(contentsOf: input, options: [.applyOrientationProperty: true]) else { fatalError("cannot read") }
let s = min(1, maxW / img.extent.width)
img = img.transformed(by: CGAffineTransform(scaleX: s, y: s))
img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY))
let cg = ctx.createCGImage(img, from: img.extent)!

let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: cg)
try handler.perform([req])
guard let obs = req.results?.first else { print("NO SUBJECT FOUND"); exit(2) }
print("instances:", obs.allInstances.count)
let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: buf)

func save(_ im: CIImage, _ name: String) {
  let url = outDir.appendingPathComponent(name)
  try! ctx.writePNGRepresentation(of: im, to: url, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
}
save(img, "photo.png")
save(mask, "mask.png")
let blend = CIFilter.blendWithMask()
blend.inputImage = img; blend.backgroundImage = CIImage(color: .clear).cropped(to: img.extent); blend.maskImage = mask
save(blend.outputImage!, "cutout.png")
print("size:", Int(img.extent.width), Int(img.extent.height))

// Stamps an "SV" disc onto an app icon PNG so the Statvis fork is never mistaken for upstream Orca.
// Usage: swift stamp-sv-icon.swift <input.png> <output.png>
import AppKit

let args = CommandLine.arguments
guard args.count == 3,
  let source = NSImage(contentsOfFile: args[1]),
  let sourceRep = source.representations.first
else {
  FileHandle.standardError.write("usage: stamp-sv-icon <input.png> <output.png>\n".data(using: .utf8)!)
  exit(1)
}

let width = sourceRep.pixelsWide
let height = sourceRep.pixelsHigh
guard
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0)
else { exit(1) }
// Why: pin points == pixels so drawing is resolution-independent of the host's backing scale.
rep.size = NSSize(width: width, height: height)

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let side = CGFloat(width)
source.draw(in: NSRect(x: 0, y: 0, width: side, height: CGFloat(height)))

let diameter = side * 0.38
let disc = NSRect(x: side * 0.95 - diameter, y: side * 0.05, width: diameter, height: diameter)
let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.45)
shadow.shadowBlurRadius = side * 0.02
shadow.shadowOffset = NSSize(width: 0, height: -side * 0.008)
NSGraphicsContext.saveGraphicsState()
shadow.set()
NSColor.white.setFill()
NSBezierPath(ovalIn: disc).fill()
NSGraphicsContext.restoreGraphicsState()

let ring = side * 0.022
NSColor(srgbRed: 0.93, green: 0.33, blue: 0.13, alpha: 1).setFill()
NSBezierPath(ovalIn: disc.insetBy(dx: ring, dy: ring)).fill()

let label = NSAttributedString(
  string: "SV",
  attributes: [
    .font: NSFont.systemFont(ofSize: diameter * 0.42, weight: .heavy),
    .foregroundColor: NSColor.white,
    .kern: -diameter * 0.01,
  ])
let labelSize = label.size()
label.draw(at: NSPoint(x: disc.midX - labelSize.width / 2, y: disc.midY - labelSize.height / 2))
NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: URL(fileURLWithPath: args[2]))

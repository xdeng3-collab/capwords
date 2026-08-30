import SwiftUI

// Port of src/components/PetSprite.js — the same character grids and palettes,
// so the buddy on the home screen is the same buddy that lives in the app.
// Kept static here: widgets do not animate, so the "boing" is dropped.

private let basePalette: [Character: Color] = [
    "o": Color(hex: 0x3A2A1A), // outline
    "e": Color(hex: 0x2E2018), // dot eye
    "m": Color(hex: 0x3A2A1A), // mouth
    "p": Color(hex: 0xF2A0AC), // blush
    "n": Color(hex: 0xE58A96), // tongue
    "z": Color(hex: 0x8C5A22), // closed-eye line
    "t": Color(hex: 0x7FB3D9), // tear
]

private func speciesPalette(_ species: String) -> [Character: Color] {
    var palette = basePalette
    switch species {
    case "dog":
        palette["b"] = Color(hex: 0xE0B27A)
        palette["h"] = Color(hex: 0xF4DDB8)
        palette["i"] = Color(hex: 0x8C5A3A)
        palette["d"] = Color(hex: 0x8C5A3A)
    case "bunny":
        palette["b"] = Color(hex: 0xF5B8C4)
        palette["h"] = Color(hex: 0xFBDDE3)
        palette["i"] = Color(hex: 0xE58A96)
        palette["d"] = Color(hex: 0xE58A96)
    default: // cat
        palette["b"] = Color(hex: 0xF9C784)
        palette["h"] = Color(hex: 0xFDEBC8)
        palette["i"] = Color(hex: 0xF2A0AC)
        palette["d"] = Color(hex: 0xD99E4E)
    }
    return palette
}

private func headRows(_ species: String) -> [String] {
    switch species {
    case "dog":
        return [
            "...oo........oo...",
            "..odddo....odddo..",
        ]
    case "bunny":
        return [
            "....oo......oo....",
            "...oiio....oiio...",
            "...oiio....oiio...",
            "...obbo....obbo...",
        ]
    default: // cat
        return [
            "....oo......oo....",
            "...oiio....oiio...",
            "...obbo....obbo...",
        ]
    }
}

private func faceRows(_ mood: String) -> [String] {
    switch mood {
    case "happy":
        return [".obhbebbbbbbebbbo.", ".obbbebbbbbbebbbo.", "obbppbbonnobbppbbo"]
    case "content":
        return [".obhbebbbbbbebbbo.", ".obbbebbbbbbebbbo.", "obbppbbbmmbbbppbbo"]
    case "sad":
        return [".obhbobbbbbbobbbo.", ".obbbebbbbbbetbbo.", "obbbbbbbmmbbbbbbbo"]
    case "sleepy":
        return [".obhbbbbbbbbbbbbo.", ".obbbzbbbbbbzbbbo.", "obbppbbbbbbbbppbbo"]
    default: // neutral
        return [".obhbebbbbbbebbbo.", ".obbbebbbbbbebbbo.", "obbbbbbbmmbbbbbbbo"]
    }
}

private func bodyGrid(species: String, mood: String) -> [String] {
    headRows(species) + [
        "..oooooooooooooo..",
        ".obhhbbbbbbbbbbbo.",
    ] + faceRows(mood) + [
        "obbbbbbbbbbbbbbbbo",
        "obbbbbbbbbbbbbbbbo",
        ".oooooooooooooooo.",
    ]
}

private struct Outfit {
    let x: Int
    let y: Int
    let grid: [String]
    let palette: [Character: Color]
}

private func outfitSprite(_ outfit: String) -> Outfit? {
    switch outfit {
    case "bow":
        return Outfit(x: 6, y: -2, grid: ["rr..rr", "rrkkrr", "rr..rr"],
                      palette: ["r": Color(hex: 0xD96C6C), "k": Color(hex: 0xB54A4A)])
    case "scarf":
        return Outfit(x: 3, y: 5, grid: ["cccccccccccc", ".........cc.", "........cc.."],
                      palette: ["c": Color(hex: 0xD96C6C)])
    case "cap":
        return Outfit(x: 3, y: -2, grid: ["..bbbbbbbb..", ".bbbbbbbbbb.", "bbbbbbbbbbbbb"],
                      palette: ["b": Color(hex: 0x5D8FC4)])
    case "crown":
        return Outfit(x: 6, y: -2, grid: ["g.gg.g", "gggggg"],
                      palette: ["g": Color(hex: 0xF2C14E)])
    default:
        return nil
    }
}

/// Draws a character grid as flat squares — the Swift twin of PixelSprite.js.
private struct PixelGrid: View {
    let grid: [String]
    let palette: [Character: Color]
    let pixel: CGFloat

    var body: some View {
        let columns = grid.map(\.count).max() ?? 0
        Canvas { context, _ in
            for (y, row) in grid.enumerated() {
                for (x, key) in row.enumerated() {
                    guard key != "." && key != " ", let color = palette[key] else { continue }
                    let rect = CGRect(x: CGFloat(x) * pixel, y: CGFloat(y) * pixel,
                                      width: pixel, height: pixel)
                    context.fill(Path(rect), with: .color(color))
                }
            }
        }
        .frame(width: CGFloat(columns) * pixel, height: CGFloat(grid.count) * pixel)
    }
}

struct PixelPet: View {
    let species: String
    let mood: String
    let outfit: String
    /// Size of one pixel cell. The sprite is 18 cells wide.
    var pixel: CGFloat = 4

    var body: some View {
        let grid = bodyGrid(species: species, mood: mood)
        let headOffset = headRows(species).count
        let sprite = outfitSprite(outfit)

        ZStack(alignment: .topLeading) {
            PixelGrid(grid: grid, palette: speciesPalette(species), pixel: pixel)
            if let sprite {
                PixelGrid(grid: sprite.grid, palette: sprite.palette, pixel: pixel)
                    .offset(x: CGFloat(sprite.x) * pixel,
                            y: CGFloat(headOffset + sprite.y) * pixel)
            }
        }
        .frame(width: 18 * pixel, height: CGFloat(grid.count) * pixel)
    }
}

/// The app's signature backdrop: a sky band over sand, split like the pet stage
/// on the Buddy screen.
struct SkyGroundBackground: View {
    var skyFraction: CGFloat = 0.55

    var body: some View {
        GeometryReader { geo in
            VStack(spacing: 0) {
                Color("WidgetSky").opacity(0.42)
                    .frame(height: geo.size.height * skyFraction)
                Color("WidgetSand")
            }
        }
    }
}

/// The buddy with the soft ground shadow it bounces over in the app.
struct PixelPetStanding: View {
    let species: String
    let mood: String
    let outfit: String
    var pixel: CGFloat = 4

    var body: some View {
        VStack(spacing: 0) {
            PixelPet(species: species, mood: mood, outfit: outfit, pixel: pixel)
            PixelGrid(
                grid: ["...ssssssssssss...", ".ssssssssssssssss."],
                palette: ["s": Color(hex: 0x3A2A1A).opacity(0.16)],
                pixel: pixel
            )
            .offset(y: -pixel)
        }
    }
}

/// The app's flame glyph from PixelIcon.js. Drawn rather than using an emoji:
/// the widget's rendering context falls back to a tofu box for 🔥.
struct PixelFlame: View {
    var pixel: CGFloat = 2
    var body: some View {
        PixelGrid(
            grid: ["..c..", ".cLc.", "cLLLc", "cLLLc", "cLLLc", ".ccc."],
            palette: ["c": Color(hex: 0x3A2A1A), "L": Color(hex: 0xE0742F)],
            pixel: pixel
        )
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

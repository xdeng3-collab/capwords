import WidgetKit
import SwiftUI
import Security

// MARK: - Shared data

/// Written by src/services/widgetService.js into the shared keychain group.
struct CapWordsSnapshot: Codable {
    struct LastWord: Codable {
        var word: String
        var pronunciation: String
        var english: String
        var thumbnail: String?
    }

    struct RecentWord: Codable, Hashable {
        var word: String
        var english: String
    }

    var petName: String
    var species: String
    var outfit: String
    var mood: String
    var streak: Int
    var bestStreak: Int
    var wordsToday: Int
    var dailyGoal: Int
    var totalWords: Int
    var lastWord: LastWord?
    var recentWords: [RecentWord]

    static let placeholder = CapWordsSnapshot(
        petName: "Biscuit",
        species: "cat",
        outfit: "none",
        mood: "content",
        streak: 12,
        bestStreak: 14,
        wordsToday: 2,
        dailyGoal: 5,
        totalWords: 48,
        lastWord: nil,
        recentWords: []
    )

    static func load() -> CapWordsSnapshot {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.capwordsxxx.shared",
            kSecAttrAccount as String: "snapshot",
            kSecAttrAccessGroup as String: "A59BMF9Y7J.com.capwordsxxx.shared",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let decoded = try? JSONDecoder().decode(CapWordsSnapshot.self, from: data)
        else {
            return .placeholder
        }
        return decoded
    }
}

// MARK: - State

/// The three states both widget sizes are designed against.
enum WidgetState {
    case goalHit
    case inProgress
    case atRisk

    static func from(_ s: CapWordsSnapshot) -> WidgetState {
        if s.wordsToday >= s.dailyGoal && s.dailyGoal > 0 { return .goalHit }
        if s.wordsToday == 0 && s.streak > 0 { return .atRisk }
        return .inProgress
    }

    /// Accent drives bubble border, chip border, badge fill and streak number.
    var accent: Color {
        switch self {
        case .goalHit: return Color(hex: 0x4E7B45)
        case .inProgress: return Color(hex: 0x3A2A1A)
        case .atRisk: return Color(hex: 0xC1584E)
        }
    }

    var streakColor: Color {
        self == .atRisk ? Color(hex: 0xC1584E) : Color(hex: 0xE0742F)
    }

    var petMood: String {
        switch self {
        case .goalHit: return "happy"
        case .inProgress: return "content"
        case .atRisk: return "sad"
        }
    }

    /// Mirrors PET_MOODS in src/config.js.
    var line: String {
        switch self {
        case .goalHit: return "You hit your goal! I am so proud!"
        case .inProgress: return "Nice! Keep the words coming."
        case .atRisk: return "I haven't seen a new word in a while..."
        }
    }

    var sand: Color {
        self == .atRisk ? Color(hex: 0xE0C9A6) : Color(hex: 0xE8D6AE)
    }

    /// Sky wash over the sand on the medium stage.
    var sky: Color {
        switch self {
        case .goalHit: return Color(hex: 0x8FC6E8).opacity(0.55)
        case .inProgress: return Color(hex: 0x8FC6E8).opacity(0.42)
        case .atRisk: return Color(hex: 0xB5638F).opacity(0.30)
        }
    }
}

// MARK: - Pixel helpers

private let outline = Color(hex: 0x3A2A1A)
private let surface = Color(hex: 0xFBF3E0)
private let parchment = Color(hex: 0xF3E9D2)
private let textMain = Color(hex: 0x4A3826)
private let textLight = Color(hex: 0x6F5A41)
private let sun = Color(hex: 0xF2C14E)

/// Local twin of PixelSprite.js / PixelGrid (PixelPet.swift keeps its own private copy).
struct WidgetPixelGrid: View {
    let grid: [String]
    let palette: [Character: Color]
    let pixel: CGFloat

    var body: some View {
        let columns = grid.map(\.count).max() ?? 0
        Canvas { context, _ in
            for (y, row) in grid.enumerated() {
                for (x, key) in row.enumerated() {
                    guard key != ".", key != " ", let color = palette[key] else { continue }
                    let rect = CGRect(x: CGFloat(x) * pixel, y: CGFloat(y) * pixel,
                                      width: pixel, height: pixel)
                    context.fill(Path(rect), with: .color(color))
                }
            }
        }
        .frame(width: CGFloat(columns) * pixel, height: CGFloat(grid.count) * pixel)
    }
}

/// PixelIcon.js 'check'.
struct PixelCheck: View {
    var pixel: CGFloat = 2.6
    var color: Color = Color(hex: 0x4E7B45)
    var body: some View {
        WidgetPixelGrid(
            grid: [".....", "....c", "...cc", "c.cc.", "ccc..", ".c..."],
            palette: ["c": color], pixel: pixel
        )
    }
}

/// PixelIcon.js 'star'.
struct PixelStar: View {
    var pixel: CGFloat = 2.6
    var body: some View {
        WidgetPixelGrid(
            grid: ["..c..", "..c..", "ccccc", ".ccc.", ".c.c.", "c...c"],
            palette: ["c": sun], pixel: pixel
        )
    }
}

/// Segmented progress, same geometry as ProgressBar in src/components/UI.js.
struct PixelPips: View {
    let filled: Int
    let total: Int
    var height: CGFloat = 8
    var boxed: Bool = false

    var body: some View {
        HStack(spacing: boxed ? 3 : 2) {
            ForEach(0..<max(total, 1), id: \.self) { i in
                Rectangle()
                    .fill(i < filled ? sun : Color.clear)
                    .overlay(
                        Rectangle().stroke(i < filled ? outline : Color(hex: 0xA38F6F),
                                           lineWidth: boxed ? 0 : 1)
                    )
            }
        }
        .frame(height: height)
        .padding(boxed ? 2 : 0)
        .background(boxed ? Color(hex: 0xF0E2C4) : Color.clear)
        .overlay(boxed ? RoundedRectangle(cornerRadius: 2).stroke(outline, lineWidth: 2) : nil)
    }
}

/// Streak chip: surface fill, hard accent border, flame + number.
struct StreakChip: View {
    let streak: Int
    let state: WidgetState

    var body: some View {
        HStack(spacing: 5) {
            PixelFlame(pixel: 2.6)
            Text("\(streak)")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(state.streakColor)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(surface)
        .overlay(RoundedRectangle(cornerRadius: 4).stroke(state.accent, lineWidth: 2))
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

/// Flat sun rays behind the buddy — goal-hit state only, medium size.
struct SunRays: View {
    var body: some View {
        Canvas { context, size in
            let origin = CGPoint(x: size.width * 0.26, y: size.height)
            let radius = max(size.width, size.height) * 1.6
            var angle: Double = 196
            while angle < 344 {
                var path = Path()
                path.move(to: origin)
                for a in [angle, angle + 5] {
                    let r = a * .pi / 180
                    path.addLine(to: CGPoint(x: origin.x + cos(r) * radius,
                                             y: origin.y + sin(r) * radius))
                }
                path.closeSubpath()
                context.fill(path, with: .color(sun.opacity(0.55)))
                angle += 13
            }
        }
    }
}

/// Confetti — goal-hit state only, small size. Fixed positions, 5pt squares.
struct Confetti: View {
    private let dots: [(CGFloat, CGFloat, UInt32)] = [
        (22, 92, 0xD96C6C), (44, 104, 0x5BA88C), (74, 90, 0xF2C14E),
        (106, 100, 0xB5638F), (146, 90, 0x5D8FC4), (30, 114, 0xF2C14E),
        (126, 114, 0xD96C6C),
    ]

    var body: some View {
        GeometryReader { _ in
            ForEach(Array(dots.enumerated()), id: \.offset) { _, dot in
                Rectangle()
                    .fill(Color(hex: dot.2))
                    .frame(width: 5, height: 5)
                    .position(x: dot.0 + 2.5, y: dot.1 + 2.5)
            }
        }
    }
}

// MARK: - Small: speech

struct SmallView: View {
    let snapshot: CapWordsSnapshot
    var state: WidgetState { .from(snapshot) }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Ground strip
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                state.sand.frame(height: 46)
            }

            if state == .goalHit { Confetti() }

            // Speech bubble
            VStack(alignment: .leading, spacing: 3) {
                switch state {
                case .goalHit:
                    HStack(spacing: 5) {
                        PixelCheck()
                        Text("GOAL HIT \(snapshot.wordsToday)/\(snapshot.dailyGoal)")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .tracking(0.6)
                            .foregroundStyle(Color(hex: 0x4E7B45))
                            .lineLimit(1)
                    }
                case .inProgress:
                    Text("\(snapshot.wordsToday) OF \(snapshot.dailyGoal) TODAY")
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .tracking(0.6)
                        .foregroundStyle(textLight)
                        .lineLimit(1)
                case .atRisk:
                    HStack(spacing: 5) {
                        PixelFlame(pixel: 2.6)
                        Text("ENDS TONIGHT")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .tracking(0.6)
                            .foregroundStyle(Color(hex: 0xC1584E))
                            .lineLimit(1)
                    }
                }

                Text(state.line)
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(textMain)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)

                if state == .inProgress {
                    PixelPips(filled: snapshot.wordsToday, total: snapshot.dailyGoal)
                        .padding(.top, 4)
                }
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(surface)
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(state.accent, lineWidth: 3))
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .background(
                RoundedRectangle(cornerRadius: 4)
                    .fill(state.accent.opacity(0.4))
                    .offset(y: 3)
            )

            // Buddy, bottom right
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                HStack(spacing: 0) {
                    Spacer(minLength: 0)
                    PixelPetStanding(species: snapshot.species, mood: state.petMood,
                                     outfit: snapshot.outfit, pixel: 3.4)
                }
            }

            // Streak chip, bottom left
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                HStack(spacing: 0) {
                    StreakChip(streak: snapshot.streak, state: state)
                    Spacer(minLength: 0)
                }
                .padding(.bottom, 2)
            }
        }
    }
}

// MARK: - Medium: stage

struct MediumView: View {
    let snapshot: CapWordsSnapshot
    var state: WidgetState { .from(snapshot) }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Buddy on the ground, left
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                HStack(spacing: 0) {
                    PixelPetStanding(species: snapshot.species, mood: state.petMood,
                                     outfit: snapshot.outfit, pixel: 5.2)
                    Spacer(minLength: 0)
                }
            }

            if state == .goalHit {
                PixelStar(pixel: 4).offset(x: 96, y: 26)
                PixelStar(pixel: 2.6).offset(x: 22, y: 44)
            }

            // Right column
            HStack(spacing: 0) {
                Spacer(minLength: 0)
                VStack(alignment: .leading, spacing: 0) {
                    header
                    Spacer(minLength: 6)
                    HStack(alignment: .bottom, spacing: 10) {
                        PixelFlame(pixel: 3.6).padding(.bottom, 6)
                        Text("\(snapshot.streak)")
                            .font(.system(size: 52, weight: .black, design: .rounded))
                            .foregroundStyle(state.streakColor)
                        if state == .goalHit {
                            Text("+1")
                                .font(.system(size: 20, weight: .black, design: .rounded))
                                .foregroundStyle(Color(hex: 0x4E7B45))
                                .padding(.bottom, 7)
                        }
                    }
                    Spacer(minLength: 6)
                    Text(state.line)
                        .font(.system(size: 15, weight: .black, design: .rounded))
                        .foregroundStyle(textMain)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(width: 176, alignment: .leading)
            }
        }
    }

    @ViewBuilder private var header: some View {
        switch state {
        case .goalHit:
            HStack(spacing: 6) {
                PixelCheck(color: Color(hex: 0xF3E9D2))
                Text("GOAL HIT — \(snapshot.wordsToday) OF \(snapshot.dailyGoal)")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .tracking(1.4)
                    .foregroundStyle(Color(hex: 0xF3E9D2))
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(hex: 0x4E7B45))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(outline, lineWidth: 2))
            .clipShape(RoundedRectangle(cornerRadius: 4))
        case .inProgress:
            VStack(alignment: .leading, spacing: 5) {
                PixelPips(filled: snapshot.wordsToday, total: snapshot.dailyGoal,
                          height: 10, boxed: true)
                Text("\(snapshot.wordsToday) OF \(snapshot.dailyGoal) WORDS TODAY")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .tracking(1.4)
                    .foregroundStyle(textLight)
            }
        case .atRisk:
            HStack(spacing: 6) {
                PixelFlame(pixel: 2.6)
                Text("ENDS TONIGHT")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .tracking(1.4)
                    .foregroundStyle(Color(hex: 0xF3E9D2))
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(hex: 0xC1584E))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(outline, lineWidth: 2))
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }
}

// MARK: - Timeline

struct CapWordsEntry: TimelineEntry {
    let date: Date
    let snapshot: CapWordsSnapshot
}

struct CapWordsProvider: TimelineProvider {
    func placeholder(in context: Context) -> CapWordsEntry {
        CapWordsEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (CapWordsEntry) -> Void) {
        completion(CapWordsEntry(date: Date(), snapshot: CapWordsSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CapWordsEntry>) -> Void) {
        let entry = CapWordsEntry(date: Date(), snapshot: CapWordsSnapshot.load())
        let nextMidnight = Calendar.current.nextDate(
            after: Date(),
            matching: DateComponents(hour: 0, minute: 1),
            matchingPolicy: .nextTime
        ) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
    }
}

// MARK: - Entry point

struct CapWordsWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: CapWordsProvider.Entry

    private var state: WidgetState { .from(entry.snapshot) }

    var body: some View {
        Group {
            switch family {
            case .systemSmall: SmallView(snapshot: entry.snapshot)
            default: MediumView(snapshot: entry.snapshot)
            }
        }
        .widgetURL(URL(string: "capwords://camera"))
        .containerBackground(for: .widget) {
            if family == .systemSmall {
                parchment
            } else {
                ZStack(alignment: .top) {
                    state.sand
                    GeometryReader { geo in
                        ZStack {
                            state.sky
                            if state == .goalHit { SunRays() }
                        }
                        .frame(height: geo.size.height * 0.66)
                    }
                }
            }
        }
    }
}

@main
struct CapWordsWidget: Widget {
    let kind = "CapWordsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CapWordsProvider()) { entry in
            CapWordsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("CapWords")
        .description("Your buddy, your streak, and how today is going.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

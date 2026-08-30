import WidgetKit
import SwiftUI
import Security

// MARK: - Shared data

/// Written by src/services/widgetService.js into the App Group container.
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

    /// Shown before the app has ever written a snapshot, and in the widget gallery.
    static let placeholder = CapWordsSnapshot(
        petName: "Your buddy",
        species: "cat",
        outfit: "bow",
        mood: "happy",
        streak: 3,
        bestStreak: 5,
        wordsToday: 2,
        dailyGoal: 5,
        totalWords: 12,
        lastWord: LastWord(word: "瀑布", pronunciation: "pù bù",
                           english: "waterfall", thumbnail: nil),
        recentWords: [
            RecentWord(word: "瀑布", english: "waterfall"),
            RecentWord(word: "百叶窗", english: "blinds"),
            RecentWord(word: "台灯", english: "lamp"),
        ]
    )

    /// Reads the snapshot the app wrote into the shared keychain access group.
    /// Must stay in step with modules/shared-store/ios/SharedStoreModule.swift.
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
        // The app reloads the widget whenever the data actually changes; this
        // refresh only exists so the streak rolls over if the app never opens.
        let nextMidnight = Calendar.current.nextDate(
            after: Date(),
            matching: DateComponents(hour: 0, minute: 1),
            matchingPolicy: .nextTime
        ) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
    }
}

// MARK: - Pieces

private struct PixelPanel<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(8)
            .background(Color("WidgetSurface"))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color("WidgetOutline"), lineWidth: 2)
            )
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

private struct StreakBadge: View {
    let streak: Int
    var compact = false

    var body: some View {
        HStack(spacing: 3) {
            PixelFlame(pixel: compact ? 1.8 : 2.2)
            Text("\(streak)")
                .font(.system(size: compact ? 13 : 15, weight: .black, design: .rounded))
                .foregroundStyle(Color("WidgetStreak"))
            if !compact {
                Text("DAY")
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundStyle(Color("WidgetTextMuted"))
            }
        }
    }
}

private struct WordCard: View {
    let word: CapWordsSnapshot.LastWord
    var showThumbnail = true

    private var thumbnail: UIImage? {
        guard let base64 = word.thumbnail,
              let data = Data(base64Encoded: base64) else { return nil }
        return UIImage(data: data)
    }

    var body: some View {
        HStack(spacing: 8) {
            if showThumbnail, let image = thumbnail {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(Color("WidgetOutline"), lineWidth: 2)
                    )
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(word.word)
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .foregroundStyle(Color("WidgetText"))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                if !word.pronunciation.isEmpty {
                    Text("/\(word.pronunciation)/")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color("WidgetTextLight"))
                        .lineLimit(1)
                }
                if !word.english.isEmpty {
                    Text(word.english)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color("WidgetTextMuted"))
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

// MARK: - Sizes

/// Small: just the buddy and the streak — the emotional hook, nothing else.
private struct SmallView: View {
    let snapshot: CapWordsSnapshot

    var body: some View {
        VStack(spacing: 4) {
            PixelPet(species: snapshot.species, mood: snapshot.mood,
                     outfit: snapshot.outfit, pixel: 3.4)
            Text(snapshot.petName.uppercased())
                .font(.system(size: 10, weight: .black, design: .rounded))
                .foregroundStyle(Color("WidgetTextLight"))
                .lineLimit(1)
            StreakBadge(streak: snapshot.streak)
        }
    }
}

/// Medium: the buddy plus the last word learned, with its photo.
private struct MediumView: View {
    let snapshot: CapWordsSnapshot

    var body: some View {
        HStack(spacing: 12) {
            VStack(spacing: 3) {
                PixelPet(species: snapshot.species, mood: snapshot.mood,
                         outfit: snapshot.outfit, pixel: 3)
                StreakBadge(streak: snapshot.streak, compact: true)
            }
            VStack(alignment: .leading, spacing: 5) {
                Text("LAST WORD")
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundStyle(Color("WidgetTextMuted"))
                if let last = snapshot.lastWord {
                    WordCard(word: last)
                } else {
                    Text("Snap something to learn your first word.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color("WidgetTextLight"))
                }
            }
            Spacer(minLength: 0)
        }
    }
}

/// Large: everything — buddy, streaks, the last word, and the words before it.
private struct LargeView: View {
    let snapshot: CapWordsSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                PixelPet(species: snapshot.species, mood: snapshot.mood,
                         outfit: snapshot.outfit, pixel: 3.6)
                VStack(alignment: .leading, spacing: 3) {
                    Text(snapshot.petName)
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(Color("WidgetText"))
                        .lineLimit(1)
                    StreakBadge(streak: snapshot.streak)
                    Text("BEST \(snapshot.bestStreak)  ·  \(snapshot.totalWords) WORDS")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                        .foregroundStyle(Color("WidgetTextMuted"))
                }
                Spacer(minLength: 0)
            }

            if let last = snapshot.lastWord {
                PixelPanel {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("LAST WORD")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .foregroundStyle(Color("WidgetTextMuted"))
                        WordCard(word: last)
                    }
                }
            }

            let earlier = Array(snapshot.recentWords.dropFirst())
            if !earlier.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("BEFORE THAT")
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .foregroundStyle(Color("WidgetTextMuted"))
                    ForEach(earlier, id: \.self) { item in
                        HStack(spacing: 6) {
                            Text(item.word)
                                .font(.system(size: 13, weight: .black, design: .rounded))
                                .foregroundStyle(Color("WidgetText"))
                            Text(item.english)
                                .font(.system(size: 11, weight: .semibold, design: .rounded))
                                .foregroundStyle(Color("WidgetTextMuted"))
                                .lineLimit(1)
                            Spacer(minLength: 0)
                        }
                    }
                }
            }

            Spacer(minLength: 0)
        }
    }
}

// MARK: - Entry point

struct CapWordsWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: CapWordsProvider.Entry

    var body: some View {
        Group {
            switch family {
            case .systemSmall: SmallView(snapshot: entry.snapshot)
            case .systemLarge: LargeView(snapshot: entry.snapshot)
            default: MediumView(snapshot: entry.snapshot)
            }
        }
        // Tapping anywhere opens straight into the camera.
        .widgetURL(URL(string: "capwords://camera"))
        .containerBackground(Color("WidgetBackground"), for: .widget)
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
        .description("Your buddy, your streak, and the last word you learned.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

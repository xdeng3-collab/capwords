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

/// A chip in the app's style: solid fill, hard pixel outline, no blur.
private struct PixelChip<Content: View>: View {
    var fill: Color = Color("WidgetSurface")
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(fill)
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color("WidgetOutline"), lineWidth: 2))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

private struct StreakChip: View {
    let streak: Int

    var body: some View {
        PixelChip {
            HStack(spacing: 4) {
                PixelFlame(pixel: 2)
                Text("\(streak)")
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(Color("WidgetStreak"))
                Text(streak == 1 ? "DAY" : "DAYS")
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundStyle(Color("WidgetTextMuted"))
            }
        }
    }
}

/// The buddy on a solid "stage", echoing the pet card on the Buddy screen.
private struct PetStage: View {
    let snapshot: CapWordsSnapshot
    var pixel: CGFloat

    var body: some View {
        PixelPet(species: snapshot.species, mood: snapshot.mood,
                 outfit: snapshot.outfit, pixel: pixel)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(Color("WidgetPanel"))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color("WidgetOutline"), lineWidth: 2))
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

private struct WordThumbnail: View {
    let base64: String?
    var side: CGFloat

    private var image: UIImage? {
        guard let base64, let data = Data(base64Encoded: base64) else { return nil }
        return UIImage(data: data)
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().aspectRatio(contentMode: .fill)
            } else {
                Color("WidgetPanel")
            }
        }
        .frame(width: side, height: side)
        .overlay(RoundedRectangle(cornerRadius: 5).stroke(Color("WidgetOutline"), lineWidth: 2))
        .clipShape(RoundedRectangle(cornerRadius: 5))
    }
}

// MARK: - Sizes

/// Small: the buddy, big, with the streak. One idea, filling the tile.
private struct SmallView: View {
    let snapshot: CapWordsSnapshot

    var body: some View {
        VStack(spacing: 6) {
            PetStage(snapshot: snapshot, pixel: 4.4)
            Text(snapshot.petName.uppercased())
                .font(.system(size: 11, weight: .black, design: .rounded))
                .foregroundStyle(Color("WidgetText"))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            StreakChip(streak: snapshot.streak)
        }
    }
}

/// Medium: buddy on the left, the last word filling the rest.
private struct MediumView: View {
    let snapshot: CapWordsSnapshot

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(spacing: 5) {
                PetStage(snapshot: snapshot, pixel: 2.9)
                StreakChip(streak: snapshot.streak)
            }
            .frame(width: 104)

            if let last = snapshot.lastWord {
                HStack(spacing: 9) {
                    WordThumbnail(base64: last.thumbnail, side: 72)
                    // Centred, and the sub-lines are optional: recognition can
                    // fall back to a bare word with no pronunciation or gloss,
                    // and the block should still look deliberate.
                    VStack(alignment: .leading, spacing: 2) {
                        Text("LAST WORD")
                            .font(.system(size: 8, weight: .black, design: .rounded))
                            .foregroundStyle(Color("WidgetTextMuted"))
                        Text(last.word)
                            .font(.system(size: 23, weight: .black, design: .rounded))
                            .foregroundStyle(Color("WidgetText"))
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                        if !last.pronunciation.isEmpty {
                            Text("/\(last.pronunciation)/")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundStyle(Color("WidgetTextLight"))
                                .lineLimit(1)
                        }
                        if !last.english.isEmpty {
                            Text(last.english)
                                .font(.system(size: 11, weight: .semibold, design: .rounded))
                                .foregroundStyle(Color("WidgetTextMuted"))
                                .lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxHeight: .infinity)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text("NO WORDS YET")
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .foregroundStyle(Color("WidgetTextMuted"))
                    Text("Tap to snap your first word with \(snapshot.petName).")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(Color("WidgetText"))
                        .lineLimit(3)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            }
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
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

# CapWords

A visual language learning app where users photograph objects to learn vocabulary in their target language — wrapped in a cozy Stardew-Valley-style pixel art theme with a virtual pet companion.

## Features

### Your Pixel Pet
- **Buddy companion**: An original, hand-drawn pixel pet (rendered purely from Views, no image assets) that lives on the home screen
- **Name your pet**: On first launch you choose your buddy's name; rename any time
- **Mood reacts to learning**: Like Duolingo, the pet is happy when you hit your daily goal, content while you make progress, and sad if you have been away and your streak is at risk

### Core Learning
- **Photo recognition**: Take a photo of any object, and AI identifies it and provides the word in your target language
- **Sticker collection**: Each learned word becomes a pixel sticker in your collection
- **Pronunciation**: Listen to correct pronunciation with one tap
- **Record & practice**: Hold to record your pronunciation, release to stop
- **Progress tracking**: Daily word count, streak tracking, and goal setting

### Social
- **Add friends**: Search and add friends (like Duolingo)
- **Streak system**: Meet your daily word target to extend your streak
- **View collections**: See your friends' sticker collections
- **Listen to friends**: Hear how your friends pronounce words

### Subscription & Pricing
- **Free Tier**: 3 words per day
- **Pay Per Word**: $0.01/word (buy packs of 10, 50, or 100)
- **Monthly Pro**: $4.99/month (unlimited)
- **Yearly Pro**: $39.99/year (unlimited, save 33%)

## Cost Analysis

Using DeepSeek V4 Flash API:
| Component | Cost per word |
|-----------|--------------|
| AI Image Recognition (input) | $0.00007 |
| AI Translation (output) | $0.00006 |
| Infrastructure & Storage | $0.00200 |
| **Total** | **~$0.0025** |

With a selling price of $0.01/word, we maintain a 4x margin to cover:
- Server infrastructure
- CDN and image storage
- App maintenance
- Customer support

## Tech Stack

- **Frontend**: React Native + Expo (SDK 52)
- **AI**: DeepSeek V4 Flash (image recognition, translation)
- **TTS**: expo-speech (native text-to-speech)
- **Audio**: expo-audio (recording & playback)
- **Visuals**: hand-authored pixel art (Views) + Animated API
- **Feedback**: expo-haptics
- **Storage**: AsyncStorage (local), expandable to cloud backend
- **Navigation**: React Navigation

## Design System

A cozy, retro Stardew-Valley-inspired pixel theme. No emojis — every icon and
the pet are drawn from pixel grids. Shared design tokens live in `src/config.js`
and reusable components in `src/components/`:

- `COLORS` — warm parchment/wood retro palette
- `RADIUS` / `SPACING` / `SHADOW` — near-square corners and hard, offset pixel shadows
- `CATEGORY_STYLES` — a pixel-icon key + colour per sticker category
- `PET_MOODS` — mood copy driven by streak + daily progress
- `PixelSprite.js` — renders any bitmap from a 2D grid of colour keys (no image files)
- `PetSprite.js` — the original pixel pet with per-mood expressions and idle animation
- `PixelIcon.js` — pixel-art glyph set used everywhere in place of emojis/vector icons
- `UI.js` — `PixelPanel`/`Card`, `PixelButton`, `Pill`, `EmptyState`, `ProgressBar` (segmented)

## Troubleshooting

### iOS build fails with a `fmt` / `consteval` error

On Xcode 26+, the `fmt` library bundled with React Native 0.76 fails to
compile:

```
Pods/fmt/include/fmt/format-inl.h:59:24: error: call to consteval function
'fmt::basic_format_string<...>' is not a constant expression
```

This is handled automatically by the `plugins/withFmtConstevalFix.js` config
plugin (registered in `app.json`), which patches the generated Podfile on every
`prebuild` / `pod install`. See [expo/expo#44229](https://github.com/expo/expo/issues/44229).

### "No bundle URL present" red screen

The app launched but the Metro bundler isn't running. Start it with
`npx expo start`, then reload the app (⌘R in the simulator).

## Supported Languages

English | 中文 | Español | Français | Deutsch | 日本語 | 한국어 | Português | Italiano | Русский | العربية | हिन्दी

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

## Project Structure

```
capwords/
├── App.js                        # Entry point
├── plugins/
│   └── withFmtConstevalFix.js    # iOS build fix for fmt on Xcode 26+
├── src/
│   ├── config.js                 # Design tokens, API keys, pricing
│   ├── components/
│   │   ├── UI.js                 # PixelPanel, PixelButton, Pill, EmptyState, ProgressBar
│   │   ├── PixelSprite.js        # Grid-based bitmap renderer (no image assets)
│   │   ├── PetSprite.js          # Original pixel pet with per-mood expressions
│   │   └── PixelIcon.js          # Pixel-art glyph set (replaces emojis/vector icons)
│   ├── navigation/
│   │   └── AppNavigator.js       # Pixel tab bar + stacks
│   ├── screens/
│   │   ├── PetScreen.js          # Pet home: mood, streak, goal, naming
│   │   ├── CameraScreen.js       # Photo capture screen
│   │   ├── StickerResultScreen.js # Word result + pronunciation
│   │   ├── CollectionScreen.js   # Sticker collection by date
│   │   ├── StickerDetailScreen.js # Single sticker detail
│   │   ├── FriendsScreen.js      # Friends list & search
│   │   ├── FriendProfileScreen.js # View friend's collection
│   │   ├── ProfileScreen.js      # User profile & settings
│   │   ├── SubscriptionScreen.js # Pricing & subscription
│   │   ├── LanguageSelectScreen.js # Language picker
│   │   └── GoalSettingScreen.js  # Daily goal configuration
│   └── services/
│       ├── aiService.js          # DeepSeek API integration
│       └── storageService.js     # Local data + pet state
├── package.json
├── app.json                      # Expo configuration
└── babel.config.js
```

## Daily Goal & Streak

- Users set a daily word learning target (1-50 words)
- Goals can only be changed **once per week** to encourage consistency
- Meeting the daily goal extends the streak
- Friends can see each other's streaks

## Future Enhancements

- Cloud sync backend (Firebase/Supabase)
- Spaced repetition review system
- Leaderboards
- AR mode (see translations overlaid on objects)
- Offline mode with pre-cached translations
- Pronunciation scoring with AI feedback

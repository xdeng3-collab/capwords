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
Backed by Supabase (accounts, the friend graph, and a small progress mirror).
These need `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` to be
set — see `supabase/README.md`. With them unset the app stays fully usable and
simply hides the account and Pals screens.

- **Add friends**: Search people by handle, send and accept requests
- **Streak system**: Meet your daily word target to extend your streak
- **See how pals are doing**: Their streak, words today, total words, and pet
- **Cheer a pal**: Send a daily cheer, worth a few coins to you both

Not yet implemented:
- **View collections** — a friend's stickers, photos, and words never leave
  their device, so there is nothing for the app to show you
- **Listen to friends** — for the same reason; pronunciation is generated
  on-device by expo-speech, and no recordings are uploaded anywhere

### Subscription & Pricing
The figures below come from `PRICING` and `IAP_PRODUCTS` in `src/config.js`.

- **Free Tier**: 3 words per day
- **Pay Per Word**: $0.02/word
- **Monthly Pro**: $3.99/month (unlimited)
- **Yearly Pro**: $29.99/year (unlimited, save 37%)

## Cost Analysis

Using the DeepSeek Flash API. These are rough planning figures, not measured
billing — recognition is a reasoning call, so real token use varies:
| Component | Cost per word |
|-----------|--------------|
| AI Image Recognition (input) | $0.00007 |
| AI Translation (output) | $0.00006 |
| Infrastructure & Storage | $0.00200 |
| **Total** | **~$0.0025** |

With a selling price of $0.02/word, the margin covers:
- Server infrastructure
- CDN and image storage
- App maintenance
- Customer support

## Running the App

The easiest way is the included scripts. From a Terminal opened in the project
folder:

### Start

```bash
./start.sh
```

This builds (first time only, takes a few minutes), installs, and launches
CapWords on the iOS Simulator, and starts the Metro bundler. The app opens
automatically. On first launch you name your pixel pet, then land on the Buddy
home screen.

Equivalent npm command: `npm run go`

### Stop

```bash
./stop.sh
```

This stops the Metro bundler and any running dev server. (The Simulator app
stays open; close it yourself whenever you like.)

Equivalent npm command: `npm run stop`

### While the app is running
- **Reload after code changes**: press `Cmd+R` in the Simulator.
- **Open the dev menu**: press `Ctrl+Cmd+Z` in the Simulator.
- **Camera note**: the iOS Simulator has no real camera, so use the gallery /
  photo picker button on the Snap screen. Real camera capture needs a physical
  device.

### Notes
- The scripts automatically locate Node.js. If Node is not installed, install it
  from https://nodejs.org (or `brew install node`) and rerun `./start.sh`.
- AI photo recognition calls DeepSeek through the small proxy in
  `server/index.js`, which keeps the API key off the device. Put
  `DEEPSEEK_API_KEY=your_key` in a `.env` file at the project root, start the
  proxy with `node server/index.js`, and point the app at it by also setting
  `EXPO_PUBLIC_API_URL=http://<your-mac-ip>:3210`. The app still runs without
  this, but recognition will report that AI is not configured.
- Do **not** ship a build with `EXPO_PUBLIC_DEEPSEEK_API_KEY` set. Expo inlines
  every `EXPO_PUBLIC_*` variable into the JavaScript bundle, so that key would
  be readable by anyone who unpacks the installed app. It is a local-development
  shortcut only.

## Tech Stack

- **Frontend**: React Native + Expo (SDK 52)
- **AI**: DeepSeek Flash (`deepseek-flash`) for both photo recognition and
  text, called via the proxy in `server/index.js`
- **TTS**: expo-speech (native text-to-speech)
- **Audio**: expo-audio (recording & playback)
- **Visuals**: hand-authored pixel art (Views) + Animated API
- **Feedback**: expo-haptics
- **Storage**: AsyncStorage on-device for words, stickers, and pet state;
  Supabase for accounts, the friend graph, and shared progress
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
│       ├── accountService.js     # Sign-in and the progress mirror
│       ├── friendService.js      # Friend graph (Supabase)
│       ├── supabase.js           # Supabase client
│       └── storageService.js     # Local data + pet state
├── server/
│   └── index.js                  # API proxy - holds the DeepSeek key
├── supabase/
│   └── migrations/               # Accounts, friendships, cheers (+ RLS)
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

- Syncing stickers and words to the cloud, which is what would make a friend's
  collection and pronunciation viewable
- Spaced repetition review system
- Leaderboards
- AR mode (see translations overlaid on objects)
- Offline mode with pre-cached translations
- Pronunciation scoring with AI feedback

# CapWords 📸🗣️

A visual language learning app where users photograph objects to learn vocabulary in their target language.

## Features

### Core Learning
- **📷 Photo Recognition**: Take a photo of any object, and AI identifies it and provides the word in your target language
- **🎨 Sticker Collection**: Each learned word becomes a beautiful sticker in your collection
- **🔊 Pronunciation**: Listen to correct pronunciation with one tap
- **🎙️ Record & Practice**: Hold to record your pronunciation, release to stop
- **📊 Progress Tracking**: Daily word count, streak tracking, and goal setting

### Social
- **👥 Add Friends**: Search and add friends (like Duolingo)
- **🔥 Streak System**: Meet your daily word target to extend your streak
- **👀 View Collections**: See your friends' sticker collections
- **🎧 Listen to Friends**: Hear how your friends pronounce words

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

- **Frontend**: React Native + Expo
- **AI**: DeepSeek V4 Flash (image recognition, translation)
- **TTS**: expo-speech (native text-to-speech)
- **Audio**: expo-av (recording)
- **Storage**: AsyncStorage (local), expandable to cloud backend
- **Navigation**: React Navigation

## Supported Languages

🇺🇸 English | 🇨🇳 中文 | 🇪🇸 Español | 🇫🇷 Français | 🇩🇪 Deutsch | 🇯🇵 日本語 | 🇰🇷 한국어 | 🇧🇷 Português | 🇮🇹 Italiano | 🇷🇺 Русский | 🇸🇦 العربية | 🇮🇳 हिन्दी

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
├── src/
│   ├── config.js                 # App configuration, API keys, pricing
│   ├── navigation/
│   │   └── AppNavigator.js       # Navigation setup
│   ├── screens/
│   │   ├── CameraScreen.js       # Photo capture screen
│   │   ├── StickerResultScreen.js # Word result + pronunciation
│   │   ├── CollectionScreen.js   # Sticker collection by date
│   │   ├── FriendsScreen.js      # Friends list & search
│   │   ├── FriendProfileScreen.js # View friend's collection
│   │   ├── ProfileScreen.js      # User profile & settings
│   │   ├── SubscriptionScreen.js # Pricing & subscription
│   │   ├── LanguageSelectScreen.js # Language picker
│   │   └── GoalSettingScreen.js  # Daily goal configuration
│   └── services/
│       ├── aiService.js          # DeepSeek API integration
│       └── storageService.js     # Local data management
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

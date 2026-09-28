# Architecture

How the code in `src/` is organised, and the rules that keep it that way.
`npm run check` enforces the import rules; the rest is convention.

## The layers

Each layer may import only from the layers listed after it, never upward.

```
app          App shell: lifecycle effects, RootNavigator, TabNavigator, deep links
  └─ features     Screens, grouped by feature
       ├─ components   Shared presentational UI (no data access)
       └─ hooks        Shared React hooks
            └─ services     Business rules - the only way into data/ and api/
                 ├─ data        On-device persistence (AsyncStorage, photo files)
                 └─ api         Remote clients (Supabase, DeepSeek)
                      └─ utils        Pure helpers
theme        Design tokens          (imports nothing)
config       Product configuration  (imports nothing)
```

| Layer        | May import from                                                   |
| ------------ | ----------------------------------------------------------------- |
| `app`        | everything below                                                  |
| `features`   | `components`, `hooks`, `services`, `utils`, `theme`, `config`, other features' `index.js` |
| `components` | `components`, `utils`, `theme`, `config`                          |
| `hooks`      | `services`, `utils`, `config`                                     |
| `services`   | `services`, `data`, `api`, `modules/` (native), `utils`, `config` |
| `data`       | `utils`, `config`                                                 |
| `api`        | `utils`, `config`                                                 |
| `utils`      | `config`                                                          |
| `theme`, `config` | nothing                                                      |

The two rules that matter most:

1. **Screens never touch storage or the network directly.** A feature calls a
   service; the service decides which store or client to use. This is what
   lets the Supabase mirror, the widget, and the screens all agree on what a
   "word learned" means.
2. **Components are presentational.** They take data through props and report
   through callbacks. A component that needs to load something is a screen, or
   part of one, and belongs in a feature.

## What goes where

| You are adding...                                  | Put it in                                  |
| -------------------------------------------------- | ------------------------------------------ |
| A new screen                                       | `features/<feature>/`, export it from that feature's `index.js`, register it in `app/navigation/TabNavigator.js`, add its name to `config/routes.js` |
| A piece of UI used by one screen                   | Next to that screen in its feature folder  |
| A piece of UI used by two features                 | `components/` (`ui/`, `pixel/` or `overlays/`) and the barrel `components/index.js` |
| A rule ("goal met extends the streak", "free tier is 3 words") | A service                     |
| Something saved on the phone                       | A key in `data/storage.js` + a store in `data/` with its defaults, then a service that uses it |
| A call to a backend                                | A client in `api/`, used from a service    |
| A colour, spacing, shadow                          | `theme/`                                   |
| A price, limit, product id, catalog entry, route name | `config/`                               |
| A pure function with no app knowledge              | `utils/`                                   |

## Services

| Service                  | Owns                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `learningService`        | "A word was learned" end to end: save, charge, widget, pals mirror    |
| `collectionService`      | Stickers: save (which counts the word), list, group by day, delete   |
| `progressService`        | Words per day, the streak, and what happens when a word is learned   |
| `petService`             | Name, species, outfits, and the mood ladder (`derivePetMood` is pure) |
| `walletService`          | Coins, daily gift, practice bonus                                    |
| `profileService`         | Local profile, onboarding state, goal-change cooldown                |
| `subscriptionService`    | Daily allowance, per-word balance, promo codes                       |
| `purchaseService`        | StoreKit subscriptions; word/coin packs (dev builds only until they have App Store products) |
| `accountService`         | Supabase auth, the profile row, the progress mirror pals can read    |
| `friendService`          | Pals: search, requests, cheers (all via RPCs)                        |
| `aiService`              | Recognition and pronunciation prompts, parsing the answers           |
| `widgetService`          | The home screen widget snapshot                                      |
| `deviceDataService`      | Legacy cleanup, erasing everything on the phone                      |

Services that talk to a backend return `{ ok, error, ... }` rather than
throwing, because being offline or signed out is normal. Local services throw
only on programmer error.

## Conventions

- **Navigate with constants.** `navigation.navigate(ROUTES.WARDROBE)`, never a
  string. A screen in another tab's stack is reached through the tab:
  `navigate(TABS.PROFILE, { screen: ROUTES.SUBSCRIPTION })`.
- **Import shared things through their barrel**: `../../components`,
  `../../config`, `../../theme`, and another feature only through its
  `index.js`. Inside `components/` itself, import the file directly to avoid
  cycles through the barrel.
- **Day keys are UTC.** Use `todayKey()` / `yesterdayKey()` from
  `utils/date.js`. Supabase decides "today" in UTC too; changing one side
  alone makes pals' numbers wrong for part of every day.
- **Storage keys are forever.** Never rename one in `data/storage.js`; add a
  new key and migrate on read. Stores fill in missing fields on read (see
  `petStore`) so old installs keep working.
- **Photos are stored relative** (`stickers/<id>.jpg`) and resolved on read,
  because the app container path changes on every reinstall.
- **Haptics go through `utils/haptics.js`** (`tapFeedback()`,
  `successFeedback()`, ...), which swallow the error a simulator throws.
- **Mood logic lives in three places** that must agree: `derivePetMood` in
  `services/petService.js`, `moodForProgress` in `services/widgetService.js`,
  and `WidgetState` in `targets/widget/index.swift`.

## Tests

Service rules are unit tested with Jest (`jest-expo` preset) in
`src/services/__tests__/`. AsyncStorage is an in-memory mock, the app's own
native modules resolve to null (as they do in Expo Go), and the suite runs in
Asia/Shanghai so UTC and local days differ - see `jest.config.js` and
`test/`. When you change a rule - the streak, the free limit, a price, the mood
ladder - change or add the test that pins it.

## Before pushing

```bash
npm run check    # imports resolve, named exports exist, layers respected, no cycles
npm test         # service rules
npx expo export --platform ios --output-dir /tmp/capwords-export   # the bundle builds
```

`npm run check` catches the mistakes Metro does not: a misspelt named import
bundles fine and is `undefined` at runtime.

# CapWords

Expo (SDK 52) / React Native app. Read docs/ARCHITECTURE.md before adding or
moving code: `src/` is layered and imports only point down the stack.

- Screens live in `src/features/<feature>/` and reach storage or the network
  only through `src/services/`. Shared UI in `src/components/` takes props and
  never loads data.
- Navigate with `ROUTES` / `TABS` from `src/config/routes.js`, never strings.
- Day keys are UTC (`src/utils/date.js`) to match Supabase. Storage keys in
  `src/data/storage.js` are never renamed.
- Run `npm run check` after any change that adds, moves or renames an import.
  It catches misspelt named imports, which Metro bundles as `undefined`.
- Native builds (StoreKit, Supabase auth, the widget) cannot run in this
  environment; `npx expo export --platform ios` is the bundling check.

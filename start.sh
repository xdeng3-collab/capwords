#!/usr/bin/env bash
#
# CapWords - start script
# Builds (if needed), installs and launches the app on the iOS simulator,
# and starts the Metro bundler. Just run: ./start.sh
#
set -e

# --- Locate Node -------------------------------------------------------------
# The project was set up with a managed Node runtime. Prefer it, then fall back
# to whatever Node is on the PATH (Homebrew, nvm, etc.).
MANAGED_NODE="$HOME/.workbuddy/binaries/node/versions/20.18.0/bin"
if [ -d "$MANAGED_NODE" ]; then
  export PATH="$MANAGED_NODE:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js was not found."
  echo "Install it from https://nodejs.org (or 'brew install node') and try again."
  exit 1
fi

# --- Move to the project root (directory of this script) ---------------------
cd "$(dirname "$0")"

echo "==============================================="
echo "  CapWords - starting on the iOS simulator"
echo "  Node: $(node -v)"
echo "==============================================="
echo ""
echo "First launch builds the native app and can take a few minutes."
echo "When it's done, the app opens automatically in the Simulator."
echo "Press Ctrl+C in this window to stop, or run ./stop.sh later."
echo ""

# Build + install + launch on the simulator, and start Metro.
npx expo run:ios

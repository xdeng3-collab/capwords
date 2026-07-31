#!/usr/bin/env bash
#
# CapWords - stop script
# Stops the Metro bundler and any running Expo dev server. Just run: ./stop.sh
#
echo "Stopping CapWords dev server..."

# Kill the Metro bundler listening on the default port (8081).
if lsof -ti tcp:8081 >/dev/null 2>&1; then
  lsof -ti tcp:8081 | xargs kill -9 2>/dev/null
  echo "  - Metro bundler (port 8081) stopped."
else
  echo "  - Metro bundler was not running."
fi

# Kill any lingering Expo / Metro processes started by 'expo start' or 'run:ios'.
pkill -f "expo start"        2>/dev/null && echo "  - 'expo start' stopped."
pkill -f "expo run:ios"      2>/dev/null && echo "  - 'expo run:ios' stopped."
pkill -f "react-native/cli"  2>/dev/null
pkill -f "metro"             2>/dev/null

echo "Done. (The iOS Simulator app stays open - close it yourself if you like.)"

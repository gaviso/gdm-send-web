#!/usr/bin/env bash
set -euo pipefail

# Make node/npm available in non-interactive shells (CI's `ssh host "cmd"`).
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "▸ git pull origin main"
git pull --ff-only origin main

echo "▸ npm run kc:build"
npm run kc:build

echo "▸ Copying static assets for standalone"
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true

echo "▸ Restarting supervised Node process"
pkill -f "next-server" 2>/dev/null || pkill -f "server.js" 2>/dev/null || true

echo "✓ Deployed."

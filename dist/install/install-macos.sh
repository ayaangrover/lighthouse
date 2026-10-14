#!/bin/bash
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$(cd "$HERE/../backend" && pwd)"
NODE="$(command -v node)"
LABEL="com.lighthouse.notifier"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -z "$NODE" ]; then
    echo "Node isn't installed. Get it from https://nodejs.org and run this again."
    exit 1
fi

if [ ! -f "$BACKEND/data/config.json" ]; then
    echo "Run 'npm run setup' in the backend folder first."
    exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$BACKEND/data/logs"

sed -e "s|__NODE__|$NODE|g" -e "s|__BACKEND__|$BACKEND|g" \
    "$HERE/$LABEL.plist.template" > "$PLIST"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "Lighthouse is installed and running in the background."
echo "Logs: $BACKEND/data/logs/lighthouse.log"
echo "To stop it:      launchctl bootout gui/$(id -u)/$LABEL"
echo "To uninstall:    launchctl bootout gui/$(id -u)/$LABEL && rm $PLIST"

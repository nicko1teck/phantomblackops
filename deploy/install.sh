#!/usr/bin/env bash
# Runs ON Server A as ec2-user, started by the GitHub workflow through SSM Run Command.
# Usage: install.sh <bucket> <key-of-the-release-tarball>
#
# Same steps as the old SSH deploy: sync the code into the app folder (leaving .env
# and node_modules alone), install production dependencies, reload pm2, check the app.
set -euo pipefail

BUCKET="$1"
RELEASE_KEY="$2"

APP_NAME="phantomblackops"
APP_DIR="/home/ec2-user/phantomblackops"
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "Downloading s3://$BUCKET/$RELEASE_KEY"
aws s3 cp "s3://$BUCKET/$RELEASE_KEY" "$WORK_DIR/release.tar.gz" --only-show-errors
mkdir -p "$WORK_DIR/release" "$APP_DIR"
tar -xzf "$WORK_DIR/release.tar.gz" -C "$WORK_DIR/release"

# Mirror the release into the app folder. --delete removes files that were deleted
# from the repo; the excluded paths are never touched on the server.
rsync -a --delete \
  --exclude '.git' --exclude '.github' --exclude 'node_modules' --exclude '.env' \
  "$WORK_DIR/release/" "$APP_DIR/"
echo "Code synced to $APP_DIR"

cd "$APP_DIR"
npm ci --omit=dev
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start server.js --name "$APP_NAME"
fi
pm2 save

# Health check: the app's port comes from .env (default 3000).
PORT=$(grep -E '^PORT=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '\r' || true)
URL="http://127.0.0.1:${PORT:-3000}/"
for i in $(seq 1 12); do
  sleep 3
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)
  if [[ "$CODE" =~ ^[23] ]]; then
    echo "Health check passed: HTTP $CODE from $URL"
    exit 0
  fi
  echo "Waiting for the app... (HTTP $CODE)"
done
echo "Health check FAILED: $URL never answered. Check 'pm2 logs $APP_NAME'."
exit 1

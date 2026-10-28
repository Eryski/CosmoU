#!/bin/sh
# CosmoU launcher for Linux.
# Starts the real program and turns Chromium's sandbox off only where it can't work: an AppImage or a
# tar.gz can't ship a setuid chrome-sandbox, and some systems (Ubuntu 24.04+) block user namespaces.
HERE="$(dirname "$(readlink -f "$0")")"
NOSB=""
if [ "$(id -u)" = "0" ]; then
  NOSB="--no-sandbox" # Chromium refuses to run as root with the sandbox on
elif [ ! -u "$HERE/chrome-sandbox" ] || [ "$(stat -c %u "$HERE/chrome-sandbox" 2>/dev/null)" != "0" ]; then
  if ! unshare --user --map-root-user true 2>/dev/null; then NOSB="--no-sandbox"; fi
fi
exec "$HERE/cosmou-bin" $NOSB "$@"

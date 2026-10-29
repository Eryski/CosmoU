#!/bin/bash
# Copies the CosmoU page into ios/build/www (what the Android build does too) for the iOS app.
# The theme songs become .m4a (AAC) when ffmpeg is there, so every iPhone and iPad can play them
# (iOS plays .ogg only from iOS 18.4 on).
set -e
cd "$(dirname "$0")/.."
W=ios/build/www
rm -rf ios/build
mkdir -p "$W/assets/music/themes" "$W/build"
cp index.html "$W/"
cp -R css js "$W/"
cp build/icon.png "$W/build/"
for f in assets/music/*.wav assets/music/*.mp3 assets/music/*.ogg; do [ -f "$f" ] && cp "$f" "$W/assets/music/"; done
for f in assets/music/themes/*.ogg; do
  n=$(basename "$f" .ogg)
  if command -v ffmpeg >/dev/null; then
    ffmpeg -loglevel error -y -i "$f" -vn -c:a aac -b:a 128k -movflags +faststart "$W/assets/music/themes/$n.m4a"
  else
    cp "$f" "$W/assets/music/themes/"
  fi
done
echo "page copied: $(find "$W" -type f | wc -l | tr -d ' ') files, $(du -sh "$W" | cut -f1)"

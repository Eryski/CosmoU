#!/bin/bash
# CosmoU for Wii U in Cemu: starts CosmoU.wuhb with one made-up installed game, lets its test mode walk through the
# views and themes, takes screenshots and writes results.json for report.js.
# usage: wiiu-cemu.sh <CosmoU.wuhb> <out folder>      (needs gh, a GitHub token in GH_TOKEN)
set -u
WUHB="$1"
OUT="$2"
mkdir -p "$OUT"
export HOME="$RUNNER_TEMP/cemu-home"
mkdir -p "$HOME"
CFG="$HOME/.config/Cemu"
DATA="$HOME/.local/share/Cemu"
mkdir -p "$CFG" "$DATA/sdcard/wiiu"
LOG="$OUT/test.log"
note() { echo "[$(date +%T)] $*" | tee -a "$LOG"; }

sudo apt-get update -qq >/dev/null
sudo apt-get install -y -qq xvfb imagemagick libfuse2 libopengl0 libgl1 libegl1 libvulkan1 mesa-vulkan-drivers mesa-utils >/dev/null

# Cemu (the newest Linux AppImage)
url=$(gh api repos/cemu-project/Cemu/releases/latest --jq '.assets[] | select(.name | test("x86_64\\.AppImage$")) | .browser_download_url' | head -1)
note "Cemu: $url"
curl -sSL -o "$RUNNER_TEMP/Cemu.AppImage" "$url"
chmod +x "$RUNNER_TEMP/Cemu.AppImage"

# Cemu's settings (no first-start window, OpenGL works with the software driver here)
cat > "$CFG/settings.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<content>
	<logflag>0</logflag>
	<check_update>false</check_update>
	<mlc_path></mlc_path>
	<GamePaths />
	<Graphic>
		<api>0</api>
		<VSync>0</VSync>
		<AsyncCompile>false</AsyncCompile>
	</Graphic>
	<Audio>
		<TVVolume>0</TVVolume>
	</Audio>
</content>
EOF

# one installed game in Cemu's system memory, with its own icon
T="$DATA/mlc01/usr/title/00050000/10c05000"
mkdir -p "$T/code" "$T/content" "$T/meta"
cat > "$T/code/app.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<app type="complex" access="777">
  <version type="unsignedInt" length="4">16</version>
  <os_version type="hexBinary" length="8">000500101000400A</os_version>
  <title_id type="hexBinary" length="8">0005000010C05000</title_id>
  <title_version type="hexBinary" length="2">0000</title_version>
  <sdk_version type="unsignedInt" length="4">21204</sdk_version>
  <app_type type="hexBinary" length="4">80000000</app_type>
  <group_id type="hexBinary" length="4">00010C05</group_id>
</app>
EOF
cat > "$T/code/cos.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<app type="complex" access="777">
  <version type="unsignedInt" length="4">1</version>
  <argstr type="string" length="4096">sky.rpx</argstr>
</app>
EOF
cat > "$T/meta/meta.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<menu type="complex" access="777">
  <title_id type="hexBinary" length="8">0005000010C05000</title_id>
  <longname_en type="string" length="512">Sky Harbor
Racers</longname_en>
  <shortname_en type="string" length="256">Sky Harbor Racers</shortname_en>
</menu>
EOF
python3 - "$T/meta/iconTex.tga" <<'EOF'
import struct, sys, math
w = h = 128
px = bytearray()
for y in range(h - 1, -1, -1):  # TGA rows go bottom-up
    for x in range(w):
        t = y / h
        r, g, b = int(255 * (1 - t) + 250 * t), int(120 * (1 - t) + 200 * t), int(60 * (1 - t) + 40 * t)
        if (x - 80) ** 2 + (y - 46) ** 2 < 26 ** 2:
            r, g, b = 255, 236, 120
        if y > 92:
            r, g, b = 255, 255, 255
        px += bytes((b, g, r, 255))
hdr = struct.pack('<BBBHHBHHHHBB', 0, 0, 2, 0, 0, 0, 0, 0, w, h, 32, 8)
open(sys.argv[1], 'wb').write(hdr + px)
EOF
echo "test" > "$DATA/sdcard/cosmou-test.txt"

# start it and take a picture every 8 seconds
export DISPLAY=:99
Xvfb :99 -screen 0 1280x800x24 >/dev/null 2>&1 &
sleep 2
note "start"
"$RUNNER_TEMP/Cemu.AppImage" --appimage-extract-and-run -g "$WUHB" > "$OUT/cemu-stdout.txt" 2>&1 &
CEMU=$!
for i in $(seq 1 11); do
  sleep 8
  import -window root -resize 960x "$OUT/shot-$(printf %02d $i).png" 2>/dev/null || true
  convert "$OUT/shot-$(printf %02d $i).png" -quality 45 "$OUT/$(printf %02d $i)-cemu.jpg" 2>/dev/null || true
  rm -f "$OUT/shot-$(printf %02d $i).png"
done
kill $CEMU 2>/dev/null
sleep 2
pkill -f Cemu 2>/dev/null
cp "$DATA/sdcard/cosmou-test.log" "$OUT/cosmou-test.log" 2>/dev/null
cp "$DATA/log.txt" "$OUT/cemu-log.txt" 2>/dev/null || cp "$CFG/log.txt" "$OUT/cemu-log.txt" 2>/dev/null
note "done"

# results for report.js
python3 - "$OUT" "$WUHB" <<'EOF'
import json, os, sys
out, wuhb = sys.argv[1], sys.argv[2]
def rd(p):
    try: return open(os.path.join(out, p), encoding='utf-8', errors='replace').read()
    except Exception: return ''
log, cemu = rd('cosmou-test.log'), rd('cemu-log.txt')
res = []
ok = lambda n, p, d='': res.append({'name': n, 'pass': bool(p), 'detail': d[:900]})
ok('CosmoU.wuhb built', os.path.getsize(wuhb) > 100000, f'{os.path.getsize(wuhb)} bytes')
ok('Cemu starts CosmoU for Wii U', 'games ' in log, log[:400] or 'no test log on the SD card')
ok('it finds the installed game (name from meta.xml, icon from iconTex.tga)', 'Sky Harbor Racers icon=1' in log, log[:400])
ok('test mode walks through views and themes', 'step 5' in log, '\n'.join(l for l in log.splitlines() if l.startswith('step')))
ok('Cemu log', True, '\n'.join(cemu.splitlines()[-30:]))
json.dump({'platform': 'wiiu', 'results': res}, open(os.path.join(out, 'results.json'), 'w'), indent=1)
print(json.dumps(res, indent=1)[:3000])
EOF

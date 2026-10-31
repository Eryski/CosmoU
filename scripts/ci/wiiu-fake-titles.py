# Made-up installed Wii U games for the Cemu test of CosmoU for Wii U: code/app.xml, code/cos.xml, meta/meta.xml and
# an original iconTex.tga each (no real game files). usage: python3 wiiu-fake-titles.py <Cemu mlc01 folder>
import os
import struct
import sys

MLC = sys.argv[1]
GAMES = [
    ('10C05000', 'Sky Harbor\nRacers', (255, 120, 60)),
    ('10C06000', 'Pebble Quest', (70, 150, 240)),
    ('10C07000', 'Lantern Keep', (120, 80, 200)),
]


def write(p, t, mode='w'):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, mode) as f:
        f.write(t)


for low, name, (r0, g0, b0) in GAMES:
    base = os.path.join(MLC, 'usr', 'title', '00050000', low.lower())
    os.makedirs(os.path.join(base, 'content'), exist_ok=True)
    write(os.path.join(base, 'code', 'app.xml'), f'''<?xml version="1.0" encoding="utf-8"?>
<app type="complex" access="777">
  <version type="unsignedInt" length="4">16</version>
  <os_version type="hexBinary" length="8">000500101000400A</os_version>
  <title_id type="hexBinary" length="8">00050000{low}</title_id>
  <title_version type="hexBinary" length="2">0000</title_version>
  <sdk_version type="unsignedInt" length="4">21204</sdk_version>
  <app_type type="hexBinary" length="4">80000000</app_type>
  <group_id type="hexBinary" length="4">0000{low[:4]}</group_id>
</app>
''')
    write(os.path.join(base, 'code', 'cos.xml'), '''<?xml version="1.0" encoding="utf-8"?>
<app type="complex" access="777">
  <version type="unsignedInt" length="4">1</version>
  <argstr type="string" length="4096">game.rpx</argstr>
</app>
''')
    write(os.path.join(base, 'meta', 'meta.xml'), f'''<?xml version="1.0" encoding="utf-8"?>
<menu type="complex" access="777">
  <title_id type="hexBinary" length="8">00050000{low}</title_id>
  <longname_en type="string" length="512">{name}</longname_en>
  <shortname_en type="string" length="256">{name.replace(chr(10), ' ')}</shortname_en>
</menu>
''')
    w = h = 128
    px = bytearray()
    for y in range(h - 1, -1, -1):  # TGA rows go bottom-up
        for x in range(w):
            t = y / h
            r, g, b = int(r0 * (1 - t) + 150 * t), int(g0 * (1 - t) + 120 * t), int(b0 * (1 - t) + 72 * t)
            if (x - 80) ** 2 + (y - 46) ** 2 < 26 ** 2:
                r, g, b = 255, 236, 120
            if y > 92:
                r, g, b = 255, 255, 255
            px += bytes((b, g, r, 255))
    write(os.path.join(base, 'meta', 'iconTex.tga'), struct.pack('<BBBHHBHHHHBB', 0, 0, 2, 0, 0, 0, 0, 0, w, h, 32, 8) + bytes(px), 'wb')
print('made', len(GAMES), 'games')

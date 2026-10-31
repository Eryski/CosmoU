# Writes the CosmoU for Wii U shop list (wiiu/shop/shop.json) and the theme packs (wiiu/shop/themes/<id>/theme.cfg).
# The themes use the colours of the same themes in CosmoU for PC and phones, their music is assets/music/themes/<id>.ogg.
# usage: python3 wiiu/shop/make-shop.py      (from the repository folder)
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))

# id: name, description, colours, background decoration (none, grid, lines, scan, brushed, dots)
THEMES = [
    ('classic-wii', 'Classic Wii', 'Soft and simple, inspired by the original Wii menu',
     dict(bgTop='f8fafb', bgBottom='e2e8ec', ink='3c464e', mute='7a868f', accent='22aee6', onAccent='ffffff', card='ffffffe6', line='dbe1e5'), 'lines'),
    ('plaza', 'Plaza', 'Warm pastel colors, playful',
     dict(bgTop='fff6ee', bgBottom='ffe4d0', blob1='ffb08a78', blob2='ffd36e6e', blob3='ff9fb064', ink='3d2b2b', mute='8a706a', accent='ff7f57', onAccent='3a1408', card='fffcf8f7', line='96503224'), 'dots'),
    ('switch2', 'Switch 2', 'Rounder and softer, a modern hybrid look',
     dict(bgTop='f7f8fa', bgBottom='e6e9ee', ink='26282c', mute='6c7078', accent='1ea6ec', onAccent='ffffff', card='ffffff', line='dfe2e6'), 'none'),
    ('ds', 'DS', 'Grid paper, grey boxes and blue corners',
     dict(bgTop='f7f7f7', bgBottom='e9e9e9', ink='2e2e2e', mute='6a6a6a', accent='3a66e8', onAccent='ffffff', card='ffffff', line='bdbdbd'), 'grid'),
    ('dsi', 'DSi', 'White lines, rounded panels, teal accents',
     dict(bgTop='f8f8f8', bgBottom='e8eceb', ink='333333', mute='777777', accent='49b3a0', onAccent='ffffff', card='ffffff', line='d6d6d6'), 'lines'),
    ('3ds', '3DS', 'Soft grid, framed icons, green corners',
     dict(bgTop='f7f9fb', bgBottom='e4ebf0', ink='2f3a44', mute='6f7c88', accent='2ea6e0', onAccent='ffffff', card='ffffff', line='d5dde5'), 'grid'),
    ('gamecube', 'GameCube', 'Dark indigo glass with a violet glow',
     dict(bgTop='1d1442', bgBottom='0a0718', blob1='6b4fd86e', blob2='3a2a905a', blob3='9a6bff3c', ink='f1edff', mute='b4abd8', accent='6b4fd8', onAccent='ffffff', card='261c4eeb', line='9682ff4d'), 'none'),
    ('gameboy', 'Game Boy', 'Everything in four shades of green',
     dict(bgTop='9bbc0f', bgBottom='8bac0f', ink='0f380f', mute='306230', accent='0f380f', onAccent='9bbc0f', card='b4cc4a', line='306230'), 'none'),
    ('virtualboy', 'Virtual Boy', 'Red on black, nothing else',
     dict(bgTop='080000', bgBottom='000000', ink='ff2a2a', mute='b01818', accent='d40000', onAccent='000000', card='120000', line='5a0000'), 'scan'),
    ('snes', 'SNES', 'Light grey plastic with lavender and purple',
     dict(bgTop='ededf2', bgBottom='d9d8e5', blob1='7a6fe028', ink='2c2a38', mute='6a6680', accent='5b4fc4', onAccent='ffffff', card='f8f8fb', line='c3c1d0'), 'none'),
    ('nes', 'NES', 'Grey and black, boxy, with red accents',
     dict(bgTop='e0e0e0', bgBottom='cdcdcd', ink='161616', mute='4f4f4f', accent='c8102e', onAccent='ffffff', card='f0f0f0', line='1a1a1a'), 'none'),
    ('gameandwatch', 'Game & Watch', 'Silver LCD, black segments, red buttons',
     dict(bgTop='c9cdb9', bgBottom='b4b9a1', ink='1b1c18', mute='5d6154', accent='a8211c', onAccent='ffffff', card='d5d9c6', line='5d6154'), 'none'),
    ('gbpocket', 'Game Boy Pocket', 'Slim and silver with a crisp grey-green screen',
     dict(bgTop='c4cfa1', bgBottom='aeb987', ink='1f1f1f', mute='4d533c', accent='1f1f1f', onAccent='c4cfa1', card='d3dcb4', line='4d533c'), 'none'),
    ('gbcolor', 'Game Boy Color', 'Atomic purple plastic and bright colors',
     dict(bgTop='f1eaff', bgBottom='ddceff', blob1='8a52ff46', blob2='ffd84d46', blob3='4dd4ff3c', ink='2a1760', mute='6d5aa6', accent='6a35d1', onAccent='ffffff', card='f6f1ffee', line='b9a4ee'), 'none'),
    ('gba', 'Game Boy Advance', 'Indigo plastic, a wide screen, deep colors',
     dict(bgTop='e9ecfa', bgBottom='d1d6f2', blob1='4a5ce032', ink='151a4a', mute='555c9a', accent='2c3ab0', onAccent='ffffff', card='eff1fc', line='b3baea'), 'none'),
    ('gbasp', 'Game Boy Advance SP', 'Pearl blue and silver with a front light',
     dict(bgTop='eef3fa', bgBottom='d7e1ef', blob1='ffffffa0', blob2='4a9be832', ink='1b2a40', mute='5b6e88', accent='2a67b8', onAccent='ffffff', card='f8fbff', line='b7c8de'), 'none'),
    ('gbmicro', 'Game Boy Micro', 'Brushed metal, tiny and sleek',
     dict(bgTop='e4e6ea', bgBottom='c7cbd2', ink='15181d', mute='566070', accent='b92a21', onAccent='ffffff', card='eceef1', line='aab0b9'), 'brushed'),
]

FONTS = [
    ('rounded', 'Rounded', 'M PLUS Rounded 1c: round and friendly, like a console menu', 'The M+ Fonts Project'),
    ('soft', 'Soft', 'Varela Round: soft and simple', 'Varela Round Project Authors'),
    ('pixel', 'Pixel', 'Silkscreen: a small pixel font, retro and readable', 'Jason Kottke'),
    ('arcade', 'Arcade', 'Press Start 2P: big 8-bit letters like old arcade games', 'CodeMan38'),
    ('condensed', 'Condensed', 'Barlow Condensed: narrow and clean, long names fit', 'Jeremy Tribby'),
]

# recommended emulators (with a note what they play), the Nintendo ones, and other emulators
FEATURED = [
    ('retroarch', 'NES · SNES · Game Boy · Game Boy Color · GBA · Virtual Boy · Game & Watch and more, all in one app'),
    ('NooDS', 'Nintendo DS'),
]
NINTENDO = ['retroarch', 'NooDS', 'gbiine', 'gacubeboy', 'PokeMiniU', 'Pokemini']
EMULATORS = ['CHIP8', 'Fake-08', 'yapesdl']
NOTES = {
    'gbiine': 'Game Boy · older app for the Homebrew Launcher',
    'gacubeboy': 'Game Boy · older app for the Homebrew Launcher',
    'PokeMiniU': 'Pokémon mini · older app for the Homebrew Launcher',
    'Pokemini': 'Pokémon mini · older app for the Homebrew Launcher',
}


def size_kb(*paths):
    return max(1, round(sum(os.path.getsize(p) for p in paths if os.path.exists(p)) / 1000))


def main():
    themes = []
    for tid, name, desc, c, deco in THEMES:
        d = os.path.join(HERE, 'themes', tid)
        os.makedirs(d, exist_ok=True)
        lines = [f'name={name}', 'music=music.ogg', f'deco={deco}'] + [f'{k}=#{v}' for k, v in c.items()]
        with open(os.path.join(d, 'theme.cfg'), 'w') as f:
            f.write('\n'.join(lines) + '\n')
        music = os.path.join(REPO, 'assets', 'music', 'themes', tid + '.ogg')
        assert os.path.exists(music), music
        themes.append({
            'id': tid, 'title': name, 'desc': desc, 'version': '1',
            'colors': ['#' + c['bgTop'], '#' + c['accent'], '#' + c['ink'], '#' + c['card'][:6]],
            'size': size_kb(os.path.join(d, 'theme.cfg'), music),
            'files': [
                {'url': f'wiiu/shop/themes/{tid}/theme.cfg', 'path': f'themes/{tid}/theme.cfg'},
                {'url': f'assets/music/themes/{tid}.ogg', 'path': f'themes/{tid}/music.ogg'},
            ],
        })
    fonts = []
    for fid, name, desc, author in FONTS:
        d = os.path.join(HERE, 'fonts', fid)
        files = [{'url': f'wiiu/shop/fonts/{fid}/{n}', 'path': f'fonts/{fid}/{n}'}
                 for n in ('regular.ttf', 'bold.ttf', 'OFL.txt') if os.path.exists(os.path.join(d, n))]
        fonts.append({'id': fid, 'title': name, 'desc': desc, 'author': author, 'version': '1', 'license': 'OFL-1.1',
                      'size': size_kb(*[os.path.join(d, n) for n in os.listdir(d)]), 'files': files})
    shop = {
        'about': 'The CosmoU for Wii U shop. Emulators and apps come from the Homebrew App Store catalog by ForTheUsers '
                 '(hb-app.store); themes and fonts from CosmoU. Only homebrew: no games, ROMs, BIOS files or keys.',
        'featured': [{'id': i, 'note': n} for i, n in FEATURED],
        'nintendo': NINTENDO,
        'emulators': EMULATORS,
        'notes': NOTES,
        'themes': themes,
        'fonts': fonts,
    }
    with open(os.path.join(HERE, 'shop.json'), 'w') as f:
        json.dump(shop, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print(len(themes), 'themes,', len(fonts), 'fonts')


main()

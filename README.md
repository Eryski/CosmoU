# CosmoU

A free Windows launcher for the [Cemu](https://cemu.info) Wii U emulator with a Wii U-inspired home menu.

- Covers, Grid and Wii U Look views – the Wii U Look has two layouts: the Plaza with your own buddies (Buddy maker) or a Home Menu tile grid like the console
- 15 themes in Settings → Appearance: Liquid Glass, Wii U, Classic Wii and Plaza, plus looks inspired by Switch, Switch 2, DS, DSi, 3DS, N64, GameCube, Game Boy (four shades of green), Virtual Boy (red on black), SNES and NES. Every theme works with every view and in light and dark
- Real 3D Wii U cases (front, spine and back) with the game disc, in the details and when you point at a cover
- Graphic pack manager per game: turn resolution, FPS++, mods, cheats and fixes on or off and pick presets, download the community packs in one click
- Auto-optimize: picks resolution, Vulkan, async shaders and fitting graphic packs for your graphics card
- Add other apps (emulators, PC games) to your library
- Controller navigation (D-pad / stick, A to play, B to go back)
- Automatic Cemu download and setup, automatic covers
- Per-game quality and global graphics, audio and overlay settings
- Controller type, API and profiles
- Built-in feedback form that fills in your Cemu and Windows version
- First-time setup: Cemu, games folder and menu music in four steps
- Export / import your settings as cosmou-settings.json
- Small notifications (for example “14 games added”)
- Recently played is saved on disk, so it survives restarts and updates
- Light, dark or follow Windows, smooth view transitions and optional UI sounds
- Update check: shows a hint when a new version is on GitHub
- Optional background music: an original tune for each of the 15 themes (copied to the music folder on install and update), or your own file

## Install
Download the latest `CosmoU-Setup-x.y.z.exe` (installer) or `CosmoU-Portable-x.y.z.exe` from **Releases**, run it, and start CosmoU. It downloads Cemu for you on first launch, then choose your games folder in Settings.

Windows may show a SmartScreen warning because the app is not code-signed yet: click *More info → Run anyway*.

## Build from source
```
npm install
npm start      # run
npm run dist   # build installer + portable .exe into dist/
npm run preview  # single-file browser preview with demo games
```

## Making a release
Set the version in `package.json` and push. Then on GitHub open **Releases → Draft a new release**, create a matching tag (for example `v0.8.1`) and press **Publish release**. GitHub Actions builds both .exe files and attaches them to the release.

## Project layout
```
main.js        Electron main process: Cemu download, game scan, launching, settings.xml, graphic packs
preload.js     Bridge between the window and main.js
index.html     Window markup
css/cosmou.css All styles (themes, Wii U Look, dialogs)
js/            UI code, one file per area (core, wiiu-look, covers, settings, details, buddies, …)
```

## Feedback & community
Use **Settings → Send feedback** in the app, join the [CosmoU Discord](https://discord.gg/BZry7jGjr7), or open an issue here.

## Notes
CosmoU is an independent project. It does not include any games, firmware, keys or Nintendo files, and it is not affiliated with Nintendo or the Cemu team. Wii U and Nintendo are trademarks of Nintendo. Cemu is licensed under MPL 2.0.

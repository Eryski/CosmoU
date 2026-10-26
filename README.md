# CosmoU

A free Windows launcher for the [Cemu](https://cemu.info) Wii U emulator with a Wii U-inspired home menu.

- Covers, Grid and Wii U Look views, with your own buddies walking around the plaza (Buddy maker)
- Two styles: Liquid Glass or Classic Wii U (opaque and glossy like the original menu)
- 3D Wii U cases in the game details
- Graphic pack manager per game: turn resolution, FPS++, mods, cheats and fixes on or off and pick presets, download the community packs in one click
- Auto-optimize: picks resolution, Vulkan, async shaders and fitting graphic packs for your graphics card
- Add other apps (emulators, PC games) to your library
- Controller navigation (D-pad / stick, A to play, B to go back)
- Automatic Cemu download and setup, automatic covers
- Per-game quality and global graphics, audio and overlay settings
- Controller type, API and profiles
- Built-in feedback form that fills in your Cemu and Windows version
- Optional background music

## Install
Download the latest installer or portable version from **Releases**, run it, and start CosmoU. It downloads Cemu for you on first launch, then choose your games folder in Settings.

Windows may show a SmartScreen warning because the app is not code-signed yet: click *More info → Run anyway*.

## Build from source
```
npm install
npm start      # run
npm run dist   # build installer + portable .exe into dist/
npm run preview  # single-file browser preview with demo games
```

## Project layout
```
main.js        Electron main process: Cemu download, game scan, launching, settings.xml, graphic packs
preload.js     Bridge between the window and main.js
index.html     Window markup
css/cosmou.css All styles (Liquid Glass, Classic Wii U, Wii U Look, dialogs)
js/            UI code, one file per area (core, wiiu-look, covers, settings, details, buddies, …)
```

## Feedback
Use **Settings → Send feedback** in the app, or open an issue here.

## Notes
CosmoU is an independent project. It does not include any games, firmware, keys or Nintendo files, and it is not affiliated with Nintendo or the Cemu team. Wii U and Nintendo are trademarks of Nintendo. Cemu is licensed under MPL 2.0.

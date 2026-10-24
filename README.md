# CosmoU

A free Windows launcher for the [Cemu](https://cemu.info) Wii U emulator, with a Liquid Glass look and a Wii U-inspired home view.

- Covers, Grid and Wii U Look views
- Automatic Cemu download and setup
- Automatic covers
- Per-game quality (resolution) and global graphics, audio and overlay settings
- Controller type, API and profiles
- Optional background music

## Install
Download the latest installer or portable version from **Releases**, run it, and start CosmoU. It downloads Cemu for you on first launch, then choose your games folder in Settings.

Windows may show a SmartScreen warning because the app is not code-signed yet: click *More info → Run anyway*.

## Build from source
```
npm install
npm start      # run
npm run dist   # build installer + portable .exe into dist/
```

## Notes
CosmoU is an independent project. It does not include any games, firmware, keys or Nintendo files, and it is not affiliated with Nintendo or the Cemu team. Wii U and Nintendo are trademarks of Nintendo. Cemu is licensed under MPL 2.0.

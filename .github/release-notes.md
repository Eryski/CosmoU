## 💙 Thank you, Eduard!

Everything in CosmoU 0.13.1 comes from ideas and bug reports by **Eduard** in the CosmoU Discord. Thank you for testing so much and for all the great ideas – this update is yours! 🎉

## ✨ What's new

### 🏝️ Your own picture and music for each console
**Settings → Appearance** has two new rows: **Background picture for …** and **Music for …**.
- Switch to a console (Wii U, Switch, 3DS …), choose any picture and any music file from your computer or phone – done.
- Every console keeps its own: your Zelda picture on the Wii U, something else on the Switch, another one on the 3DS.
- The picture lies behind the glass with a soft veil, so everything stays readable – it looks best with **Liquid Glass**.
- **Remove** brings back the theme's look and music.

### 🎨 Theme files with a picture
A `.cosmoutheme` can now bring a background picture, built on Liquid Glass:
```json
{ "name": "Great Sea", "base": "liquid-glass", "image": "sea.jpg", "music": "song.ogg" }
```
**Share** saves the theme with its picture and music. The guide: [docs/THEMES.md](https://github.com/Eryski/CosmoU/blob/main/docs/THEMES.md).

### ⏭️ Faster pages on the 3DS and Wii home screens
- At the right edge of a row the **next page** comes (same row, from the left) – at the left edge the page before, like on the console. No more going through every game of a page.
- The **right stick** turns the pages straight away (**Page Up / Page Down** on a keyboard). Without pages (Switch, shelves) it jumps six games.

### 🎮 CosmoU for Wii U: a shop
The Wii U app (`CosmoU-WiiU-0.13.0.wuhb`, in the [0.13.0 release](https://github.com/Eryski/CosmoU/releases/tag/v0.13.0)) got a **Shop**: RetroArch (NES, SNES, Game Boy, GBA), NooDS (DS) and other emulators, the whole Homebrew App Store catalog, the 17 other CosmoU themes with their music, and fonts – installed right on the Wii U. Games now start reliably from it, too.

## Downloads

| | |
|---|---|
| Windows | `CosmoU-Windows-Setup-0.13.1.exe` or the portable `.exe` |
| macOS | `.dmg` (Apple silicon and Intel) |
| Linux | `.AppImage`, `.deb`, `.tar.gz` |
| Android | `.apk` |
| iPhone / iPad | `.ipa` for sideloading |

The files appear here a few minutes after the release is published.

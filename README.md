# CosmoU

A free Windows and Linux launcher for the [Cemu](https://cemu.info) Wii U emulator with a Wii U-inspired home menu.

- Quick Menu (Q or the controller's Home button): last played games, quick switches and every window in one place
- Favorites, sort & filter (A–Z, Z–A, recently played, most played; all, favorites, Wii U games, apps) and a game menu on right-click
- Game details with play time, last played, sessions and first played; press ? for every shortcut
- Covers, Grid and Wii U Look views – the Wii U Look has two layouts: the Plaza with your own buddies (Buddy maker) or a Home Menu tile grid like the console
- 21 themes in Settings → Appearance: Liquid Glass, Wii U, Classic Wii and Plaza, plus looks inspired by Switch, Switch 2, DS, DSi, 3DS, N64, GameCube, Game Boy (four shades of green), Virtual Boy (red on black), SNES, NES and the handhelds Game & Watch, Game Boy Pocket, Game Boy Color, Game Boy Advance, Game Boy Advance SP and Game Boy Micro. Every theme works with every view and in light and dark
- Own themes: add a theme file from the community (or make one, see [docs/THEMES.md](docs/THEMES.md)) in Settings → Appearance → Add own theme; a theme can bring its own menu music and be shared as one file
- Real 3D Wii U cases (front, spine and back) with the game disc, in the details and when you point at a cover
- Graphic pack manager per game: turn resolution, FPS++, mods, cheats and fixes on or off and pick presets, download the community packs in one click
- Auto-optimize: picks resolution, Vulkan, async shaders and fitting graphic packs for your graphics card
- Add other apps (emulators, PC games) to your library
- Controller navigation (D-pad / stick, A to play, B to go back)
- Automatic Cemu download and setup, automatic covers
- One Settings window with categories (Cemu & Games, Appearance, Graphics, Sound & Music, Overlay, Controllers & TV, Buddies & Plaza, Saves & Data, About), a search across all settings and full controller navigation
- Per-game quality and global graphics, audio and overlay settings
- Controller type, API and profiles, plus a button mapper: set A, B, sticks and D-pad for an Xbox controller, an SDL controller or the keyboard right in CosmoU, without opening Cemu
- Built-in feedback form that fills in your Cemu and Windows / Linux version
- First-time setup: Cemu, games folder, menu music and your look in five steps
- Export / import your settings as cosmou-settings.json
- Small notifications (for example “14 games added”)
- Daily Log: play time per game (total, last session, sessions) and a chart of the last 7 days
- Plaza posts: write what your buddies say in the Plaza; after a longer session CosmoU offers to post it
- Save backups: back up and restore a game's save data in one click from its details, plus an automatic backup before every start (the last 10 are kept; restoring backs up your current saves first)
- TV mode: fullscreen with a bigger UI for the couch, a controller or the Steam Deck (F11 or the controller's Select button), optionally on every start
- Startup animation with a short jingle that matches your theme (can be turned off, any key skips it)
- Updates & DLC: finds update and DLC folders in your games folder (or another folder you pick), shows what is installed and installs them where Cemu looks for them
- Add to Steam: CosmoU or single games as Steam entries with their covers as artwork; a game started from Steam opens through CosmoU (settings, save backups, play time) and CosmoU closes with it
- Recently played is saved on disk, so it survives restarts and updates
- Light, dark or follow your system, smooth view transitions and optional UI sounds
- Update check: shows a hint when a new version is on GitHub
- Optional background music: an original tune for each of the 21 themes (copied to the music folder on install and update), or your own file

## Install
Start CosmoU and follow the first-time setup: it gets Cemu for you, then choose your games folder.

### Windows
Download the latest `CosmoU-Setup-x.y.z.exe` (installer) or `CosmoU-Portable-x.y.z.exe` from **Releases** and run it.
Windows may show a SmartScreen warning because the app is not code-signed yet: click *More info → Run anyway*.

### Linux
Three downloads, pick one:

| File | For | How |
|---|---|---|
| `CosmoU-x.y.z-x86_64.AppImage` | every distro, Steam Deck | `chmod +x CosmoU-*.AppImage` then double-click it or run `./CosmoU-*.AppImage` |
| `CosmoU-x.y.z-amd64.deb` | Ubuntu, Debian, Mint, Pop!_OS | `sudo apt install ./CosmoU-*-amd64.deb`, then start CosmoU from the app menu |
| `cosmou-x.y.z.tar.gz` | anything else | unpack it and run `./cosmou` |

CosmoU finds Cemu by itself if you already have it: an AppImage in `~/Applications`, `~/Downloads` or `~/.local/bin`, the Flatpak `info.cemu.Cemu`, or a `cemu` program from your distro. Otherwise it downloads the official Cemu AppImage for you. Cemu's own files are used where Cemu keeps them (`~/.config/Cemu` and `~/.local/share/Cemu`, or the Flatpak / portable folders).

Notes:
- The AppImage needs FUSE 2. If it doesn't start, install `libfuse2` (Ubuntu 22.04) or `libfuse2t64` (Ubuntu 24.04+), or run it with `--appimage-extract-and-run`.
- Flatpak Cemu: give it access to your games folder (for example with Flatseal, or `flatpak override --user --filesystem=/path/to/games info.cemu.Cemu`), otherwise Cemu can't open the games CosmoU starts.
- Controllers: on Linux Cemu uses SDL. Set your controller up once in Cemu (Input settings → API "SDLController"), then the button mapper in CosmoU can change its buttons.
- Steam Deck: download the AppImage in Desktop Mode, make it executable (right-click → Properties → Permissions), and use **Add to Steam** in CosmoU (Settings → Cemu & Games → Steam) so it shows up in Game Mode. TV mode fits the Deck screen.
- Distros that block user namespaces (Ubuntu 24.04 with AppArmor) are handled: the launcher turns Chromium's sandbox off only when it can't work.

## Build from source
```
npm install
npm start      # run
npm run dist   # build installer + portable .exe into dist/ (on Windows)
npm run dist:linux  # build AppImage, .deb and .tar.gz into dist/ (on Linux)
npm run preview  # single-file browser preview with demo games
```

## Making a release
Set the version in `package.json` and push. Then on GitHub open **Releases → Draft a new release**, create a matching tag (for example `v0.8.1`) and press **Publish release**. GitHub Actions builds the two .exe files on Windows and the AppImage, .deb and .tar.gz on Linux, and attaches all of them to the release. **Actions → Build release → Run workflow** makes a test build without a release (the files are on the run page).

## Project layout
```
main.js        Electron main process: Cemu download, game scan, launching, settings.xml, graphic packs
platform.js    Everything that differs between Windows and Linux (Cemu folders, finding Cemu, Steam, starting programs)
build/linux/   Linux launcher script (scripts/linux-after-pack.js puts it into the packages)
preload.js     Bridge between the window and main.js
index.html     Window markup
css/cosmou.css All styles (themes, Wii U Look, dialogs)
js/            UI code, one file per area (core, wiiu-look, covers, settings, details, buddies, …)
```

## Feedback & community
Use **Settings → Send feedback** in the app, join the [CosmoU Discord](https://discord.gg/BZry7jGjr7), or open an issue here.

## Notes
CosmoU is an independent project. It does not include any games, firmware, keys or Nintendo files, and it is not affiliated with Nintendo or the Cemu team. Wii U and Nintendo are trademarks of Nintendo. Cemu is licensed under MPL 2.0.

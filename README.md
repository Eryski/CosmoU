# CosmoU

**A free launcher for your Nintendo emulators, with a home menu inspired by the Wii U.**

Windows · Linux · macOS · Android · iPhone & iPad

CosmoU started as a launcher for the [Cemu](https://cemu.info) Wii U emulator.
Today it brings all your consoles together in one place, each with its own look.

[Download](../../releases) · [Discord](https://discord.gg/BZry7jGjr7) · [Make your own theme](docs/THEMES.md)

<br>

## Contents

- [Consoles](#-consoles)
- [Features](#-features)
- [Install](#-install)
- [Build from source](#-build-from-source)
- [Feedback & community](#-feedback--community)
- [Notes](#notes)

<br>

## 🎮 Consoles

| Console | Emulator |
|---|---|
| **Wii U** | Cemu (downloaded and set up for you) |
| **Switch** | Eden, Citron, Sudachi and other yuzu-based emulators · MeloNX on iPhone |
| **Switch 2** | Eden-NX2, Eglantine and their forks |
| **Wii, GameCube** | Dolphin |
| **3DS, DS, N64, SNES, NES, Game Boy, GBA, Virtual Boy** | RetroArch, or the emulator you choose |

Add a console in **Settings → Games & Consoles → Add a console**: choose its emulator and its games folder.

- Switch between consoles with **L / R**, or press **LT** to see all of them as cards
- **Everything** (the last card) shows the games of all your consoles on one page
- Each console has its **own name, colour and theme** – press the pencil on its card
- A console can borrow **another console's look**: your Wii U games in the Switch 2 interface, Switch games in the 3DS HOME Menu …
- You can also make **your own console**, for example just for mods or PC games

<br>

## ✨ Features

### Looks

- **Three views:** Covers, Grid and Wii U Look
- **Wii U Look** has two layouts: the **Plaza** with your own buddies, or a **Home Menu** tile grid like the console
- **The Switch and the Switch 2** each have their own full interface: Home, Library, a page for each game, Quick Settings, their own sounds and music
- **21 themes**: Liquid Glass, Wii U, Classic Wii, Plaza, and looks inspired by Switch, Switch 2, DS, DSi, 3DS, N64, GameCube, Game Boy, Virtual Boy, SNES, NES and the handhelds
- Every theme works with every view, in **light and dark**
- **Your own themes:** add a theme file from the community, or make one ([docs/THEMES.md](docs/THEMES.md)). A theme can bring its own music
- Real **3D Wii U cases** with the game disc

### Your library

- **Favorites** – click the left stick (or press F)
- **The wheel of marks** – hold the left stick (or press K): colours and signs like ★, ⚙, ?, ! and M for mods
- **Folders** – for mods, tools or games to finish
- **Your own order** – press RT to lift a game and move it
- **Sort & filter** – A–Z, Z–A, recently played, most played · All, Favorites, Games only, Apps only
- **Add other apps** – emulators, PC games, programs
- **Automatic covers**
- **Daily Log** – play time per game and a chart of the last 7 days

### Controller

- Play everything with a controller: **D-pad or stick** to move, **A** to play, **B** to go back
- **Hold Up** to reach the bar at the top (console, search, sort, views)
- **Quick Menu** on the Home button
- A small legend shows what the buttons do
- Nintendo controllers work by the letters on their buttons (A on the right)
- **TV mode:** fullscreen with a bigger UI for the couch or the Steam Deck (F11 or Select)

### Wii U and Cemu

- **Cemu is downloaded and set up for you**
- **Graphic packs** per game: resolution, FPS++, mods, cheats and fixes – download the community packs in one click
- **Auto-optimize:** the best settings for your graphics card
- **Button mapper:** set up your controller right in CosmoU, without opening Cemu
- **Save backups:** one click, plus an automatic backup before every start
- **Updates & DLC:** found and installed where Cemu looks for them
- **Add to Steam:** CosmoU or single games, with their covers

### And more

- One **Settings** window with a search across everything
- **First-time setup** in five steps
- **Plaza posts:** what your buddies say in the Plaza
- **Background music** – an original tune for each theme, or your own file
- Startup animation with a short jingle
- **Export / import** your settings
- Built-in **feedback form**
- **Update check** when a new version is out

<br>

## 📥 Install

Start CosmoU and follow the first-time setup. It gets Cemu for you, then you choose your games folder.

| System | Download |
|---|---|
| **Windows** | `CosmoU-Windows-Setup-x.y.z.exe` (installer) or `CosmoU-Windows-Portable-x.y.z.exe` |
| **Linux** | `.AppImage` (every distro, Steam Deck) · `.deb` (Ubuntu, Debian, Mint) · `.tar.gz` |
| **macOS** | `CosmoU-macOS-x.y.z.dmg` (Apple silicon and Intel) |
| **Android** | `CosmoU-Android-x.y.z.apk` (Android 8+) |
| **iPhone & iPad** | `CosmoU-iOS-x.y.z.ipa` (iOS 15+) |

All files are on the [Releases](../../releases) page.

<br>

### Windows

1. Download the installer or the portable `.exe` and run it.
2. Windows may show a **SmartScreen** warning, because CosmoU is not code-signed yet.
   Click **More info → Run anyway**.

<br>

### Linux

| File | How to start it |
|---|---|
| `.AppImage` | `chmod +x CosmoU-Linux-*.AppImage`, then double-click it |
| `.deb` | `sudo apt install ./CosmoU-Linux-*.deb`, then start CosmoU from the app menu |
| `.tar.gz` | unpack it and run `./cosmou` |

CosmoU finds Cemu by itself (AppImage, Flatpak or your distro's package). Otherwise it downloads the official Cemu AppImage.

<details>
<summary><b>Linux tips</b> (FUSE, Flatpak, controllers, Steam Deck)</summary>

<br>

- **AppImage doesn't start?** Install `libfuse2` (Ubuntu 22.04) or `libfuse2t64` (Ubuntu 24.04+), or run it with `--appimage-extract-and-run`.
- **Flatpak Cemu:** give it access to your games folder, for example with Flatseal or
  `flatpak override --user --filesystem=/path/to/games info.cemu.Cemu`
- **Controllers:** set your controller up once in Cemu (Input settings → API *SDLController*). Then CosmoU's button mapper can change its buttons.
- **Steam Deck:** download the AppImage in Desktop Mode, make it executable (right-click → Properties → Permissions), then use **Add to Steam** in CosmoU (Settings → Games & Consoles → Steam). TV mode fits the Deck screen.
- **Ubuntu 24.04 with AppArmor** is handled: Chromium's sandbox is only turned off when it can't work.
- Cemu's files are used where Cemu keeps them (`~/.config/Cemu` and `~/.local/share/Cemu`, or the Flatpak / portable folders).

</details>

<br>

### macOS

1. Open the `.dmg` and drag **CosmoU** into **Applications**.
2. CosmoU has no paid Apple certificate, so macOS stops it the first time:
   - **macOS 15 and newer:** open CosmoU once, press **Done**, then go to **System Settings → Privacy & Security** and press **Open Anyway**.
   - **macOS 14 and older:** right-click CosmoU → **Open** → **Open**.
   - **Or in Terminal:** `xattr -dr com.apple.quarantine /Applications/CosmoU.app`

<details>
<summary><b>More about Cemu on a Mac</b></summary>

<br>

- CosmoU finds Cemu in `/Applications` or `~/Applications`, or downloads it for you.
- Cemu for Intel runs on Apple silicon with Rosetta (macOS offers to install it the first time).
- Cemu's files stay in `~/Library/Application Support/Cemu`.
- Cemu draws with Vulkan through Metal, controllers work through SDL.
- TV mode is **F11** or **⌃⌘F**.

</details>

<br>

### Android

1. Download the `.apk` on your phone or tablet and open it.
   Android asks once to allow installing apps from your browser or file app.
2. Install **Cemu for Android** ([SSimco/Cemu](https://github.com/SSimco/Cemu/releases)) once – CosmoU finds it by itself.
   It needs Android 11+ and a fast phone (Snapdragon 8 Gen 2 or similar).
3. Choose your games folder. `.wua` works best on Android.

> Cemu's own settings, graphic packs and saves are set up inside Cemu for Android, so those parts of CosmoU are hidden there.

<br>

### iPhone & iPad

1. Install the `.ipa` with [SideStore](https://sidestore.io), [AltStore](https://altstore.io) or [PlumeImpactor](https://github.com/claration/Impactor/releases) and your Apple ID.
2. Add your games in **MeloCafe** ([stossy11/MeloCafe](https://github.com/stossy11/MeloCafe)), the Wii U emulator for iOS.
3. In CosmoU, press **Get games from MeloCafe**. MeloCafe opens for a moment and sends its list back.

> Play starts the game in MeloCafe. Play time is counted until you come back to CosmoU.
> Other apps with a link (MeloNX, Delta, RetroArch …) work too.

<br>

## 🛠️ Build from source

```bash
npm install
npm start            # run
npm run preview      # browser preview with demo games
```

<details>
<summary><b>Build the apps</b></summary>

<br>

```bash
npm run dist         # Windows: installer + portable .exe
npm run dist:linux   # Linux: AppImage, .deb and .tar.gz
npm run dist:mac     # macOS: universal .dmg
gradle -p android :app:assembleRelease                  # Android (needs the Android SDK)
bash ios/prepare.sh && (cd ios && xcodegen generate)    # iOS, then open ios/CosmoU.xcodeproj in Xcode
```

**Making a release:** set the version in `package.json` and push. Then open **Releases → Draft a new release**, create a matching tag (for example `v0.14.0`) and press **Publish release**. GitHub Actions builds and tests every app and attaches them to the release.

**Actions → Build release → Run workflow** makes a test build without a release.

</details>

<details>
<summary><b>Project layout</b></summary>

<br>

```
main.js        Electron main process: Cemu download, game scan, launching, settings.xml, graphic packs
platform.js    Everything that differs between Windows, Linux and macOS
preload.js     Bridge between the window and main.js
index.html     Window markup
css/           Styles (themes, views, dialogs)
js/            UI code, one file per area (core, covers, consoles, settings, details, buddies …)
android/       Android app: the same window in a WebView
ios/           iPhone and iPad app: the same window in a WKWebView
build/linux/   Linux launcher script
scripts/ci/    End-to-end tests GitHub Actions runs after each build
```

</details>

<br>

## 💬 Feedback & community

- **In the app:** Settings → Send feedback
- **Discord:** [join the CosmoU Discord](https://discord.gg/BZry7jGjr7)
- **GitHub:** open an issue here

<br>

## Notes

CosmoU is an independent project. It does not include any games, firmware, keys or Nintendo files, and it is not affiliated with Nintendo, the Cemu team or the makers of any other emulator.

CosmoU only starts the emulators you already have – for the Switch and Switch 2 that means your own game dumps, keys and firmware, set up in the emulator itself.

Wii U and Nintendo are trademarks of Nintendo. Cemu is licensed under MPL 2.0.

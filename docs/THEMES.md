# Make your own CosmoU theme

A theme is one file. Anyone can add it in CosmoU, and it can bring its own menu music and background picture.

## Just a picture and music for a console
You don't need a theme file for that: open the **Quick Menu** (Home / Guide button, or Q) → **Sound** → **Pictures · …**
and **Music · …**, or **Settings → Appearance**. Every console (Wii U, Switch, 3DS …) keeps its own pictures and music;
switch to a console first, then choose them. Add several pictures and a new one comes each time you go to that console.
The pictures lie behind the glass – they look best with the **Liquid Glass** theme.

## Add a theme
1. Download a theme file (it ends with `.cosmoutheme`).
2. In CosmoU open **Settings → Appearance → Own theme → Add own theme…** and choose the file.
3. The theme is selected right away. If it has music, the music changes with it.

You can share the theme you are using with **Share**, and delete it with **Remove**.

## Make a theme
1. Copy `theme-template.json` (in this folder), rename it to `theme.json` and change the values.
2. Optional: put a music file next to it (`.ogg`, `.mp3`, `.wav`, `.m4a` or `.flac`, 40 MB at most) and write its name in `"music"`.
3. Optional: put a background picture next to it (`.jpg`, `.png`, `.webp` or `.gif`, 15 MB at most) and write its name in `"image"`.
4. Select `theme.json` and the other files, make a **ZIP**, and rename it to `MyTheme.cosmoutheme` (a plain `.zip` works too).
   A theme without music or picture can also be just the `theme.json` file.

### A picture on Liquid Glass
The quickest theme: CosmoU's glass look with your picture and music. Colors are not needed.
```json
{ "name": "Great Sea", "author": "You", "base": "liquid-glass", "image": "sea.jpg", "music": "song.ogg" }
```
Add `colors.selection` (and `colors.accent`) if the buttons and the selection should get your color, and `font` for a font.

## theme.json
| Field | Values | Notes |
|---|---|---|
| `name` | text, up to 40 characters | Required. |
| `base` | `none`, `liquid-glass` | `liquid-glass`: the glass look of CosmoU with your picture and music; then `colors` is optional. |
| `image` | file name | Optional. A background picture in the theme file. |
| `author` | text | Shown in the theme list. |
| `inspired` | text | For example "Nintendo DS" or "PS4 dashboard". |
| `mode` | `both`, `light`, `dark` | What the theme is made for. |
| `colors.background` | hex, e.g. `#0b1a3a` | Required (not with `base`). The window background. |
| `colors.card` | hex | Required. Panels, tiles and dialogs. |
| `colors.selection` | hex | Required. Selected items and the main buttons. |
| `colors.text` | hex | Required. Text and lines. |
| `colors.accent` | hex | Optional. Small highlights. Default: the selection color. |
| `colors.background2` | hex | Optional. Second color for `gradient` and `stars`. |
| `colorsDark` | same fields as `colors` | Optional. Used when CosmoU is set to dark. Without it, `colors` is used for both. |
| `background` | `plain`, `gradient`, `stars`, `grid`, `dots`, `stripes`, `scanlines`, `waves` (soft waves), `bubbles`, `towers` (light towers), `tiles` (PS1 board), `haze` (PS2 blue haze), `facets` (PS4 shapes), `bokeh` (Vita rings), `fog` (PS5 dark), `lcd` (pixel LCD), `xmb` (PSP wave), `xmbdust` (PS3 ribbons), `xmbnight` (PSX swoosh) | |
| `selection` | `glow`, `outline`, `brackets` | How the selected item looks. |
| `font` | `normal`, `rounded`, `pixel`, `mono`, `serif` | |
| `corners` | `square`, `rounded`, `round` | |
| `music` | file name | Optional. The file must be in the theme file. |

Colors are hex codes like `#1a2b3c` or `#fff`. Pick colors with a good contrast between `text` and `card`, and between `text` and `background`.

## Music and pictures
Use music and pictures you made yourself or have the right to share. CosmoU does not include music or pictures from games or artists.
For yourself (Settings → Appearance) you can use any picture and music you like.
The theme music plays while no own music file is set in **Settings → Sound & Music**.

## Share it
Post your `.cosmoutheme` file in the **#theme-launcher-request** channel on the [CosmoU Discord](https://discord.gg/BZry7jGjr7).
Themes made by the community are only run as colors, fonts, a picture and music: a theme file cannot run code.

An example theme with music is in `examples/PS4-Blue.cosmoutheme`.

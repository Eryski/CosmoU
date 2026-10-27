# Make your own CosmoU theme

A theme is one file. Anyone can add it in CosmoU, and it can bring its own menu music.

## Add a theme
1. Download a theme file (it ends with `.cosmoutheme`).
2. In CosmoU open **Settings → Appearance → Own theme → Add own theme…** and choose the file.
3. The theme is selected right away. If it has music, the music changes with it.

You can share the theme you are using with **Share**, and delete it with **Remove**.

## Make a theme
1. Copy `theme-template.json` (in this folder), rename it to `theme.json` and change the values.
2. Optional: put a music file next to it (`.ogg`, `.mp3`, `.wav`, `.m4a` or `.flac`, 40 MB at most) and write its name in `"music"`.
3. Select `theme.json` and the music file, make a **ZIP**, and rename it to `MyTheme.cosmoutheme` (a plain `.zip` works too).
   A theme without music can also be just the `theme.json` file.

## theme.json
| Field | Values | Notes |
|---|---|---|
| `name` | text, up to 40 characters | Required. |
| `author` | text | Shown in the theme list. |
| `inspired` | text | For example "Nintendo DS" or "PS4 dashboard". |
| `mode` | `both`, `light`, `dark` | What the theme is made for. |
| `colors.background` | hex, e.g. `#0b1a3a` | Required. The window background. |
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

## Music
Use music you made yourself or have the right to share. CosmoU does not include music from games or artists.
The theme music plays while no own music file is set in **Settings → Sound & Music**.

## Share it
Post your `.cosmoutheme` file in the **#theme-launcher-request** channel on the [CosmoU Discord](https://discord.gg/BZry7jGjr7).
Themes made by the community are only run as colors and fonts: a theme file cannot run code.

An example theme with music is in `examples/PS4-Blue.cosmoutheme`.

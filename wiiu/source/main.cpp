// CosmoU for Wii U – the CosmoU launcher as an app on the Wii U itself (Aroma, .wuhb).
// It shows the games installed on this Wii U (system memory, USB and disc) in CosmoU's look and starts them.
// It has no update check. Only its shop goes online: emulators and apps from the Homebrew App Store catalog,
// themes and fonts from CosmoU's GitHub (shop.cpp).
//
// Controls: D-pad / left stick move · A starts · Y changes the view (Covers / Grid) · X changes the theme ·
// + opens the shop · − turns the music on and off · L / R jump · touch: tap a game to choose it, tap it again
// (or Play) to start · HOME opens the HOME Menu as usual.
// In the shop: L / R or ◀ ▶ change the tab · ▲ ▼ choose · A installs (or uses a theme / font) · X removes · B back.
#include <SDL.h>
#include <SDL_image.h>
#include <SDL_mixer.h>
#include <SDL_ttf.h>

#include <coreinit/mcp.h>
#include <coreinit/memory.h>
#include <coreinit/time.h>
#include <nn/acp/client.h>
#include <nn/acp/title.h>
#include <sysapp/launch.h>
#include <sysapp/title.h>

#include <dirent.h>
#include <sys/stat.h>

#include "shop.hpp"

#include <algorithm>
#include <cctype>
#include <initializer_list>
#include <cmath>
#include <cstdarg>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <map>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>

#ifndef COSMOU_VERSION
#define COSMOU_VERSION "0.13.0"
#endif

static const int W = 1280, H = 720;
static const char *CONTENT = "fs:/vol/content/";
static const char *SD_CFG = "fs:/vol/external01/wiiu/cosmou.cfg";
static const char *SD_TEST = "fs:/vol/external01/cosmou-test.txt";
static const char *SD_LOG = "fs:/vol/external01/cosmou-test.log";

// ---------------------------------------------------------------- themes
enum Deco { DNone, DGrid, DStars, DLines, DScan, DBrushed, DDots };
struct Theme {
   std::string id, name, music; // music: a full path
   SDL_Color bgTop, bgBottom, blob1, blob2, blob3, ink, mute, accent, onAccent, card, line;
   int deco;
};
struct BuiltIn {
   const char *id, *name, *music;
   SDL_Color bgTop, bgBottom, blob1, blob2, blob3, ink, mute, accent, onAccent, card, line;
   bool grid; // fine grid lines (Wii U)
};
static const BuiltIn BUILTIN[] = {
   {"liquid-glass", "Liquid Glass", "liquid-glass.ogg", {236, 248, 250, 255}, {250, 244, 236, 255}, {143, 233, 242, 150}, {196, 184, 255, 120},
    {255, 216, 176, 130}, {8, 20, 31, 255}, {90, 110, 126, 255}, {18, 180, 204, 255}, {2, 38, 45, 255}, {255, 255, 255, 215}, {16, 50, 80, 40}, false},
   {"wii-u", "Wii U", "wii-u.ogg", {250, 251, 251, 255}, {233, 236, 238, 255}, {0, 0, 0, 0}, {0, 0, 0, 0}, {0, 0, 0, 0}, {40, 46, 54, 255},
    {110, 118, 128, 255}, {34, 168, 230, 255}, {255, 255, 255, 255}, {255, 255, 255, 255}, {207, 212, 217, 255}, true},
   {"switch", "Switch", "switch.ogg", {235, 235, 235, 255}, {235, 235, 235, 255}, {0, 0, 0, 0}, {0, 0, 0, 0}, {0, 0, 0, 0}, {45, 45, 45, 255},
    {120, 120, 120, 255}, {0, 195, 227, 255}, {255, 255, 255, 255}, {255, 255, 255, 255}, {210, 210, 210, 255}, false},
   {"night", "Night", "n64.ogg", {16, 41, 92, 255}, {4, 13, 36, 255}, {40, 80, 180, 70}, {120, 90, 220, 50}, {20, 120, 160, 40}, {238, 242, 255, 255},
    {170, 182, 214, 255}, {79, 124, 255, 255}, {255, 255, 255, 255}, {19, 37, 79, 235}, {43, 63, 114, 255}, false},
};
// the shop's themes, in the order of the shop
static const char *SHOP_THEMES[] = {"classic-wii", "plaza", "switch2", "ds", "dsi", "3ds", "gamecube", "gameboy", "virtualboy",
                                    "snes", "nes", "gameandwatch", "gbpocket", "gbcolor", "gba", "gbasp", "gbmicro"};
static std::vector<Theme> THEMES;
static int NTHEMES = 0;

// ---------------------------------------------------------------- state
struct Game {
   uint64_t tid = 0;
   std::string name, path, device;
   SDL_Texture *icon = nullptr;
   SDL_Color tint{120, 160, 200, 255};
   uint32_t played = 0; // order of the last start (bigger = more recent)
};
static SDL_Renderer *R = nullptr;
static std::vector<Game> games;
static int sel = 0, themeIx = 0, view = 0; // view 0 = Covers, 1 = Grid
static bool musicOn = true;
static float coverPos = 0.f, gridScroll = 0.f;
static uint32_t playCounter = 0;
static std::string launching;
static Uint32 launchAt = 0;
static bool testMode = false;
static bool leaving = false; // a game is being started: nothing more is drawn
static Uint32 leftAt = 0;
static SDL_Texture *logo = nullptr;
static std::string fontId = "system"; // the font for everything: the Wii U's own, or one from the shop
static std::string wantTheme = "";     // the theme in the settings (it may come from the shop)

static const Theme &T() { return THEMES[themeIx]; }

// ---------------------------------------------------------------- themes: the four built in, and the ones from the shop
static SDL_Color hexColor(const std::string &v, SDL_Color def) {
   std::string h = v.size() && v[0] == '#' ? v.substr(1) : v;
   if (h.size() != 6 && h.size() != 8) return def;
   unsigned long n = strtoul(h.c_str(), nullptr, 16);
   if (h.size() == 6) return {(Uint8)(n >> 16), (Uint8)(n >> 8), (Uint8)n, 255};
   return {(Uint8)(n >> 24), (Uint8)(n >> 16), (Uint8)(n >> 8), (Uint8)n};
}
static bool loadThemeFile(const std::string &id, Theme &t) {
   std::string dir = shop::themeDir(id);
   FILE *f = fopen((dir + "theme.cfg").c_str(), "r");
   if (!f) return false;
   std::map<std::string, std::string> kv;
   char line[256];
   while (fgets(line, sizeof line, f)) {
      char k[64], v[160];
      if (sscanf(line, "%63[^=]=%159[^\r\n]", k, v) == 2) kv[k] = v;
   }
   fclose(f);
   const SDL_Color none{0, 0, 0, 0};
   t.id = id;
   t.name = kv.count("name") ? kv["name"] : id;
   t.music = dir + (kv.count("music") ? kv["music"] : "music.ogg");
   t.bgTop = hexColor(kv["bgTop"], {240, 240, 240, 255});
   t.bgBottom = hexColor(kv["bgBottom"], t.bgTop);
   t.blob1 = hexColor(kv["blob1"], none);
   t.blob2 = hexColor(kv["blob2"], none);
   t.blob3 = hexColor(kv["blob3"], none);
   t.ink = hexColor(kv["ink"], {30, 30, 30, 255});
   t.mute = hexColor(kv["mute"], {110, 110, 110, 255});
   t.accent = hexColor(kv["accent"], {34, 168, 230, 255});
   t.onAccent = hexColor(kv["onAccent"], {255, 255, 255, 255});
   t.card = hexColor(kv["card"], {255, 255, 255, 230});
   t.line = hexColor(kv["line"], {200, 200, 200, 255});
   static const std::pair<const char *, int> decos[] = {{"grid", DGrid}, {"stars", DStars}, {"lines", DLines}, {"scan", DScan}, {"brushed", DBrushed}, {"dots", DDots}};
   t.deco = DNone;
   for (auto &d : decos)
      if (kv["deco"] == d.first) t.deco = d.second;
   return true;
}
static void loadThemes() {
   std::string cur = THEMES.empty() ? wantTheme : T().id;
   THEMES.clear();
   for (auto &b : BUILTIN) {
      Theme t{b.id, b.name, std::string(CONTENT) + "music/" + b.music, b.bgTop, b.bgBottom, b.blob1, b.blob2, b.blob3, b.ink, b.mute,
              b.accent, b.onAccent, b.card, b.line, b.grid ? DGrid : !strcmp(b.id, "night") ? DStars : DNone};
      THEMES.push_back(t);
   }
   std::vector<std::string> ids(std::begin(SHOP_THEMES), std::end(SHOP_THEMES));
   // themes put on the SD card by hand (any folder with a theme.cfg) come after the shop's
   std::vector<std::string> more;
   if (DIR *d = opendir((shop::root + "wiiu/cosmou/themes").c_str())) {
      while (dirent *e = readdir(d))
         if (e->d_name[0] != '.' && std::find(ids.begin(), ids.end(), e->d_name) == ids.end()) more.push_back(e->d_name);
      closedir(d);
   }
   std::sort(more.begin(), more.end());
   ids.insert(ids.end(), more.begin(), more.end());
   for (auto &id : ids) {
      Theme t;
      if (loadThemeFile(id, t)) THEMES.push_back(t);
   }
   NTHEMES = (int)THEMES.size();
   themeIx = 0;
   for (int i = 0; i < NTHEMES; i++)
      if (THEMES[i].id == cur) themeIx = i;
}
// test log on the SD card (only in test mode): opened and closed for every line, so nothing waits in a buffer
static void tlog(const char *fmt, ...) __attribute__((format(printf, 1, 2)));
static void tlog(const char *fmt, ...) {
   if (!testMode) return;
   FILE *f = fopen(SD_LOG, "a");
   if (!f) return;
   va_list a;
   va_start(a, fmt);
   vfprintf(f, fmt, a);
   va_end(a);
   fclose(f);
}

// ---------------------------------------------------------------- settings on the SD card (theme, view, music, last played)
static void loadCfg() {
   FILE *f = fopen(SD_CFG, "r");
   if (!f) return;
   char line[256];
   while (fgets(line, sizeof line, f)) {
      char k[64], v[160];
      if (sscanf(line, "%63[^=]=%159[^\n]", k, v) != 2) continue;
      if (!strcmp(k, "theme")) {
         wantTheme = v;
         for (int i = 0; i < NTHEMES; i++)
            if (THEMES[i].id == v) themeIx = i;
      } else if (!strcmp(k, "font")) fontId = v;
      else if (!strcmp(k, "view")) view = atoi(v) ? 1 : 0;
      else if (!strcmp(k, "music")) musicOn = atoi(v) != 0;
      else if (!strncmp(k, "played.", 7)) {
         uint64_t tid = strtoull(k + 7, nullptr, 16);
         uint32_t n = (uint32_t)strtoul(v, nullptr, 10);
         for (auto &g : games)
            if (g.tid == tid) g.played = n;
         playCounter = std::max(playCounter, n);
      }
   }
   fclose(f);
}
static void saveCfg() {
   FILE *f = fopen(SD_CFG, "w");
   if (!f) return;
   fprintf(f, "theme=%s\nview=%d\nmusic=%d\nfont=%s\n", T().id.c_str(), view, musicOn ? 1 : 0, fontId.c_str());
   for (auto &g : games)
      if (g.played) fprintf(f, "played.%016llx=%u\n", (unsigned long long)g.tid, (unsigned)g.played);
   fclose(f);
}

// ---------------------------------------------------------------- drawing helpers (rounded shapes, gradients, glows)
static SDL_Vertex vtx(float x, float y, SDL_Color c) {
   SDL_Vertex v;
   v.position = {x, y};
   v.color = c;
   v.tex_coord = {0, 0};
   return v;
}
static SDL_Color alpha(SDL_Color c, float a) { return {c.r, c.g, c.b, (Uint8)std::max(0.f, std::min(255.f, c.a * a))}; }
static SDL_Color mix(SDL_Color a, SDL_Color b, float t) {
   return {(Uint8)(a.r + (b.r - a.r) * t), (Uint8)(a.g + (b.g - a.g) * t), (Uint8)(a.b + (b.b - a.b) * t), (Uint8)(a.a + (b.a - a.a) * t)};
}
static void roundPath(std::vector<SDL_FPoint> &p, float x, float y, float w, float h, float r) {
   r = std::max(0.f, std::min(r, std::min(w, h) / 2));
   const int seg = 8;
   const float cx[4] = {x + w - r, x + w - r, x + r, x + r}, cy[4] = {y + r, y + h - r, y + h - r, y + r};
   const float start[4] = {-90, 0, 90, 180};
   p.clear();
   for (int c = 0; c < 4; c++)
      for (int i = 0; i <= seg; i++) {
         float a = (start[c] + 90.f * i / seg) * (float)M_PI / 180.f;
         p.push_back({cx[c] + std::cos(a) * r, cy[c] + std::sin(a) * r});
      }
}
static void fillRound(float x, float y, float w, float h, float r, SDL_Color c) {
   static std::vector<SDL_FPoint> p;
   static std::vector<SDL_Vertex> v;
   roundPath(p, x, y, w, h, r);
   v.clear();
   SDL_Vertex mid = vtx(x + w / 2, y + h / 2, c);
   for (size_t i = 0; i < p.size(); i++) {
      v.push_back(mid);
      v.push_back(vtx(p[i].x, p[i].y, c));
      const SDL_FPoint &n = p[(i + 1) % p.size()];
      v.push_back(vtx(n.x, n.y, c));
   }
   SDL_RenderGeometry(R, nullptr, v.data(), (int)v.size(), nullptr, 0);
}
static void ringRound(float x, float y, float w, float h, float r, float t, SDL_Color c) {
   static std::vector<SDL_FPoint> a, b;
   static std::vector<SDL_Vertex> v;
   roundPath(a, x, y, w, h, r);
   roundPath(b, x + t, y + t, w - 2 * t, h - 2 * t, std::max(0.f, r - t));
   v.clear();
   for (size_t i = 0; i < a.size(); i++) {
      size_t j = (i + 1) % a.size();
      v.push_back(vtx(a[i].x, a[i].y, c));
      v.push_back(vtx(a[j].x, a[j].y, c));
      v.push_back(vtx(b[i].x, b[i].y, c));
      v.push_back(vtx(b[i].x, b[i].y, c));
      v.push_back(vtx(a[j].x, a[j].y, c));
      v.push_back(vtx(b[j].x, b[j].y, c));
   }
   SDL_RenderGeometry(R, nullptr, v.data(), (int)v.size(), nullptr, 0);
}
// a soft shadow: a few rounded layers that get fainter
static void shadow(float x, float y, float w, float h, float r, float spread, Uint8 a) {
   for (int i = 4; i >= 1; i--) {
      float s = spread * i / 4;
      fillRound(x - s, y - s + spread * 0.5f, w + 2 * s, h + 2 * s, r + s, {0, 0, 0, (Uint8)(a / 4)});
   }
}
static void gradient(float x, float y, float w, float h, SDL_Color top, SDL_Color bottom) {
   SDL_Vertex v[6] = {vtx(x, y, top), vtx(x + w, y, top), vtx(x, y + h, bottom), vtx(x, y + h, bottom), vtx(x + w, y, top), vtx(x + w, y + h, bottom)};
   SDL_RenderGeometry(R, nullptr, v, 6, nullptr, 0);
}
static void blob(float cx, float cy, float rad, SDL_Color c) {
   if (!c.a) return;
   static std::vector<SDL_Vertex> v;
   v.clear();
   const int seg = 48;
   SDL_Color edge = alpha(c, 0);
   for (int i = 0; i < seg; i++) {
      float a0 = 2 * (float)M_PI * i / seg, a1 = 2 * (float)M_PI * (i + 1) / seg;
      v.push_back(vtx(cx, cy, c));
      v.push_back(vtx(cx + std::cos(a0) * rad, cy + std::sin(a0) * rad, edge));
      v.push_back(vtx(cx + std::cos(a1) * rad, cy + std::sin(a1) * rad, edge));
   }
   SDL_RenderGeometry(R, nullptr, v.data(), (int)v.size(), nullptr, 0);
}
static void circle(float cx, float cy, float rad, SDL_Color c) { fillRound(cx - rad, cy - rad, 2 * rad, 2 * rad, rad, c); }

// ---------------------------------------------------------------- text (the Wii U's own system font; a bundled one as a fallback)
// fonts by name + size; "system" is the Wii U's own, others come from the shop (wiiu/cosmou/fonts/<id>/)
static std::map<std::string, TTF_Font *> fonts;
static void *sharedFont = nullptr;
static uint32_t sharedFontSize = 0;
static const char *drawFont = nullptr; // a different font for a moment (the shop's previews)
static TTF_Font *openFont(const std::string &id, int size) {
   TTF_Font *f = nullptr;
   bool bold = size < 0;
   int px = std::abs(size);
   if (id != "system") {
      // read once into memory: every size opened from a file would keep one more file open on the SD card
      static std::map<std::string, std::string> data;
      std::string d = shop::fontDir(id), file = bold && shop::exists(d + "bold.ttf") ? "bold.ttf" : "regular.ttf";
      std::string &mem = data[id + "/" + file];
      if (mem.empty()) {
         FILE *ff = fopen((d + file).c_str(), "rb");
         if (ff) {
            char b[16384];
            size_t n;
            while ((n = fread(b, 1, sizeof b, ff)) > 0) mem.append(b, n);
            fclose(ff);
         }
      }
      if (!mem.empty()) f = TTF_OpenFontRW(SDL_RWFromConstMem(mem.data(), (int)mem.size()), 1, px);
      if (f && bold && file == "regular.ttf") TTF_SetFontStyle(f, TTF_STYLE_BOLD);
      if (f) return f;
   }
   if (sharedFont) {
      f = TTF_OpenFontRW(SDL_RWFromConstMem(sharedFont, (int)sharedFontSize), 1, px);
      if (f && bold) TTF_SetFontStyle(f, TTF_STYLE_BOLD);
   }
   if (!f) f = TTF_OpenFont((std::string(CONTENT) + (bold ? "fonts/bold.ttf" : "fonts/regular.ttf")).c_str(), px);
   return f;
}
static TTF_Font *font(int size) {
   std::string id = drawFont ? drawFont : fontId;
   std::string k = id + "|" + std::to_string(size);
   auto it = fonts.find(k);
   if (it != fonts.end()) return it->second;
   TTF_Font *f = openFont(id, size);
   fonts[k] = f;
   return f;
}
struct Txt {
   SDL_Texture *t = nullptr;
   int w = 0, h = 0;
   Uint32 used = 0;
};
static std::unordered_map<std::string, Txt> textCache;
// size < 0 = bold. Draws text with its left edge at x (align 0), centred (1) or right edge at x (2); cut to maxW with "…"
static int text(const std::string &s, int size, float x, float y, SDL_Color c, int align = 0, int maxW = 0) {
   if (s.empty()) return 0;
   char key[96];
   snprintf(key, sizeof key, "%s|%d|%02x%02x%02x|%d|", drawFont ? drawFont : fontId.c_str(), size, c.r, c.g, c.b, maxW);
   std::string k = key + s;
   auto it = textCache.find(k);
   if (it == textCache.end()) {
      TTF_Font *f = font(size);
      if (!f) return 0;
      std::string t = s;
      int tw = 0, th = 0;
      TTF_SizeUTF8(f, t.c_str(), &tw, &th);
      if (maxW > 0 && tw > maxW) {
         while (!t.empty()) {
            do t.pop_back(); while (!t.empty() && (t.back() & 0xC0) == 0x80);
            TTF_SizeUTF8(f, (t + "…").c_str(), &tw, &th);
            if (tw <= maxW) break;
         }
         t += "…";
      }
      SDL_Surface *sf = TTF_RenderUTF8_Blended(f, t.c_str(), {c.r, c.g, c.b, 255});
      if (!sf) return 0;
      Txt x;
      x.t = SDL_CreateTextureFromSurface(R, sf);
      x.w = sf->w;
      x.h = sf->h;
      SDL_FreeSurface(sf);
      it = textCache.emplace(k, x).first;
      // keep the cache small: forget what wasn't drawn for a while
      if (textCache.size() > 400) {
         Uint32 now = SDL_GetTicks();
         for (auto i = textCache.begin(); i != textCache.end();)
            if (now - i->second.used > 5000) {
               SDL_DestroyTexture(i->second.t);
               i = textCache.erase(i);
            } else ++i;
         it = textCache.find(k);
      }
   }
   Txt &t = it->second;
   t.used = SDL_GetTicks();
   SDL_SetTextureAlphaMod(t.t, c.a);
   SDL_FRect d = {align == 1 ? x - t.w / 2.f : align == 2 ? x - t.w : x, y, (float)t.w, (float)t.h};
   SDL_RenderCopyF(R, t.t, nullptr, &d);
   return t.w;
}

// ---------------------------------------------------------------- sounds (made here, no files): move, open, back, start
static Mix_Chunk *sMove = nullptr, *sOpen = nullptr, *sBack = nullptr, *sStart = nullptr;
static Mix_Music *music = nullptr;
static bool audioReady = false;
static Mix_Chunk *tone(std::initializer_list<float> freqs, float len, float vol) {
   int rate = 48000, n = (int)(rate * len * freqs.size());
   Sint16 *buf = (Sint16 *)SDL_malloc(n * 2 * sizeof(Sint16));
   if (!buf) return nullptr;
   int i = 0;
   for (float fq : freqs) {
      int m = (int)(rate * len);
      for (int k = 0; k < m; k++, i++) {
         float t = (float)k / rate, env = std::exp(-t * 18.f) * std::min(1.f, k / 60.f);
         float s = std::sin(2 * (float)M_PI * fq * t) * 0.7f + std::sin(4 * (float)M_PI * fq * t) * 0.15f;
         Sint16 v = (Sint16)(s * env * vol * 32767);
         buf[i * 2] = buf[i * 2 + 1] = v;
      }
   }
   Mix_Chunk *c = Mix_QuickLoad_RAW((Uint8 *)buf, n * 2 * sizeof(Sint16));
   return c;
}
static void play(Mix_Chunk *c) {
   if (c && audioReady) Mix_PlayChannel(-1, c, 0);
}
// sound is closed before CosmoU leaves the screen (starting a game, HOME Menu, closing): a Wii U app that keeps
// its audio running while the system switches can leave the next game hanging on its start screen
static void startMusic();
static void audioOpen() {
   if (audioReady) return;
   if (Mix_OpenAudio(48000, AUDIO_S16SYS, 2, 2048) != 0) return;
   audioReady = true;
   Mix_AllocateChannels(8);
   if (!sMove) {
      sMove = tone({1320.f}, 0.045f, 0.18f);
      sOpen = tone({880.f, 1320.f}, 0.06f, 0.2f);
      sBack = tone({990.f, 660.f}, 0.06f, 0.18f);
      sStart = tone({660.f, 990.f, 1320.f}, 0.08f, 0.22f);
   }
   startMusic();
}
static void audioClose() {
   if (!audioReady) return;
   Mix_HaltChannel(-1);
   Mix_HaltMusic();
   if (music) {
      Mix_FreeMusic(music);
      music = nullptr;
   }
   Mix_CloseAudio();
   audioReady = false;
}
static void startMusic() {
   if (music) {
      Mix_HaltMusic();
      Mix_FreeMusic(music);
      music = nullptr;
   }
   if (!musicOn || !audioReady) return;
   music = Mix_LoadMUS(T().music.c_str());
   if (music) {
      Mix_VolumeMusic(MIX_MAX_VOLUME * 45 / 100);
      Mix_FadeInMusic(music, -1, 900);
   }
}

// ---------------------------------------------------------------- the games on this Wii U
static std::string readFile(const std::string &p) {
   FILE *f = fopen(p.c_str(), "rb");
   if (!f) return "";
   std::string s;
   char b[4096];
   size_t n;
   while ((n = fread(b, 1, sizeof b, f)) > 0) s.append(b, n);
   fclose(f);
   return s;
}
static std::string xmlTag(const std::string &x, const char *tag) {
   std::string open = std::string("<") + tag;
   size_t a = x.find(open);
   if (a == std::string::npos) return "";
   a = x.find('>', a);
   size_t b = x.find(std::string("</") + tag + ">", a);
   if (a == std::string::npos || b == std::string::npos) return "";
   std::string v = x.substr(a + 1, b - a - 1);
   // names are written with entities and line breaks ("The Legend of Zelda\nBreath of the Wild")
   const std::pair<const char *, const char *> ent[] = {{"&amp;", "&"}, {"&lt;", "<"}, {"&gt;", ">"}, {"&quot;", "\""}, {"&apos;", "'"}};
   for (auto &e : ent)
      for (size_t i; (i = v.find(e.first)) != std::string::npos;) v.replace(i, strlen(e.first), e.second);
   for (auto &ch : v)
      if (ch == '\n' || ch == '\r') ch = ' ';
   while (v.find("  ") != std::string::npos) v.erase(v.find("  "), 1);
   while (!v.empty() && v.back() == ' ') v.pop_back();
   return v;
}
static SDL_Color tintOf(SDL_Surface *s, const std::string &name) {
   if (s) {
      SDL_Surface *c = SDL_ConvertSurfaceFormat(s, SDL_PIXELFORMAT_RGBA32, 0);
      if (c) {
         unsigned long r = 0, g = 0, b = 0, n = 0;
         Uint8 *px = (Uint8 *)c->pixels;
         for (int y = 0; y < c->h; y += 8)
            for (int x = 0; x < c->w; x += 8) {
               Uint8 *p = px + y * c->pitch + x * 4;
               if (p[3] < 128) continue;
               r += p[0];
               g += p[1];
               b += p[2];
               n++;
            }
         SDL_FreeSurface(c);
         if (n) return {(Uint8)(r / n), (Uint8)(g / n), (Uint8)(b / n), 255};
      }
   }
   unsigned h = 0;
   for (char ch : name) h = h * 31 + (unsigned char)ch;
   static const SDL_Color pal[] = {{236, 92, 110, 255}, {64, 160, 236, 255}, {84, 190, 120, 255}, {244, 162, 60, 255}, {150, 110, 230, 255}, {30, 180, 190, 255}};
   return pal[h % 6];
}
static void loadGames() {
   int32_t h = MCP_Open();
   if (h < 0) return;
   int32_t count = MCP_TitleCount(h);
   std::vector<MCPTitleListType> list(std::max(count, 1) + 8);
   uint32_t got = 0;
   // the whole list works on a Wii U and in Cemu; by type only as a second try
   if (count <= 0 || MCP_TitleList(h, &got, list.data(), list.size() * sizeof(MCPTitleListType)) < 0) {
      got = 0;
      MCP_TitleListByAppType(h, MCP_APP_TYPE_GAME, &got, list.data(), list.size() * sizeof(MCPTitleListType));
   }
   MCP_Close(h);
   for (uint32_t i = 0; i < got && i < list.size(); i++) {
      const MCPTitleListType &t = list[i];
      if (t.appType != MCP_APP_TYPE_GAME) continue;
      if (std::any_of(games.begin(), games.end(), [&](const Game &g) { return g.tid == t.titleId; })) continue;
      Game g;
      g.tid = t.titleId;
      g.path = t.path;
      g.device = t.indexedDevice;
      std::string base = std::string("fs:") + t.path;
      std::string meta = readFile(base + "/meta/meta.xml");
      g.name = xmlTag(meta, "longname_en");
      if (g.name.empty()) g.name = xmlTag(meta, "shortname_en");
      if (g.name.empty()) {
         char b[32];
         snprintf(b, sizeof b, "%016llX", (unsigned long long)g.tid);
         g.name = b;
      }
      SDL_RWops *rw = SDL_RWFromFile((base + "/meta/iconTex.tga").c_str(), "rb");
      SDL_Surface *s = rw ? IMG_LoadTGA_RW(rw) : nullptr;
      if (rw) SDL_RWclose(rw);
      g.tint = tintOf(s, g.name);
      if (s) {
         g.icon = SDL_CreateTextureFromSurface(R, s);
         SDL_FreeSurface(s);
      }
      games.push_back(g);
   }
   std::sort(games.begin(), games.end(), [](const Game &a, const Game &b) { return a.name < b.name; });
}
// most recently played first (like CosmoU's Covers), then A–Z
static void sortGames() {
   std::stable_sort(games.begin(), games.end(), [](const Game &a, const Game &b) { return a.played > b.played; });
}
static std::string deviceName(const std::string &d) {
   if (d.rfind("odd", 0) == 0) return "Disc";
   if (d.rfind("usb", 0) == 0) return "USB";
   if (d.rfind("mlc", 0) == 0) return "System memory";
   return "Wii U";
}

// ---------------------------------------------------------------- one game picture: its icon, or a coloured tile with initials
static void drawIcon(const Game &g, float x, float y, float s, float a, bool on) {
   float r = s * 0.12f;
   shadow(x, y, s, s, r, s * 0.06f, (Uint8)(70 * a));
   if (on) {
      ringRound(x - 9, y - 9, s + 18, s + 18, r + 9, 5, alpha(T().accent, a));
      ringRound(x - 14, y - 14, s + 28, s + 28, r + 14, 5, alpha(T().accent, 0.25f * a));
   }
   fillRound(x - 3, y - 3, s + 6, s + 6, r + 3, alpha({255, 255, 255, 255}, a));
   if (g.icon) {
      SDL_SetTextureAlphaMod(g.icon, (Uint8)(255 * a));
      SDL_FRect d = {x, y, s, s};
      SDL_RenderCopyF(R, g.icon, nullptr, &d);
   } else {
      SDL_Color c2 = mix(g.tint, {0, 0, 0, 255}, 0.25f);
      fillRound(x, y, s, s, r, alpha(g.tint, a));
      gradient(x + r, y + s * 0.55f, s - 2 * r, s * 0.45f - r, alpha(g.tint, 0), alpha(c2, a * 0.6f));
      std::string ini;
      bool next = true;
      for (char ch : g.name) {
         if (ch == ' ') next = true;
         else if (next && isalnum((unsigned char)ch) && ini.size() < 2) {
            ini += (char)toupper(ch);
            next = false;
         } else next = false;
      }
      text(ini, -(int)(s * 0.32f), x + s / 2, y + s / 2 - s * 0.2f, alpha({255, 255, 255, 255}, a), 1);
   }
}

// ---------------------------------------------------------------- screen parts
static void background(float t) {
   const Theme &th = T();
   gradient(0, 0, W, H, th.bgTop, th.bgBottom);
   blob(150 + std::sin(t * 0.15f) * 40, 60, 520, th.blob1);
   blob(1180, 260 + std::cos(t * 0.12f) * 40, 460, th.blob2);
   blob(640 + std::sin(t * 0.1f) * 60, 820, 520, th.blob3);
   if (th.deco == DGrid) {
      // Wii U and DS: fine grid paper in the colour of the lines
      SDL_Color g = th.id == "wii-u" ? SDL_Color{140, 152, 162, 30} : alpha(th.line, 0.35f);
      SDL_SetRenderDrawColor(R, g.r, g.g, g.b, g.a);
      for (int x = 0; x < W; x += 24) SDL_RenderDrawLine(R, x, 0, x, H);
      for (int y = 0; y < H; y += 24) SDL_RenderDrawLine(R, 0, y, W, y);
   } else if (th.deco == DLines) {
      // Classic Wii and DSi: soft white stripes
      SDL_SetRenderDrawColor(R, 255, 255, 255, 120);
      for (int y = 0; y < H; y += 6) SDL_RenderDrawLine(R, 0, y, W, y);
   } else if (th.deco == DScan) {
      // Virtual Boy: red scan lines
      SDL_SetRenderDrawColor(R, th.accent.r, th.accent.g, th.accent.b, 26);
      for (int y = 0; y < H; y += 4) SDL_RenderDrawLine(R, 0, y, W, y);
   } else if (th.deco == DBrushed) {
      // Game Boy Micro: brushed metal
      for (int y = 0; y < H; y++) {
         unsigned h = (unsigned)y * 2654435761u;
         Uint8 a = (Uint8)(6 + (h >> 27));
         if (h & 1) SDL_SetRenderDrawColor(R, 255, 255, 255, a);
         else SDL_SetRenderDrawColor(R, 0, 0, 0, (Uint8)(a / 2));
         SDL_RenderDrawLine(R, 0, y, W, y);
      }
   } else if (th.deco == DDots) {
      // Plaza: slow, soft confetti dots
      for (int i = 0; i < 26; i++) {
         float x = std::fmod(i * 211.f + t * (8 + i % 5), (float)W + 80) - 40, y = std::fmod(i * 137.f + t * (5 + i % 3) * 2, (float)H + 80) - 40;
         SDL_Color c = i % 3 == 0 ? th.accent : i % 3 == 1 ? th.blob2 : th.blob3;
         c.a = 70;
         circle(x, y, 6 + i % 4 * 3, c);
      }
   }
   if (th.deco == DStars) {
      // a few still stars
      for (int i = 0; i < 70; i++) {
         float x = (i * 9973 % W), y = (i * 7919 % H);
         float tw = 0.5f + 0.5f * std::sin(t * 1.3f + i);
         SDL_SetRenderDrawColor(R, 255, 255, 255, (Uint8)(90 + 120 * tw));
         SDL_RenderDrawPointF(R, x, y);
         if (i % 7 == 0) SDL_RenderDrawPointF(R, x + 1, y);
      }
   }
}
static SDL_FRect viewBtn[2], playBtn, shopBtn;
static bool shopOpen = false; // the shop is on the screen instead of the library
static void header() {
   const Theme &th = T();
   float bx = 48;
   if (logo) {
      SDL_FRect d = {48, 28, 66, 66};
      SDL_RenderCopyF(R, logo, nullptr, &d);
      bx = 128;
   }
   text(shopOpen ? "CosmoU Shop" : "CosmoU", -40, bx, 26, th.ink);
   char sub[96];
   if (shopOpen) snprintf(sub, sizeof sub, "Emulators, apps, themes and fonts");
   else snprintf(sub, sizeof sub, "Wii U Library · %d %s", (int)games.size(), games.size() == 1 ? "game" : "games");
   text(sub, 19, bx + 2, 74, th.accent);
   float x = 760, y = 30, h = 46;
   // Shop (in the shop: back to the library)
   shopBtn = {shopOpen ? x + 132 : x - 162, y - 6, 150, h + 12};
   fillRound(shopBtn.x, shopBtn.y, shopBtn.w, shopBtn.h, shopBtn.h / 2, shopOpen ? th.card : th.accent);
   ringRound(shopBtn.x, shopBtn.y, shopBtn.w, shopBtn.h, shopBtn.h / 2, 1.5f, shopOpen ? th.line : alpha(th.accent, 0));
   SDL_Color sc = shopOpen ? th.ink : th.onAccent;
   if (!shopOpen) {
      // a small shopping bag
      float ix = shopBtn.x + 30, iy = shopBtn.y + 17;
      fillRound(ix - 11, iy + 2, 22, 19, 4, sc);
      ringRound(ix - 6, iy - 6, 12, 16, 6, 2.5f, sc);
   }
   text(shopOpen ? "Library" : "Shop", -22, shopBtn.x + (shopOpen ? 75 : 88), y + 10, sc, 1);
   if (!shopOpen) {
      // Covers / Grid
      const char *lbl[2] = {"Covers", "Grid"};
      fillRound(x - 6, y - 6, 2 * 132 + 12, h + 12, (h + 12) / 2, th.card);
      ringRound(x - 6, y - 6, 2 * 132 + 12, h + 12, (h + 12) / 2, 1.5f, th.line);
      for (int i = 0; i < 2; i++) {
         viewBtn[i] = {x + i * 132, y, 132, h};
         if (i == view) fillRound(viewBtn[i].x, y, 132, h, h / 2, th.accent);
         text(lbl[i], -22, viewBtn[i].x + 66, y + 10, i == view ? th.onAccent : th.ink, 1);
      }
   }
   // clock
   OSCalendarTime ct;
   OSTicksToCalendarTime(OSGetTime(), &ct);
   char clk[16], day[32];
   snprintf(clk, sizeof clk, "%02d:%02d", ct.tm_hour, ct.tm_min);
   static const char *wd[] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
   snprintf(day, sizeof day, "%s %d/%d", wd[(ct.tm_wday % 7 + 7) % 7], ct.tm_mon + 1, ct.tm_mday);
   text(clk, -34, W - 48, 24, th.ink, 2);
   text(day, 18, W - 48, 68, th.mute, 2);
}
struct Hint {
   std::string b, t;
};
static void hints(const std::vector<Hint> &hs) {
   const Theme &th = T();
   float x = W - 48;
   for (int i = (int)hs.size() - 1; i >= 0; i--) {
      int tw = text(hs[i].t, 19, x, H - 46, th.mute, 2);
      x -= tw + 8;
      circle(x - 13, H - 34, 14, th.ink);
      text(hs[i].b, -17, x - 13, H - 46, th.bgTop, 1);
      x -= 44;
   }
   text("CosmoU " COSMOU_VERSION " for Wii U", 16, 48, H - 42, alpha(th.mute, 0.8f));
}
static void footer() {
   hints({{"A", "Start"}, {"Y", view ? "Covers" : "Grid"}, {"X", "Theme"}, {"+", "Shop"}, {"-", musicOn ? "Music off" : "Music on"}});
}
static void coversView(float t) {
   const Theme &th = T();
   int n = (int)games.size();
   float cy = 300;
   // farther covers first, the chosen one last (on top)
   std::vector<int> order;
   for (int i = 0; i < n; i++)
      if (std::fabs(i - coverPos) < 3.6f) order.push_back(i);
   std::sort(order.begin(), order.end(), [](int a, int b) { return std::fabs(a - coverPos) > std::fabs(b - coverPos); });
   for (int i : order) {
      float d = i - coverPos, ad = std::fabs(d);
      float s = 300 - std::min(ad, 2.f) * 70 - std::max(0.f, ad - 2) * 30;
      float x = 640 + (d < 0 ? -1 : 1) * (ad < 1 ? ad * 290 : 290 + (ad - 1) * 200) - s / 2;
      float a = std::max(0.f, 1 - std::max(0.f, ad - 1.2f) * 0.45f);
      bool on = i == sel && ad < 0.3f;
      float bob = on ? std::sin(t * 2.2f) * 3 : 0;
      drawIcon(games[i], x, cy - s / 2 + bob, s, a, on);
   }
   if (sel < n) {
      const Game &g = games[sel];
      text(g.name, -36, 640, 478, th.ink, 1, 980);
      char meta[64];
      snprintf(meta, sizeof meta, "Wii U · %s", deviceName(g.device).c_str());
      int mw = 0, mh = 0;
      TTF_SizeUTF8(font(18), meta, &mw, &mh);
      fillRound(640 - mw / 2.f - 14, 530, mw + 28, 32, 16, th.card);
      ringRound(640 - mw / 2.f - 14, 530, mw + 28, 32, 16, 1.5f, th.line);
      text(meta, 18, 640, 535, th.mute, 1);
      // Play: the strongest button
      playBtn = {640 - 95, 580, 190, 58};
      shadow(playBtn.x, playBtn.y, playBtn.w, playBtn.h, 29, 10, 60);
      fillRound(playBtn.x, playBtn.y, playBtn.w, playBtn.h, 29, th.accent);
      text("Play", -26, 640, playBtn.y + 13, th.onAccent, 1);
   }
}
static const int GCOLS = 5;
static const float GS = 168, GX0 = 104, GY0 = 140, GDX = 222, GDY = 236;
static void gridView() {
   const Theme &th = T();
   int n = (int)games.size();
   // keep the chosen row on screen
   int row = sel / GCOLS;
   float want = std::max(0.f, row * GDY - GDY * 0.9f);
   gridScroll += (want - gridScroll) * 0.2f;
   SDL_Rect clip = {0, 110, W, H - 110 - 70};
   SDL_RenderSetClipRect(R, &clip);
   for (int i = 0; i < n; i++) {
      float x = GX0 + (i % GCOLS) * GDX, y = GY0 + (i / GCOLS) * GDY - gridScroll;
      if (y > H || y + GDY < 100) continue;
      bool on = i == sel;
      drawIcon(games[i], x, y, GS, 1.f, on);
      text(games[i].name, on ? -18 : 18, x + GS / 2, y + GS + 14, on ? th.ink : th.mute, 1, (int)GDX - 20);
   }
   SDL_RenderSetClipRect(R, nullptr);
}
static void emptyState() {
   const Theme &th = T();
   shadow(340, 220, 600, 250, 30, 18, 50);
   fillRound(340, 220, 600, 250, 30, th.card);
   ringRound(340, 220, 600, 250, 30, 1.5f, th.line);
   circle(640, 280, 30, alpha(th.accent, 0.18f));
   text("?", -32, 640, 262, th.accent, 1);
   text("No games found", -30, 640, 326, th.ink, 1);
   text("Install Wii U games to the system memory or a USB drive,", 19, 640, 374, th.mute, 1);
   text("or put in a disc – they show up here.", 19, 640, 402, th.mute, 1);
}
static void launchOverlay(float t) {
   const Theme &th = T();
   SDL_SetRenderDrawColor(R, th.bgTop.r, th.bgTop.g, th.bgTop.b, 215);
   SDL_RenderFillRect(R, nullptr);
   for (auto &g : games)
      if (g.name == launching) drawIcon(g, 640 - 110, 180, 220, 1.f, false);
   text("Starting", 22, 640, 432, th.mute, 1);
   text(launching, -34, 640, 464, th.ink, 1, 980);
   for (int i = 0; i < 3; i++) circle(612 + i * 28, 540, 7, alpha(th.accent, 0.35f + 0.65f * (0.5f + 0.5f * std::sin(t * 6 - i))));
}

// ---------------------------------------------------------------- the shop's screen (shop.cpp does the downloads)
// A list on the left (emulators, apps, themes or fonts), the chosen one on the right with its button.
// Downloads run on their own thread, so the screen keeps moving; the list is shared under a lock.
enum { TabEmu, TabApps, TabThemes, TabFonts, NTABS };
static const char *TAB_NAMES[NTABS] = {"Emulators", "Apps", "Themes", "Fonts"};
static int shopTab = 0, shopSel = 0, confirmRemove = -2;
static float shopScroll = 0;
static SDL_FRect tabBtn[NTABS], actBtn, rmBtn;
static bool actOn = false, rmOn = false;

struct Job {
   int type; // 0 = load the catalogs, 1 = install, 2 = remove
   std::string id;
};
static SDL_mutex *shopMx = nullptr;
static std::vector<Job> jobs;
static std::vector<shop::Item> items;
static int catalogState = 0; // 0 not yet, 1 loading, 2 ready, 3 failed
static std::string catalogErr, busyId;
static int busyType = 0;
static std::atomic<float> busyProg{0};
static std::map<std::string, std::string> msgs; // id → what happened: "installed", "removed", or "!" + the error
static std::map<std::string, std::string> iconData;
static std::set<std::string> iconTried, changedPacks;
static std::vector<std::string> iconWant;
static std::map<std::string, SDL_Texture *> iconTex;
static bool shopQuit = false;
struct Lock {
   Lock() { SDL_LockMutex(shopMx); }
   ~Lock() { SDL_UnlockMutex(shopMx); }
};

static std::string slurp(const std::string &p) {
   std::string s;
   FILE *f = fopen(p.c_str(), "rb");
   if (!f) return s;
   char b[8192];
   size_t n;
   while ((n = fread(b, 1, sizeof b, f)) > 0) s.append(b, n);
   fclose(f);
   return s;
}
static int shopWorker(void *) {
   while (true) {
      Job j{-1, ""};
      std::string iconId, iconUrl;
      {
         Lock l;
         if (shopQuit) return 0;
         if (!jobs.empty()) {
            j = jobs.front();
            jobs.erase(jobs.begin());
            busyId = j.id;
            busyType = j.type;
            busyProg = 0;
            if (j.type == 0) catalogState = 1;
         } else
            for (auto &id : iconWant)
               if (!iconTried.count(id)) {
                  iconTried.insert(id);
                  for (auto &it : items)
                     if (it.id == id) iconUrl = it.iconUrl;
                  iconId = id;
                  break;
               }
      }
      if (j.type == 0) {
         std::vector<shop::Item> got;
         std::string err;
         bool ok = shop::loadCatalog(got, err);
         Lock l;
         if (ok) items = got;
         catalogErr = err;
         catalogState = ok ? 2 : 3;
         busyId.clear();
         tlog("shop catalog %s items %d err '%s'\n", ok ? "ok" : "failed", (int)items.size(), err.c_str());
      } else if (j.type == 1 || j.type == 2) {
         shop::Item copy;
         bool found = false;
         {
            Lock l;
            for (auto &it : items)
               if (it.id == j.id) copy = it, found = true;
         }
         std::string err;
         bool ok = found && (j.type == 1 ? shop::install(copy, err, [](float f) { busyProg = f; }) : shop::remove(copy, err));
         Lock l;
         for (auto &it : items)
            if (it.id == j.id) it.installed = copy.installed;
         msgs[j.id] = ok ? (j.type == 1 ? "installed" : "removed") : "!" + err;
         if (ok && (copy.kind == shop::ThemePack || copy.kind == shop::FontPack)) changedPacks.insert(j.id);
         busyId.clear();
         tlog("shop %s %s %s '%s' installed '%s'\n", j.type == 1 ? "install" : "remove", j.id.c_str(), ok ? "ok" : "failed", err.c_str(), copy.installed.c_str());
      } else if (!iconId.empty()) {
         // icons: from the SD card when they were loaded before
         std::string path = shop::cacheDir() + "icons/" + iconId + ".png", data = slurp(path), err;
         if (data.empty() && !iconUrl.empty() && shop::get(iconUrl, data, err)) {
            shop::mkdirs(shop::cacheDir() + "icons/");
            if (FILE *f = fopen(path.c_str(), "wb")) {
               fwrite(data.data(), 1, data.size(), f);
               fclose(f);
            }
         }
         if (!data.empty()) {
            Lock l;
            iconData[iconId] = data;
         }
      } else SDL_Delay(50);
   }
}
static void shopJob(int type, const std::string &id) {
   Lock l;
   for (auto &j : jobs)
      if (j.type == type && j.id == id) return;
   jobs.push_back({type, id});
}
static void openShop() {
   if (!shopMx) {
      shopMx = SDL_CreateMutex();
      // TLS needs a big stack
      SDL_Thread *th = SDL_CreateThreadWithStackSize(shopWorker, "shop", 512 * 1024, nullptr);
      if (th) SDL_DetachThread(th);
   }
   if (catalogState == 0 || catalogState == 3) shopJob(0, "");
   shopOpen = true;
   confirmRemove = -2;
   play(sOpen);
   tlog("shop open\n");
}
static void closeShop() {
   shopOpen = false;
   play(sBack);
}

// rows of the current tab: indexes into items; -1 = the Wii U's own font (in Fonts)
static std::vector<int> rowsOf(int tab) {
   std::vector<int> r;
   if (tab == TabFonts) r.push_back(-1);
   shop::Kind k = tab == TabEmu ? shop::Emulator : tab == TabApps ? shop::App : tab == TabThemes ? shop::ThemePack : shop::FontPack;
   for (int i = 0; i < (int)items.size(); i++)
      if (items[i].kind == k) r.push_back(i);
   return r;
}
static bool usingPack(const shop::Item &it) {
   return (it.kind == shop::ThemePack && T().id == it.id) || (it.kind == shop::FontPack && fontId == it.id);
}
static void useTheme(const std::string &id) {
   loadThemes();
   for (int i = 0; i < NTHEMES; i++)
      if (THEMES[i].id == id) themeIx = i;
   startMusic();
   saveCfg();
   tlog("theme now %s\n", T().id.c_str());
}
static void useFont(const std::string &id) {
   fontId = id;
   saveCfg();
   tlog("font now %s\n", fontId.c_str());
}
// themes and fonts that were just installed or removed (called every frame, on the main thread)
static void applyPackChanges() {
   if (!shopMx) return;
   std::set<std::string> ch;
   {
      Lock l;
      ch.swap(changedPacks);
   }
   if (ch.empty()) return;
   std::string before = T().id;
   loadThemes();
   if (T().id != before) startMusic(); // its theme was removed
   if (fontId != "system" && !shop::exists(shop::fontDir(fontId) + "regular.ttf")) fontId = "system";
   saveCfg();
}

// what A does on this row: 0 nothing, 1 install, 2 use
static int primaryOf(int row, std::string &label) {
   if (row == -1) {
      label = fontId == "system" ? "Using" : "Use";
      return fontId == "system" ? 0 : 2;
   }
   const shop::Item &it = items[row];
   if (busyId == it.id) return label = busyType == 2 ? "Removing" : "Installing", 0;
   for (auto &j : jobs)
      if (j.id == it.id) return label = "Waiting", 0;
   if (it.installed.empty()) return label = "Install", 1;
   if (it.hasUpdate()) return label = "Update", 1;
   if (it.kind == shop::ThemePack || it.kind == shop::FontPack) return usingPack(it) ? (label = "Using", 0) : (label = "Use", 2);
   return label = "Installed", 0;
}
static void shopPrimary() {
   Lock l;
   std::vector<int> rows = rowsOf(shopTab);
   if (rows.empty()) {
      if (catalogState == 3) {
         SDL_UnlockMutex(shopMx);
         shopJob(0, "");
         SDL_LockMutex(shopMx);
      }
      return;
   }
   int row = rows[std::min(shopSel, (int)rows.size() - 1)];
   std::string label;
   int what = primaryOf(row, label);
   confirmRemove = -2;
   if (what == 1) {
      jobs.push_back({1, items[row].id});
      msgs.erase(items[row].id);
      play(sStart);
   } else if (what == 2) {
      std::string id = row == -1 ? "system" : items[row].id;
      bool theme = row != -1 && items[row].kind == shop::ThemePack;
      SDL_UnlockMutex(shopMx);
      if (theme) useTheme(id);
      else useFont(id);
      play(sOpen);
      SDL_LockMutex(shopMx);
   }
}
static void shopRemove() {
   Lock l;
   std::vector<int> rows = rowsOf(shopTab);
   if (rows.empty()) return;
   int row = rows[std::min(shopSel, (int)rows.size() - 1)];
   if (row < 0 || items[row].installed.empty() || busyId == items[row].id) return;
   // the first press asks, the second removes
   if (confirmRemove != row) {
      confirmRemove = row;
      play(sMove);
      return;
   }
   confirmRemove = -2;
   jobs.push_back({2, items[row].id});
   msgs.erase(items[row].id);
   play(sBack);
}
static void shopMove(int d) {
   int n;
   {
      Lock l;
      n = (int)rowsOf(shopTab).size();
   }
   int s = std::max(0, std::min(n - 1, shopSel + d));
   if (s != shopSel) {
      shopSel = s;
      confirmRemove = -2;
      play(sMove);
   }
}
static void shopTabGo(int t) {
   t = (t % NTABS + NTABS) % NTABS;
   if (t == shopTab) return;
   shopTab = t;
   shopSel = 0;
   shopScroll = 0;
   confirmRemove = -2;
   play(sOpen);
}

// ---- drawing
static std::vector<std::string> wrap(const std::string &s, int size, int maxW, size_t maxLines) {
   static std::map<std::string, std::vector<std::string>> cache;
   std::string key = std::to_string(size) + "|" + std::to_string(maxW) + "|" + fontId + "|" + s;
   auto c = cache.find(key);
   if (c != cache.end()) return c->second;
   if (cache.size() > 60) cache.clear();
   std::vector<std::string> out;
   TTF_Font *f = font(size);
   std::string line, word;
   auto fits = [&](const std::string &t) {
      int w = 0, h = 0;
      if (f) TTF_SizeUTF8(f, t.c_str(), &w, &h);
      return w <= maxW;
   };
   auto flushWord = [&]() {
      if (word.empty()) return;
      std::string tryL = line.empty() ? word : line + " " + word;
      if (fits(tryL) || line.empty()) line = tryL;
      else {
         out.push_back(line);
         line = word;
      }
      word.clear();
   };
   for (char ch : s + "\n") {
      if (ch == ' ' || ch == '\t') flushWord();
      else if (ch == '\n') {
         flushWord();
         if (!line.empty()) out.push_back(line);
         line.clear();
      } else if (ch != '\r') word += ch;
   }
   if (out.size() > maxLines) {
      out.resize(maxLines);
      out.back() += " …";
   }
   cache[key] = out;
   return out;
}
static std::string sizeText(long kb) {
   char b[32];
   if (kb <= 0) return "";
   if (kb >= 1000) snprintf(b, sizeof b, "%.1f MB", kb / 1000.0);
   else snprintf(b, sizeof b, "%ld KB", kb);
   return b;
}
static SDL_Color tintFor(const std::string &name) { return tintOf(nullptr, name); }
// a picture for a row: the app's icon, a theme's colours, or "Aa" in a font
static void itemIcon(int row, float x, float y, float s) {
   const Theme &th = T();
   float r = s * 0.2f;
   if (row == -1) {
      fillRound(x, y, s, s, r, th.card);
      ringRound(x, y, s, s, r, 1.5f, th.line);
      const char *keep = drawFont;
      drawFont = "system";
      text("Aa", -(int)(s * 0.4f), x + s / 2, y + s * 0.22f, th.ink, 1);
      drawFont = keep;
      return;
   }
   const shop::Item &it = items[row];
   if (it.kind == shop::ThemePack) {
      SDL_Color bg = hexColor(it.colors.size() > 0 ? it.colors[0] : "", th.card), ac = hexColor(it.colors.size() > 1 ? it.colors[1] : "", th.accent),
                ink = hexColor(it.colors.size() > 2 ? it.colors[2] : "", th.ink), cd = hexColor(it.colors.size() > 3 ? it.colors[3] : "", th.card);
      fillRound(x, y, s, s, r, bg);
      ringRound(x, y, s, s, r, 1.5f, alpha(th.line, 0.8f));
      fillRound(x + s * 0.16f, y + s * 0.2f, s * 0.68f, s * 0.36f, s * 0.08f, cd);
      fillRound(x + s * 0.24f, y + s * 0.3f, s * 0.36f, s * 0.07f, s * 0.035f, ink);
      fillRound(x + s * 0.16f, y + s * 0.64f, s * 0.68f, s * 0.16f, s * 0.08f, ac);
      return;
   }
   if (it.kind == shop::FontPack) {
      fillRound(x, y, s, s, r, th.card);
      ringRound(x, y, s, s, r, 1.5f, th.line);
      const char *keep = drawFont;
      if (!it.installed.empty()) drawFont = it.id.c_str();
      text("Aa", -(int)(s * 0.4f), x + s / 2, y + s * 0.22f, th.ink, 1);
      drawFont = keep;
      return;
   }
   auto t = iconTex.find(it.id);
   if (t != iconTex.end() && t->second) {
      fillRound(x - 2, y - 2, s + 4, s + 4, r + 2, {255, 255, 255, 255});
      SDL_FRect d = {x, y, s, s};
      SDL_RenderCopyF(R, t->second, nullptr, &d);
      return;
   }
   SDL_Color c = tintFor(it.title);
   fillRound(x, y, s, s, r, c);
   std::string ini;
   for (char ch : it.title)
      if (isalnum((unsigned char)ch) && ini.size() < 2) ini += (char)toupper(ch);
   text(ini, -(int)(s * 0.34f), x + s / 2, y + s * 0.26f, {255, 255, 255, 255}, 1);
}
static void pill(const std::string &s, float x, float y, SDL_Color bg, SDL_Color fg, int align = 2) {
   int w = 0, h = 0;
   TTF_SizeUTF8(font(-15), s.c_str(), &w, &h);
   float px = align == 2 ? x - w - 20 : x;
   fillRound(px, y, w + 20, 28, 14, bg);
   text(s, -15, px + 10, y + 4, fg);
}
static const float LX = 48, LY = 176, LW = 660, LH = H - 88 - 176, RH = 84;
static const float DX = 728, DW = W - 48 - 728;
static void shopView(float t) {
   const Theme &th = T();
   // tabs
   float tw = 168, tx = (W - tw * NTABS) / 2, ty = 108, thh = 48;
   fillRound(tx - 6, ty - 6, tw * NTABS + 12, thh + 12, (thh + 12) / 2, th.card);
   ringRound(tx - 6, ty - 6, tw * NTABS + 12, thh + 12, (thh + 12) / 2, 1.5f, th.line);
   for (int i = 0; i < NTABS; i++) {
      tabBtn[i] = {tx + i * tw, ty, tw, thh};
      if (i == shopTab) fillRound(tabBtn[i].x, ty, tw, thh, thh / 2, th.accent);
      text(TAB_NAMES[i], -21, tabBtn[i].x + tw / 2, ty + 11, i == shopTab ? th.onAccent : th.ink, 1);
   }
   actOn = rmOn = false;
   Lock l;
   // new icons → pictures (on this thread, it owns the renderer)
   for (auto &d : iconData) {
      SDL_RWops *rw = SDL_RWFromConstMem(d.second.data(), (int)d.second.size());
      SDL_Surface *s = rw ? IMG_Load_RW(rw, 1) : nullptr;
      SDL_Texture *tex = nullptr;
      if (s && s->w > 0 && s->h > 0) {
         // icons come in all sizes and formats: one small RGBA picture each
         SDL_Surface *small = SDL_CreateRGBSurfaceWithFormat(0, 128, 128, 32, SDL_PIXELFORMAT_RGBA32);
         SDL_Surface *conv = SDL_ConvertSurfaceFormat(s, SDL_PIXELFORMAT_RGBA32, 0);
         if (small && conv) {
            SDL_SetSurfaceBlendMode(conv, SDL_BLENDMODE_NONE);
            SDL_Rect dst = {0, 0, 128, 128};
            SDL_BlitScaled(conv, nullptr, small, &dst);
            tex = SDL_CreateTextureFromSurface(R, small);
         }
         if (small) SDL_FreeSurface(small);
         if (conv) SDL_FreeSurface(conv);
      }
      if (s) SDL_FreeSurface(s);
      tlog("icon %s %d bytes %s\n", d.first.c_str(), (int)d.second.size(), tex ? "ok" : "none");
      iconTex[d.first] = tex;
   }
   iconData.clear();
   std::vector<int> rows = rowsOf(shopTab);
   if (rows.empty() || (shopTab != TabFonts && items.empty())) {
      shadow(340, 250, 600, 260, 30, 18, 50);
      fillRound(340, 250, 600, 260, 30, th.card);
      ringRound(340, 250, 600, 260, 30, 1.5f, th.line);
      if (catalogState == 3) {
         text("Can't reach the shop", -30, 640, 300, th.ink, 1);
         text(catalogErr.empty() ? "No internet connection" : catalogErr, 19, 640, 348, th.mute, 1, 540);
         text("Check the internet settings of your Wii U.", 19, 640, 378, th.mute, 1);
         actBtn = {640 - 100, 426, 200, 54};
         actOn = true;
         fillRound(actBtn.x, actBtn.y, actBtn.w, actBtn.h, 27, th.accent);
         text("Try again", -22, 640, actBtn.y + 13, th.onAccent, 1);
      } else {
         text("Loading the shop", -30, 640, 318, th.ink, 1);
         text("Emulators and apps from the Homebrew App Store, themes and fonts from CosmoU", 18, 640, 366, th.mute, 1, 560);
         for (int i = 0; i < 3; i++) circle(612 + i * 28, 440, 7, alpha(th.accent, 0.35f + 0.65f * (0.5f + 0.5f * std::sin(t * 6 - i))));
      }
      return;
   }
   shopSel = std::max(0, std::min(shopSel, (int)rows.size() - 1));
   // ---- the list
   float want = std::max(0.f, std::min(shopSel * RH - (LH - RH) / 2, rows.size() * RH - LH));
   shopScroll += (want - shopScroll) * 0.22f;
   SDL_Rect clip = {(int)LX - 20, (int)LY - 6, (int)LW + 40, (int)LH + 12};
   SDL_RenderSetClipRect(R, &clip);
   iconWant.clear();
   for (int i = 0; i < (int)rows.size(); i++) {
      float y = LY + i * RH - shopScroll;
      if (y + RH < LY - 10 || y > LY + LH + 10) continue;
      int row = rows[i];
      bool on = i == shopSel;
      if (row >= 0 && items[row].kind <= shop::App) iconWant.push_back(items[row].id);
      if (on) {
         fillRound(LX, y + 4, LW, RH - 8, 20, th.card);
         ringRound(LX, y + 4, LW, RH - 8, 20, 3, th.accent);
      } else if (i % 2 == 0) fillRound(LX, y + 4, LW, RH - 8, 20, alpha(th.card, 0.45f));
      itemIcon(row, LX + 14, y + 13, 58);
      std::string title = row == -1 ? "Wii U font" : items[row].title, sub;
      if (row == -1) sub = "The Wii U's own letters";
      else {
         const shop::Item &it = items[row];
         sub = !it.note.empty() ? it.note : it.desc;
      }
      // the status on the right
      std::string st;
      SDL_Color sb = alpha(th.accent, 0.16f), sf = th.accent;
      if (row >= 0) {
         const shop::Item &it = items[row];
         if (busyId == it.id) {
            char b[16];
            snprintf(b, sizeof b, "%d %%", (int)(busyProg * 100));
            st = busyType == 2 ? "Removing" : b;
         } else if (it.hasUpdate()) st = "Update";
         else if (usingPack(it)) st = "In use", sb = th.accent, sf = th.onAccent;
         else if (!it.installed.empty()) st = "Installed";
         else if (it.featured) st = "Recommended", sb = th.accent, sf = th.onAccent;
         else if (it.legacy) st = "HBL", sb = alpha(th.mute, 0.18f), sf = th.mute;
      } else if (fontId == "system") st = "In use", sb = th.accent, sf = th.onAccent;
      int stw = 0;
      if (!st.empty()) {
         int w = 0, h = 0;
         TTF_SizeUTF8(font(-15), st.c_str(), &w, &h);
         stw = w + 28;
         pill(st, LX + LW - 18, y + 28, sb, sf);
      }
      text(title, -22, LX + 88, y + 14, th.ink, 0, (int)(LW - 110 - stw));
      text(sub, 17, LX + 88, y + 44, th.mute, 0, (int)(LW - 110 - stw));
   }
   SDL_RenderSetClipRect(R, nullptr);
   // a thin scroll bar
   if (rows.size() * RH > LH) {
      float total = rows.size() * RH, bh = std::max(40.f, LH * LH / total), by = LY + (LH - bh) * (shopScroll / (total - LH));
      fillRound(LX + LW + 10, by, 5, bh, 2.5f, alpha(th.mute, 0.5f));
   }

   // ---- the chosen one
   int row = rows[shopSel];
   float y = LY, ph = LH;
   shadow(DX, y, DW, ph, 26, 14, 40);
   fillRound(DX, y, DW, ph, 26, th.card);
   ringRound(DX, y, DW, ph, 26, 1.5f, th.line);
   float px = DX + 28, pw = DW - 56, cy = y + 26;
   const shop::Item *it = row >= 0 ? &items[row] : nullptr;
   if (it && it->kind == shop::ThemePack) {
      // a little picture of the theme
      SDL_Color bg = hexColor(it->colors.size() > 0 ? it->colors[0] : "", th.card), ac = hexColor(it->colors.size() > 1 ? it->colors[1] : "", th.accent),
                ink = hexColor(it->colors.size() > 2 ? it->colors[2] : "", th.ink), cd = hexColor(it->colors.size() > 3 ? it->colors[3] : "", th.card);
      fillRound(px, cy, pw, 132, 18, bg);
      ringRound(px, cy, pw, 132, 18, 1.5f, th.line);
      for (int k = 0; k < 4; k++) fillRound(px + 26 + k * 82, cy + 22, 66, 66, 12, k == 1 ? ac : cd);
      ringRound(px + 26 + 82 - 6, cy + 16, 78, 78, 16, 3, ac);
      fillRound(px + 26, cy + 102, 150, 10, 5, ink);
      fillRound(px + pw - 116, cy + 96, 90, 24, 12, ac);
      cy += 150;
   } else if (row == -1 || (it && it->kind == shop::FontPack)) {
      fillRound(px, cy, pw, 132, 18, alpha(th.bgTop, 0.9f));
      ringRound(px, cy, pw, 132, 18, 1.5f, th.line);
      const char *keep = drawFont;
      drawFont = row == -1 ? "system" : !it->installed.empty() ? it->id.c_str() : nullptr;
      if (drawFont) {
         text("Mario Kart 8", -34, px + 22, cy + 20, th.ink, 0, (int)pw - 44);
         text("The quick brown fox jumps over the lazy dog", 19, px + 22, cy + 76, th.mute, 0, (int)pw - 44);
      } else {
         text("Install it to see the letters", 19, px + pw / 2, cy + 52, th.mute, 1);
      }
      drawFont = keep;
      cy += 150;
   } else if (it) {
      itemIcon(row, px, cy, 96);
      text(it->title, -30, px + 116, cy + 6, th.ink, 0, (int)pw - 116);
      std::string by = it->author.empty() ? "" : "by " + it->author;
      text(by, 18, px + 116, cy + 48, th.mute, 0, (int)pw - 116);
      cy += 116;
   }
   if (row == -1 || (it && it->kind >= shop::ThemePack)) {
      text(row == -1 ? "Wii U font" : it->title, -28, px, cy, th.ink, 0, (int)pw);
      cy += 42;
   }
   // version, size, where it comes from
   std::string meta;
   if (it) {
      if (!it->version.empty() && it->kind <= shop::App) meta = "Version " + it->version;
      std::string sz = sizeText(it->sizeKB);
      if (!sz.empty()) meta += (meta.empty() ? "" : " · ") + sz;
      if (!it->installed.empty() && it->installed != "?" && it->hasUpdate()) meta += " · you have " + it->installed;
   } else meta = "Built into the Wii U";
   text(meta, 17, px, cy, th.mute, 0, (int)pw);
   cy += 30;
   if (it && !it->note.empty()) {
      for (auto &ln : wrap(it->note, -18, (int)pw, 2)) text(ln, -18, px, cy, th.accent, 0, (int)pw), cy += 26;
      cy += 4;
   }
   std::string body = it ? (it->details.empty() ? it->desc : it->desc + "\n" + it->details) : "Uses the letters of the Wii U Menu.";
   if (it && it->kind == shop::Emulator) body = it->desc + "\nOnly the emulator: bring your own games.";
   if (it && it->kind <= shop::App && it->kind != shop::Emulator) body = it->desc + (it->details.empty() ? "" : "\n" + it->details);
   float bottom = y + ph - 96;
   size_t maxL = (size_t)std::max(1.f, (bottom - cy - 34) / 25);
   for (auto &ln : wrap(body, 18, (int)pw, maxL)) {
      text(ln, 18, px, cy, th.ink, 0, (int)pw);
      cy += 25;
   }
   // what happened, or how far the download is
   std::string msg;
   SDL_Color mc = th.mute;
   if (it) {
      auto m = msgs.find(it->id);
      if (m != msgs.end()) {
         if (m->second[0] == '!') msg = m->second.substr(1), mc = {214, 64, 64, 255};
         else if (m->second == "removed") msg = "Removed";
         else if (it->kind == shop::ThemePack) msg = "Installed. Press A to use it (or X in the library).";
         else if (it->kind == shop::FontPack) msg = "Installed. Press A to use it.";
         else if (it->legacy) msg = "Installed. Start it from the Homebrew Launcher.";
         else msg = "Installed. It's on the Wii U Menu after you go back to it.";
      }
      if (it->legacy && msg.empty()) msg = "An older app: it starts from the Homebrew Launcher.";
      if (busyId == it->id) {
         float pr = busyProg;
         fillRound(px, bottom - 30, pw, 12, 6, alpha(th.mute, 0.25f));
         fillRound(px, bottom - 30, std::max(12.f, pw * pr), 12, 6, th.accent);
         char b[48];
         snprintf(b, sizeof b, "%s %d %%", busyType == 2 ? "Removing" : pr < 0.8f && it->kind <= shop::App ? "Downloading" : "Installing", (int)(pr * 100));
         msg = b;
         mc = th.mute;
      }
   }
   if (!msg.empty()) text(msg, 17, px, bottom - 6, mc, 0, (int)pw);
   // buttons
   std::string label;
   int what = primaryOf(row, label);
   actBtn = {px, y + ph - 76, 200, 54};
   actOn = what != 0;
   fillRound(actBtn.x, actBtn.y, actBtn.w, actBtn.h, 27, actOn ? th.accent : alpha(th.mute, 0.2f));
   text(label, -22, actBtn.x + 100, actBtn.y + 13, actOn ? th.onAccent : th.mute, 1);
   if (it && !it->installed.empty() && busyId != it->id) {
      bool ask = confirmRemove == row;
      rmBtn = {px + 216, y + ph - 76, ask ? 250.f : 160.f, 54};
      rmOn = true;
      fillRound(rmBtn.x, rmBtn.y, rmBtn.w, rmBtn.h, 27, ask ? SDL_Color{214, 64, 64, 255} : th.card);
      ringRound(rmBtn.x, rmBtn.y, rmBtn.w, rmBtn.h, 27, 1.5f, ask ? SDL_Color{214, 64, 64, 255} : th.line);
      text(ask ? "Remove? Press again" : "Remove", -20, rmBtn.x + rmBtn.w / 2, rmBtn.y + 14, ask ? SDL_Color{255, 255, 255, 255} : th.ink, 1);
   }
}
static void shopFooter() {
   std::string label = "Install";
   bool rm = false;
   if (shopMx) {
      Lock l;
      std::vector<int> rows = rowsOf(shopTab);
      if (!rows.empty()) {
         int row = rows[std::min(shopSel, (int)rows.size() - 1)];
         primaryOf(row, label);
         rm = row >= 0 && !items[row].installed.empty();
      } else if (catalogState == 3) label = "Try again";
   }
   std::vector<Hint> h = {{"A", label}};
   if (rm) h.push_back({"X", "Remove"});
   h.push_back({"L", "R  Tabs"});
   h.push_back({"B", "Back"});
   hints(h);
}
static bool inside(const SDL_FRect &r, float x, float y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
static void shopTap(float x, float y) {
   if (inside(shopBtn, x, y)) return closeShop();
   for (int i = 0; i < NTABS; i++)
      if (inside(tabBtn[i], x, y)) return shopTabGo(i);
   if (actOn && inside(actBtn, x, y)) return shopPrimary();
   if (rmOn && inside(rmBtn, x, y)) return shopRemove();
   if (x >= LX && x <= LX + LW && y >= LY && y <= LY + LH) {
      int i = (int)((y - LY + shopScroll) / RH);
      int n;
      {
         Lock l;
         n = (int)rowsOf(shopTab).size();
      }
      if (i >= 0 && i < n && i != shopSel) {
         shopSel = i;
         confirmRemove = -2;
         play(sMove);
      }
   }
}

// ---------------------------------------------------------------- actions
static void moveSel(int d) {
   int n = (int)games.size();
   if (!n) return;
   int s = std::max(0, std::min(n - 1, sel + d));
   if (s != sel) {
      sel = s;
      play(sMove);
   }
}
static void startGame() {
   if (games.empty() || !launching.empty()) return;
   Game &g = games[sel];
   g.played = ++playCounter;
   saveCfg();
   launching = g.name;
   launchAt = SDL_GetTicks();
   play(sStart);
   Mix_FadeOutMusic(600);
}
static void doLaunch() {
   Game *g = nullptr;
   for (auto &x : games)
      if (x.name == launching) g = &x;
   if (!g) return;
   // updates of the game are used when it starts, like from the Wii U Menu
   MCPTitleListType info;
   int32_t h = MCP_Open();
   if (h >= 0) {
      if (MCP_GetTitleInfo(h, g->tid, &info) == 0) ACPAssignTitlePatch(&info);
      MCP_Close(h);
   }
   tlog("launch %016llX %s\n", (unsigned long long)g->tid, g->name.c_str());
   audioClose();
   shop::cancel = true;
   leaving = true;
   leftAt = SDL_GetTicks();
   // like the Wii U Menu (and Aroma's own menu): straight into the game, without a second start screen
   _SYSLaunchTitleWithStdArgsInNoSplash(g->tid, nullptr);
}
static void setView(int v) {
   if (v == view) return;
   view = v;
   play(sOpen);
   saveCfg();
}
static void nextTheme() {
   themeIx = (themeIx + 1) % NTHEMES;
   play(sOpen);
   startMusic();
   saveCfg();
}
static void toggleMusic() {
   musicOn = !musicOn;
   play(sBack);
   if (musicOn) startMusic();
   else Mix_FadeOutMusic(400);
   saveCfg();
}
static void tap(float x, float y) {
   if (inside(shopBtn, x, y)) return openShop();
   for (int i = 0; i < 2; i++)
      if (x >= viewBtn[i].x && x <= viewBtn[i].x + viewBtn[i].w && y >= viewBtn[i].y && y <= viewBtn[i].y + viewBtn[i].h) return setView(i);
   if (games.empty()) return;
   if (view == 0) {
      if (x >= playBtn.x && x <= playBtn.x + playBtn.w && y >= playBtn.y && y <= playBtn.y + playBtn.h) return startGame();
      if (y > 130 && y < 470) {
         if (std::fabs(x - 640) < 150) return startGame();
         moveSel(x < 640 ? (x < 250 ? -2 : -1) : (x > 1030 ? 2 : 1));
      }
   } else {
      for (int i = 0; i < (int)games.size(); i++) {
         float gx = GX0 + (i % GCOLS) * GDX, gy = GY0 + (i / GCOLS) * GDY - gridScroll;
         if (x >= gx && x <= gx + GS && y >= gy && y <= gy + GS && y > 110) {
            if (i == sel) return startGame();
            sel = i;
            play(sMove);
            return;
         }
      }
   }
}

// ---------------------------------------------------------------- main
int main(int, char **) {
   if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_GAMECONTROLLER | SDL_INIT_JOYSTICK) < 0) return 1;
   SDL_Window *win = SDL_CreateWindow("CosmoU", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, W, H, 0);
   R = SDL_CreateRenderer(win, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
   if (!R) R = SDL_CreateRenderer(win, -1, 0);
   SDL_RenderSetLogicalSize(R, W, H);
   SDL_SetRenderDrawBlendMode(R, SDL_BLENDMODE_BLEND);
   IMG_Init(IMG_INIT_PNG);
   TTF_Init();
   OSGetSharedData(OS_SHAREDDATATYPE_FONT_STANDARD, 0, &sharedFont, &sharedFontSize);
   if (!sharedFontSize) sharedFont = nullptr;
   Mix_Init(MIX_INIT_OGG);
   ACPInitialize();
   FILE *probe = fopen(SD_TEST, "r");
   if (probe) {
      // the test can point the shop at another branch of CosmoU's GitHub ("shop=https://…/")
      char line[256];
      while (fgets(line, sizeof line, probe))
         if (!strncmp(line, "shop=", 5)) {
            std::string u = line + 5;
            while (!u.empty() && (u.back() == '\n' || u.back() == '\r')) u.pop_back();
            shop::cosmoBase = u;
         }
      fclose(probe);
      testMode = true;
      remove(SD_LOG);
   }
   shop::caFile = std::string(CONTENT) + "cacert.pem";
   shop::userAgent = "CosmoU-WiiU/" COSMOU_VERSION;
   loadThemes();

   logo = IMG_LoadTexture(R, (std::string(CONTENT) + "logo.png").c_str());
   // first frame while the games load
   gradient(0, 0, W, H, T().bgTop, T().bgBottom);
   SDL_RenderPresent(R);
   loadGames();
   loadCfg();
   if (fontId != "system" && !shop::exists(shop::fontDir(fontId) + "regular.ttf")) fontId = "system";
   sortGames();
   audioOpen();
   tlog("font %s\naudio %d\ngames %d\nthemes %d\n", sharedFont ? "system" : "bundled", audioReady ? 1 : 0, (int)games.size(), NTHEMES);
   for (auto &g : games) tlog("game %016llX %s icon=%d\n", (unsigned long long)g.tid, g.name.c_str(), g.icon ? 1 : 0);

   bool run = true;
   Uint32 start = SDL_GetTicks(), lastAxis = 0, demoStep = 0, lastStep = SDL_GetTicks();
   int axisDir = 0;
   float fx0 = -1, fy0 = -1;
   while (run) {
      SDL_Event e;
      while (SDL_PollEvent(&e)) {
         switch (e.type) {
         case SDL_QUIT:
            run = false;
            break;
         case SDL_CONTROLLERDEVICEADDED:
            SDL_GameControllerOpen(e.cdevice.which);
            break;
         case SDL_APP_WILLENTERBACKGROUND:
            audioClose();
            break;
         case SDL_APP_DIDENTERFOREGROUND:
            if (!leaving) audioOpen();
            break;
         case SDL_CONTROLLERBUTTONDOWN:
            if (!launching.empty()) break;
            if (shopOpen) {
               switch (e.cbutton.button) {
               case SDL_CONTROLLER_BUTTON_DPAD_UP: shopMove(-1); break;
               case SDL_CONTROLLER_BUTTON_DPAD_DOWN: shopMove(1); break;
               case SDL_CONTROLLER_BUTTON_DPAD_LEFT:
               case SDL_CONTROLLER_BUTTON_LEFTSHOULDER: shopTabGo(shopTab - 1); break;
               case SDL_CONTROLLER_BUTTON_DPAD_RIGHT:
               case SDL_CONTROLLER_BUTTON_RIGHTSHOULDER: shopTabGo(shopTab + 1); break;
               case SDL_CONTROLLER_BUTTON_A: shopPrimary(); break;
               case SDL_CONTROLLER_BUTTON_X: shopRemove(); break;
               case SDL_CONTROLLER_BUTTON_B:
               case SDL_CONTROLLER_BUTTON_START: closeShop(); break;
               case SDL_CONTROLLER_BUTTON_BACK: toggleMusic(); break;
               default: break;
               }
               break;
            }
            switch (e.cbutton.button) {
            case SDL_CONTROLLER_BUTTON_DPAD_LEFT: moveSel(-1); break;
            case SDL_CONTROLLER_BUTTON_DPAD_RIGHT: moveSel(1); break;
            case SDL_CONTROLLER_BUTTON_DPAD_UP: moveSel(view ? -GCOLS : -1); break;
            case SDL_CONTROLLER_BUTTON_DPAD_DOWN: moveSel(view ? GCOLS : 1); break;
            case SDL_CONTROLLER_BUTTON_LEFTSHOULDER: moveSel(view ? -GCOLS * 2 : -5); break;
            case SDL_CONTROLLER_BUTTON_RIGHTSHOULDER: moveSel(view ? GCOLS * 2 : 5); break;
            case SDL_CONTROLLER_BUTTON_A: startGame(); break;
            case SDL_CONTROLLER_BUTTON_Y: setView(view ? 0 : 1); break;
            case SDL_CONTROLLER_BUTTON_X: nextTheme(); break;
            case SDL_CONTROLLER_BUTTON_BACK: toggleMusic(); break;
            case SDL_CONTROLLER_BUTTON_START: openShop(); break;
            case SDL_CONTROLLER_BUTTON_B:
               if (view) setView(0);
               break;
            default: break;
            }
            break;
         case SDL_CONTROLLERAXISMOTION:
            if (e.caxis.axis == SDL_CONTROLLER_AXIS_LEFTX || e.caxis.axis == SDL_CONTROLLER_AXIS_LEFTY) {
               int v = e.caxis.value;
               int d = v > 16000 ? 1 : v < -16000 ? -1 : 0;
               if (shopOpen) {
                  // in the shop the stick goes up and down the list
                  if (e.caxis.axis == SDL_CONTROLLER_AXIS_LEFTX) break;
               } else if (e.caxis.axis == SDL_CONTROLLER_AXIS_LEFTY) d *= view ? GCOLS : 1;
               if (d != axisDir) {
                  axisDir = d;
                  lastAxis = SDL_GetTicks();
                  if (d && launching.empty()) shopOpen ? shopMove(d) : moveSel(d);
               }
            }
            break;
         case SDL_FINGERDOWN:
            fx0 = e.tfinger.x * W;
            fy0 = e.tfinger.y * H;
            break;
         case SDL_FINGERUP: {
            if (!launching.empty() || fx0 < 0) break;
            float fx = e.tfinger.x * W, fy = e.tfinger.y * H;
            if (shopOpen) {
               // a swipe up or down scrolls the list, a tap chooses
               if (std::fabs(fy - fy0) > 60 && fx0 < LX + LW + 30) shopMove(fy < fy0 ? 4 : -4);
               else if (std::fabs(fx - fx0) < 40 && std::fabs(fy - fy0) < 40) shopTap(fx, fy);
               fx0 = -1;
               break;
            }
            // a swipe in Covers moves; a tap chooses or starts
            if (view == 0 && std::fabs(fx - fx0) > 90 && std::fabs(fx - fx0) > std::fabs(fy - fy0)) moveSel(fx < fx0 ? 1 : -1);
            else if (view == 1 && std::fabs(fy - fy0) > 90) moveSel(fy < fy0 ? GCOLS * 2 : -GCOLS * 2);
            else tap(fx, fy);
            fx0 = -1;
            break;
         }
         default: break;
         }
      }
      Uint32 now = SDL_GetTicks();
      // holding the stick keeps moving
      if (axisDir && launching.empty() && now - lastAxis > 320) {
         shopOpen ? shopMove(axisDir) : moveSel(axisDir);
         lastAxis = now - 200;
      }
      // test mode (only when the test file is on the SD card): walks through the views and themes by itself
      // then opens the shop, installs and uses a theme and a font and installs an emulator (each step waits for the last)
      bool idle = true;
      if (shopMx) {
         Lock l;
         idle = busyId.empty() && jobs.empty() && catalogState != 1;
      }
      if (testMode && launching.empty() && idle && now - lastStep > 7000 && demoStep < 18) {
         lastStep = now;
         Uint32 step = ++demoStep;
         if (step == 1) moveSel(1);
         if (step == 2) setView(1);
         if (step == 3) nextTheme();
         if (step == 4) setView(0);
         if (step == 5) nextTheme();
         if (step == 6) nextTheme();
         if (step == 7) openShop();
         if (step == 8) shopMove(1);
         if (step == 9) shopTabGo(TabThemes);
         if (step == 10 || step == 11 || step == 13 || step == 14) shopPrimary();
         if (step == 12) shopTabGo(TabFonts), shopSel = 3;
         if (step == 15) shopTabGo(TabEmu), shopSel = 1, shopPrimary();
         if (step == 16) shopTabGo(TabApps);
         if (step == 17) closeShop();
         tlog("step %u view %d theme %s sel %d shop %d tab %d row %d font %s\n", (unsigned)step, view, T().id.c_str(), sel, shopOpen ? 1 : 0, shopTab, shopSel,
              fontId.c_str());
      }
      if (leaving) {
         // the system takes CosmoU off the screen when the game starts; still here after 10 seconds = it didn't start
         if (now - leftAt > 10000) {
            leaving = false;
            launching.clear();
            shop::cancel = false;
            audioOpen();
         } else {
            SDL_Delay(16);
            continue;
         }
      }
      float t = (now - start) / 1000.f;
      coverPos += (sel - coverPos) * 0.18f;

      applyPackChanges();
      background(t);
      header();
      if (shopOpen) {
         shopView(t);
         shopFooter();
      } else {
         if (games.empty()) emptyState();
         else if (view == 0) coversView(t);
         else gridView();
         footer();
      }
      if (!launching.empty()) {
         launchOverlay(t);
         if (launchAt && now - launchAt > 900) {
            launchAt = 0;
            doLaunch();
         }
      }
      SDL_RenderPresent(R);
   }

   // leave quickly: the system (or the game that is starting) is waiting. SDL_Quit hands the screen back.
   if (shopMx) {
      Lock l;
      shopQuit = true;
   }
   shop::cancel = true;
   saveCfg();
   audioClose();
   for (auto &f : fonts)
      if (f.second) TTF_CloseFont(f.second);
   ACPFinalize();
   SDL_Quit();
   return 0;
}

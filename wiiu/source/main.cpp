// CosmoU for Wii U – the CosmoU launcher as an app on the Wii U itself (Aroma, .wuhb).
// It shows the games installed on this Wii U (system memory, USB and disc) in CosmoU's look and starts them.
// Built once for CosmoU 0.13.0 and never updated: it has no update check and never connects to the internet.
//
// Controls: D-pad / left stick move · A starts · Y changes the view (Covers / Grid) · X changes the theme ·
// − turns the music on and off · L / R jump · touch: tap a game to choose it, tap it again (or Play) to start ·
// HOME opens the HOME Menu as usual.
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

#include <algorithm>
#include <cctype>
#include <initializer_list>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <map>
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
struct Theme {
   const char *id, *name, *music;
   SDL_Color bgTop, bgBottom, blob1, blob2, blob3, ink, mute, accent, onAccent, card, line;
   bool grid; // fine grid lines (Wii U)
};
static const Theme THEMES[] = {
   {"liquid-glass", "Liquid Glass", "liquid-glass.ogg", {236, 248, 250, 255}, {250, 244, 236, 255}, {143, 233, 242, 150}, {196, 184, 255, 120},
    {255, 216, 176, 130}, {8, 20, 31, 255}, {90, 110, 126, 255}, {18, 180, 204, 255}, {2, 38, 45, 255}, {255, 255, 255, 215}, {16, 50, 80, 40}, false},
   {"wii-u", "Wii U", "wii-u.ogg", {250, 251, 251, 255}, {233, 236, 238, 255}, {0, 0, 0, 0}, {0, 0, 0, 0}, {0, 0, 0, 0}, {40, 46, 54, 255},
    {110, 118, 128, 255}, {34, 168, 230, 255}, {255, 255, 255, 255}, {255, 255, 255, 255}, {207, 212, 217, 255}, true},
   {"switch", "Switch", "switch.ogg", {235, 235, 235, 255}, {235, 235, 235, 255}, {0, 0, 0, 0}, {0, 0, 0, 0}, {0, 0, 0, 0}, {45, 45, 45, 255},
    {120, 120, 120, 255}, {0, 195, 227, 255}, {255, 255, 255, 255}, {255, 255, 255, 255}, {210, 210, 210, 255}, false},
   {"night", "Night", "n64.ogg", {16, 41, 92, 255}, {4, 13, 36, 255}, {40, 80, 180, 70}, {120, 90, 220, 50}, {20, 120, 160, 40}, {238, 242, 255, 255},
    {170, 182, 214, 255}, {79, 124, 255, 255}, {255, 255, 255, 255}, {19, 37, 79, 235}, {43, 63, 114, 255}, false},
};
static const int NTHEMES = sizeof(THEMES) / sizeof(THEMES[0]);

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
static FILE *testLog = nullptr;

static const Theme &T() { return THEMES[themeIx]; }

// ---------------------------------------------------------------- settings on the SD card (theme, view, music, last played)
static void loadCfg() {
   FILE *f = fopen(SD_CFG, "r");
   if (!f) return;
   char line[256];
   while (fgets(line, sizeof line, f)) {
      char k[64], v[160];
      if (sscanf(line, "%63[^=]=%159[^\n]", k, v) != 2) continue;
      if (!strcmp(k, "theme")) {
         for (int i = 0; i < NTHEMES; i++)
            if (!strcmp(THEMES[i].id, v)) themeIx = i;
      } else if (!strcmp(k, "view")) view = atoi(v) ? 1 : 0;
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
   fprintf(f, "theme=%s\nview=%d\nmusic=%d\n", T().id, view, musicOn ? 1 : 0);
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
static std::map<int, TTF_Font *> fonts;
static void *sharedFont = nullptr;
static uint32_t sharedFontSize = 0;
static TTF_Font *font(int size) {
   auto it = fonts.find(size);
   if (it != fonts.end()) return it->second;
   TTF_Font *f = nullptr;
   bool bold = size < 0;
   int px = std::abs(size);
   if (sharedFont) {
      f = TTF_OpenFontRW(SDL_RWFromConstMem(sharedFont, (int)sharedFontSize), 1, px);
      if (f && bold) TTF_SetFontStyle(f, TTF_STYLE_BOLD);
   }
   if (!f) f = TTF_OpenFont((std::string(CONTENT) + (bold ? "fonts/bold.ttf" : "fonts/regular.ttf")).c_str(), px);
   fonts[size] = f;
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
   char key[64];
   snprintf(key, sizeof key, "%d|%02x%02x%02x|%d|", size, c.r, c.g, c.b, maxW);
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
   if (c) Mix_PlayChannel(-1, c, 0);
}
static void startMusic() {
   if (music) {
      Mix_HaltMusic();
      Mix_FreeMusic(music);
      music = nullptr;
   }
   if (!musicOn) return;
   music = Mix_LoadMUS((std::string(CONTENT) + "music/" + T().music).c_str());
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
   if (th.grid) {
      SDL_SetRenderDrawColor(R, 140, 152, 162, 30);
      for (int x = 0; x < W; x += 24) SDL_RenderDrawLine(R, x, 0, x, H);
      for (int y = 0; y < H; y += 24) SDL_RenderDrawLine(R, 0, y, W, y);
   }
   if (!strcmp(th.id, "night")) {
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
static SDL_FRect viewBtn[2], playBtn;
static void header() {
   const Theme &th = T();
   text("CosmoU", -40, 48, 26, th.ink);
   char sub[96];
   snprintf(sub, sizeof sub, "Wii U Library · %d %s", (int)games.size(), games.size() == 1 ? "game" : "games");
   text(sub, 19, 50, 74, th.accent);
   // Covers / Grid
   const char *lbl[2] = {"Covers", "Grid"};
   float x = 760, y = 30, h = 46;
   fillRound(x - 6, y - 6, 2 * 132 + 12, h + 12, (h + 12) / 2, th.card);
   ringRound(x - 6, y - 6, 2 * 132 + 12, h + 12, (h + 12) / 2, 1.5f, th.line);
   for (int i = 0; i < 2; i++) {
      viewBtn[i] = {x + i * 132, y, 132, h};
      if (i == view) fillRound(viewBtn[i].x, y, 132, h, h / 2, th.accent);
      text(lbl[i], -22, viewBtn[i].x + 66, y + 10, i == view ? th.onAccent : th.ink, 1);
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
static void footer() {
   const Theme &th = T();
   struct Hint {
      const char *b, *t;
   } hints[] = {{"A", "Start"}, {"Y", view ? "Covers" : "Grid"}, {"X", "Theme"}, {"-", musicOn ? "Music off" : "Music on"}};
   float x = W - 48;
   for (int i = 3; i >= 0; i--) {
      int tw = text(hints[i].t, 19, x, H - 46, th.mute, 2);
      x -= tw + 8;
      circle(x - 13, H - 34, 14, th.ink);
      text(hints[i].b, -17, x - 13, H - 46, th.bgTop, 1);
      x -= 44;
   }
   text("CosmoU " COSMOU_VERSION " for Wii U", 16, 48, H - 42, alpha(th.mute, 0.8f));
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
      if (MCP_GetTitleInfo(h, g->tid, &info) >= 0) ACPAssignTitlePatch(&info);
      MCP_Close(h);
   }
   if (testLog) {
      fprintf(testLog, "launch %016llX %s\n", (unsigned long long)g->tid, g->name.c_str());
      fflush(testLog);
   }
   SYSLaunchTitle(g->tid);
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
   bool audio = Mix_OpenAudio(48000, AUDIO_S16SYS, 2, 2048) == 0;
   if (audio) {
      Mix_Init(MIX_INIT_OGG);
      Mix_AllocateChannels(8);
      sMove = tone({1320.f}, 0.045f, 0.18f);
      sOpen = tone({880.f, 1320.f}, 0.06f, 0.2f);
      sBack = tone({990.f, 660.f}, 0.06f, 0.18f);
      sStart = tone({660.f, 990.f, 1320.f}, 0.08f, 0.22f);
   }
   ACPInitialize();
   FILE *probe = fopen(SD_TEST, "r");
   if (probe) {
      fclose(probe);
      testLog = fopen(SD_LOG, "w");
   }

   // first frame while the games load
   gradient(0, 0, W, H, T().bgTop, T().bgBottom);
   SDL_RenderPresent(R);
   loadGames();
   loadCfg();
   sortGames();
   if (testLog) {
      fprintf(testLog, "font %s\naudio %d\ngames %d\n", sharedFont ? "system" : "bundled", audio ? 1 : 0, (int)games.size());
      for (auto &g : games) fprintf(testLog, "game %016llX %s icon=%d\n", (unsigned long long)g.tid, g.name.c_str(), g.icon ? 1 : 0);
      fflush(testLog);
   }
   if (audio) startMusic();

   bool run = true;
   Uint32 start = SDL_GetTicks(), lastAxis = 0, demoStep = 0;
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
            Mix_PauseMusic();
            break;
         case SDL_APP_DIDENTERFOREGROUND:
            if (launching.empty()) Mix_ResumeMusic();
            break;
         case SDL_CONTROLLERBUTTONDOWN:
            if (!launching.empty()) break;
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
               if (e.caxis.axis == SDL_CONTROLLER_AXIS_LEFTY) d *= view ? GCOLS : 1;
               if (d != axisDir) {
                  axisDir = d;
                  lastAxis = SDL_GetTicks();
                  if (d && launching.empty()) moveSel(d);
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
         moveSel(axisDir);
         lastAxis = now - 200;
      }
      // test mode (only when the test file is on the SD card): walks through the views and themes by itself
      if (testLog && launching.empty()) {
         Uint32 step = (now - start) / 7000;
         if (step != demoStep) {
            demoStep = step;
            if (step == 1) moveSel(1);
            if (step == 2) setView(1);
            if (step == 3) nextTheme();
            if (step == 4) setView(0);
            if (step == 5) nextTheme();
            if (step == 6) nextTheme();
            fprintf(testLog, "step %u view %d theme %s sel %d\n", (unsigned)step, view, T().id, sel);
            fflush(testLog);
         }
      }
      float t = (now - start) / 1000.f;
      coverPos += (sel - coverPos) * 0.18f;

      background(t);
      header();
      if (games.empty()) emptyState();
      else if (view == 0) coversView(t);
      else gridView();
      footer();
      if (!launching.empty()) {
         launchOverlay(t);
         if (launchAt && now - launchAt > 900) {
            launchAt = 0;
            doLaunch();
         }
      }
      SDL_RenderPresent(R);
   }

   saveCfg();
   if (testLog) fclose(testLog);
   for (auto &g : games)
      if (g.icon) SDL_DestroyTexture(g.icon);
   for (auto &c : textCache) SDL_DestroyTexture(c.second.t);
   for (auto &f : fonts)
      if (f.second) TTF_CloseFont(f.second);
   if (music) Mix_FreeMusic(music);
   if (audio) Mix_CloseAudio();
   ACPFinalize();
   TTF_Quit();
   IMG_Quit();
   SDL_DestroyRenderer(R);
   SDL_DestroyWindow(win);
   SDL_Quit();
   return 0;
}

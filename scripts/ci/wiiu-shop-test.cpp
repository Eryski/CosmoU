// Test of the CosmoU for Wii U shop (wiiu/source/shop.cpp) on a PC: the real catalogs, real installs into a folder
// that stands in for the SD card, removing again, and what the recommended emulators bring.
// build: g++ -std=gnu++17 -I wiiu/source wiiu/source/shop.cpp scripts/ci/wiiu-shop-test.cpp -lcurl -lz
// usage: shop-test <out folder>     env: SHOP_ROOT (the "SD card"), HB_REPO, COSMO_BASE, SHOP_FULL=1 (RetroArch too)
#include "shop.hpp"

#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

static std::vector<std::string> results;
static int failed = 0;
static std::string esc(const std::string &s) {
   std::string o;
   for (char c : s) {
      if (c == '"' || c == '\\') o += '\\', o += c;
      else if (c == '\n') o += "\\n";
      else if ((unsigned char)c < 32) o += ' ';
      else o += c;
   }
   return o.substr(0, 1800);
}
static void ok(const std::string &name, bool pass, const std::string &detail = "") {
   if (!pass) failed++;
   printf("%s %s  %s\n", pass ? "PASS" : "FAIL", name.c_str(), detail.c_str());
   results.push_back("{\"name\":\"" + esc(name) + "\",\"pass\":" + (pass ? "true" : "false") + ",\"detail\":\"" + esc(detail) + "\"}");
}
static shop::Item *find(std::vector<shop::Item> &v, const std::string &id) {
   for (auto &i : v)
      if (i.id == id) return &i;
   return nullptr;
}

int main(int argc, char **argv) {
   std::string out = argc > 1 ? argv[1] : ".";
   if (getenv("SHOP_ROOT")) shop::root = getenv("SHOP_ROOT");
   if (getenv("HB_REPO")) shop::hbRepo = getenv("HB_REPO");
   if (getenv("COSMO_BASE")) shop::cosmoBase = getenv("COSMO_BASE");
   shop::caFile = "";
   shop::mkdirs(shop::root);

   std::vector<shop::Item> items;
   std::string err;
   bool loaded = shop::loadCatalog(items, err);
   int emus = 0, apps = 0, themes = 0, fonts = 0;
   std::string emuList, themeList, fontList;
   for (auto &i : items) {
      if (i.kind == shop::Emulator) emus++, emuList += i.title + (i.featured ? " (recommended)" : i.nintendo ? " (Nintendo)" : "") + ", ";
      else if (i.kind == shop::App) apps++;
      else if (i.kind == shop::ThemePack) themes++, themeList += i.title + ", ";
      else fonts++, fontList += i.title + ", ";
   }
   ok("both catalogs load", loaded && apps > 20 && themes > 0, err + " " + std::to_string(items.size()) + " items");
   ok("emulators tab", emus >= 2 && items.size() && items[0].kind == shop::Emulator && items[0].featured, emuList);
   ok("17 new themes", themes == 17, themeList);
   ok("fonts", fonts >= 3, fontList);

   const char *emuId = getenv("SHOP_EMU") ? getenv("SHOP_EMU") : "NooDS";
   shop::Item *e = find(items, emuId);
   if (e) {
      std::string d;
      float last = 0;
      bool in = shop::install(*e, err, [&](float f) { last = f; });
      std::string bin = e->binary.size() > 1 ? shop::root + e->binary.substr(1) : "";
      d = "binary " + e->binary + " exists=" + std::to_string(shop::exists(bin)) + " installed=" + e->installed + " version=" + e->version;
      ok(std::string("install ") + emuId, in && shop::exists(bin) && e->installed == e->version && last > 0.99f, err + " " + d);
      ok("the Homebrew App Store sees it", shop::exists(shop::root + "wiiu/apps/appstore/.get/packages/" + e->id + "/manifest.install"));
      // installing again (an update) keeps it working
      ok("install again (update)", shop::install(*e, err, nullptr) && shop::exists(bin), err);
      bool rm = shop::remove(*e, err);
      ok(std::string("remove ") + emuId, rm && !shop::exists(bin) && e->installed.empty(), err);
   } else ok(std::string("install ") + emuId, false, "not in the catalog");

   for (const char *kind : {"theme", "font"}) {
      shop::Item *t = nullptr;
      for (auto &i : items)
         if (i.category == kind) {
            t = &i;
            break;
         }
      if (!t) {
         ok(std::string("install a ") + kind, false, "none");
         continue;
      }
      std::string files;
      bool in = shop::install(*t, err, nullptr);
      bool all = in;
      for (auto &f : t->files) {
         bool x = shop::exists(shop::root + "wiiu/cosmou/" + f.second);
         all = all && x;
         files += f.second + (x ? " ok, " : " missing, ");
      }
      ok(std::string("install ") + kind + " " + t->title, all && t->installed == t->version, err + " " + files);
      ok(std::string("remove ") + kind + " " + t->title, shop::remove(*t, err) && t->installed.empty(), err);
   }

   // which systems RetroArch brings on the Wii U (its cores)
   if (getenv("SHOP_FULL")) {
      std::string zip = shop::cacheDir() + "retroarch-test.zip";
      bool got = shop::getFile(shop::hbRepo + "/zips/retroarch.zip", zip, err);
      std::vector<std::string> names;
      shop::zipList(zip, names);
      std::string cores, other;
      int n = 0;
      for (auto &s : names) {
         size_t a = s.find_last_of('/');
         std::string f = a == std::string::npos ? s : s.substr(a + 1);
         if (f.find("_libretro") != std::string::npos) cores += f.substr(0, f.find("_libretro")) + " ", n++;
         else if (s.find(".wuhb") != std::string::npos || s.find(".rpx") != std::string::npos || s == "manifest.install") other += s + " ";
      }
      ok("RetroArch for the Wii U: its emulators", got && n > 0, std::to_string(n) + " cores: " + cores + " | " + other);
      remove(zip.c_str());
   }

   FILE *f = fopen((out + "/results.json").c_str(), "w");
   if (f) {
      fprintf(f, "{\"platform\":\"wiiu-shop\",\"results\":[");
      for (size_t i = 0; i < results.size(); i++) fprintf(f, "%s%s", i ? "," : "", results[i].c_str());
      fprintf(f, "]}\n");
      fclose(f);
   }
   return failed ? 1 : 0;
}

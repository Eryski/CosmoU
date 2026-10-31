// CosmoU for Wii U – the shop: emulators and apps from the Homebrew App Store catalog (ForTheUsers), themes and
// fonts from CosmoU's own GitHub. Downloads with curl, installs to the SD card the same way the Homebrew App Store
// does (its zips, its manifest.install and its .get folder), so both see what the other installed.
// Only homebrew, themes and fonts: never games, ROMs, BIOS files or keys.
#pragma once
#include <atomic>
#include <functional>
#include <string>
#include <utility>
#include <vector>

namespace shop {

enum Kind { Emulator, App, ThemePack, FontPack };

struct Item {
   std::string id, title, author, desc, details, version, category, binary, license, note;
   Kind kind = App;
   bool featured = false; // the "Recommended" row
   int order = 0;         // place in the recommended row
   bool nintendo = false; // emulators of Nintendo systems come first
   bool legacy = false;   // an older app for the Homebrew Launcher
   long sizeKB = 0;
   std::string iconUrl;
   std::vector<std::string> colors;                         // themes: a few colours for the preview
   std::vector<std::pair<std::string, std::string>> files; // CosmoU packs: url, path under wiiu/cosmou/
   std::string installed;                                   // installed version, "?" = unknown, "" = not installed
   bool hasUpdate() const { return !installed.empty() && installed != "?" && !version.empty() && installed != version; }
};

// where everything goes; changed by the test on a PC
extern std::string root;      // the SD card: "fs:/vol/external01/"
extern std::string hbRepo;    // "https://wiiu.cdn.fortheusers.org"
extern std::string cosmoBase; // "https://raw.githubusercontent.com/Eryski/CosmoU/main/"
extern std::string caFile;    // certificates for HTTPS
extern std::string userAgent;
extern std::atomic<bool> cancel; // set to stop a download

using Progress = std::function<void(float)>;

void init(); // once, before the first download
bool get(const std::string &url, std::string &out, std::string &err, const Progress &p = nullptr);
bool getFile(const std::string &url, const std::string &path, std::string &err, const Progress &p = nullptr);

// both catalogs; emulators first (recommended, then Nintendo systems), then apps, themes and fonts
bool loadCatalog(std::vector<Item> &items, std::string &err);
void refreshInstalled(Item &it);
bool install(Item &it, std::string &err, const Progress &p);
bool remove(Item &it, std::string &err);

// helpers (also used by the test)
bool zipList(const std::string &zip, std::vector<std::string> &names);
bool mkdirs(const std::string &dir);
bool exists(const std::string &p);
std::string themeDir(const std::string &id); // root + wiiu/cosmou/themes/<id>/
std::string fontDir(const std::string &id);  // root + wiiu/cosmou/fonts/<id>/
std::string cacheDir();                      // root + wiiu/cosmou/shop/

} // namespace shop

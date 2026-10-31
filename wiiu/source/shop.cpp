// CosmoU for Wii U – the shop's downloads and installs (see shop.hpp).
#include "shop.hpp"
#include "json.hpp"

#include <curl/curl.h>
#include <zlib.h>

#include <algorithm>
#include <cerrno>
#include <cstdio>
#include <cstring>
#include <map>
#include <set>
#include <sys/stat.h>
#include <unistd.h>

#ifdef __WIIU__
#include <nn/ac/ac_c.h>
#endif

namespace shop {

std::string root = "fs:/vol/external01/";
std::string hbRepo = "https://wiiu.cdn.fortheusers.org";
std::string cosmoBase = "https://raw.githubusercontent.com/Eryski/CosmoU/main/";
std::string caFile = "fs:/vol/content/cacert.pem";
std::string userAgent = "CosmoU-WiiU/0.13.0";
std::atomic<bool> cancel{false};

std::string themeDir(const std::string &id) { return root + "wiiu/cosmou/themes/" + id + "/"; }
std::string fontDir(const std::string &id) { return root + "wiiu/cosmou/fonts/" + id + "/"; }
std::string cacheDir() { return root + "wiiu/cosmou/shop/"; }
static std::string getDir(const std::string &id) { return root + "wiiu/apps/appstore/.get/packages/" + id + "/"; }

bool exists(const std::string &p) {
   struct stat st;
   return stat(p.c_str(), &st) == 0;
}
bool mkdirs(const std::string &dir) {
   // "fs:/vol/external01/a/b/" → makes a, then a/b (the parts that already exist just fail quietly)
   for (size_t i = root.size(); i <= dir.size(); i++)
      if (i == dir.size() || dir[i] == '/') {
         std::string part = dir.substr(0, i);
         if (!part.empty() && !exists(part)) mkdir(part.c_str(), 0777);
      }
   return exists(dir);
}
static std::string readAll(const std::string &p) {
   FILE *f = fopen(p.c_str(), "rb");
   if (!f) return "";
   std::string s;
   char b[8192];
   size_t n;
   while ((n = fread(b, 1, sizeof b, f)) > 0) s.append(b, n);
   fclose(f);
   return s;
}
static bool writeAll(const std::string &p, const std::string &s) {
   FILE *f = fopen(p.c_str(), "wb");
   if (!f) return false;
   bool ok = fwrite(s.data(), 1, s.size(), f) == s.size();
   return fclose(f) == 0 && ok;
}
static std::string parentOf(const std::string &p) {
   size_t i = p.find_last_of('/', p.size() > 1 ? p.size() - 2 : 0);
   return i == std::string::npos ? "" : p.substr(0, i + 1);
}

// ---------------------------------------------------------------- downloads
void init() {
   static bool done = false;
   if (done) return;
   done = true;
#ifdef __WIIU__
   // the system connects by itself when an app uses the network; waiting here makes the first download work
   ACInitialize();
   ACConnect();
#endif
   curl_global_init(CURL_GLOBAL_DEFAULT);
}
struct Sink {
   std::string *mem = nullptr;
   FILE *file = nullptr;
   const Progress *p = nullptr;
};
static size_t onData(void *d, size_t s, size_t n, void *u) {
   Sink *k = (Sink *)u;
   size_t len = s * n;
   if (k->mem) k->mem->append((const char *)d, len);
   else if (k->file && fwrite(d, 1, len, k->file) != len) return 0;
   return len;
}
static int onProgress(void *u, curl_off_t total, curl_off_t now, curl_off_t, curl_off_t) {
   Sink *k = (Sink *)u;
   if (cancel) return 1;
   if (k->p && *k->p && total > 0) (*k->p)((float)now / (float)total);
   return 0;
}
static bool fetch(const std::string &url, Sink &k, std::string &err) {
   init();
   CURL *c = curl_easy_init();
   if (!c) return err = "No network", false;
   char eb[CURL_ERROR_SIZE] = "";
   curl_easy_setopt(c, CURLOPT_URL, url.c_str());
   curl_easy_setopt(c, CURLOPT_FOLLOWLOCATION, 1L);
   curl_easy_setopt(c, CURLOPT_USERAGENT, userAgent.c_str());
   if (!caFile.empty() && exists(caFile)) curl_easy_setopt(c, CURLOPT_CAINFO, caFile.c_str());
   curl_easy_setopt(c, CURLOPT_CONNECTTIMEOUT, 20L);
   curl_easy_setopt(c, CURLOPT_LOW_SPEED_LIMIT, 64L);
   curl_easy_setopt(c, CURLOPT_LOW_SPEED_TIME, 40L);
   curl_easy_setopt(c, CURLOPT_FAILONERROR, 1L);
   curl_easy_setopt(c, CURLOPT_ERRORBUFFER, eb);
   curl_easy_setopt(c, CURLOPT_WRITEFUNCTION, onData);
   curl_easy_setopt(c, CURLOPT_WRITEDATA, &k);
   curl_easy_setopt(c, CURLOPT_XFERINFOFUNCTION, onProgress);
   curl_easy_setopt(c, CURLOPT_XFERINFODATA, &k);
   curl_easy_setopt(c, CURLOPT_NOPROGRESS, 0L);
   CURLcode r = curl_easy_perform(c);
   long code = 0;
   curl_easy_getinfo(c, CURLINFO_RESPONSE_CODE, &code);
   curl_easy_cleanup(c);
   if (r == CURLE_OK) return true;
   if (cancel) err = "Stopped";
   else if (r == CURLE_COULDNT_RESOLVE_HOST || r == CURLE_COULDNT_CONNECT) err = "No internet connection";
   else if (code >= 400) err = "Not found on the server (" + std::to_string(code) + ")";
   else err = eb[0] ? eb : curl_easy_strerror(r);
   return false;
}
bool get(const std::string &url, std::string &out, std::string &err, const Progress &p) {
   Sink k;
   out.clear();
   k.mem = &out;
   k.p = &p;
   return fetch(url, k, err);
}
bool getFile(const std::string &url, const std::string &path, std::string &err, const Progress &p) {
   mkdirs(parentOf(path));
   FILE *f = fopen(path.c_str(), "wb");
   if (!f) return err = "Can't write to the SD card", false;
   Sink k;
   k.file = f;
   k.p = &p;
   bool ok = fetch(url, k, err);
   if (fclose(f) != 0 && ok) ok = false, err = "The SD card is full";
   if (!ok) ::remove(path.c_str());
   return ok;
}

// ---------------------------------------------------------------- zip files (stored or deflated, no zip64)
struct ZipEntry {
   std::string name;
   uint16_t method = 0;
   uint32_t csize = 0, usize = 0, offset = 0;
};
static uint16_t le16(const unsigned char *p) { return p[0] | p[1] << 8; }
static uint32_t le32(const unsigned char *p) { return p[0] | p[1] << 8 | p[2] << 16 | (uint32_t)p[3] << 24; }
static bool zipDir(FILE *f, std::vector<ZipEntry> &out) {
   if (fseek(f, 0, SEEK_END) != 0) return false;
   long size = ftell(f);
   long back = std::min(size, 65557L);
   std::vector<unsigned char> tail(back);
   fseek(f, size - back, SEEK_SET);
   if (fread(tail.data(), 1, back, f) != (size_t)back) return false;
   long e = -1;
   for (long i = back - 22; i >= 0; i--)
      if (le32(&tail[i]) == 0x06054b50) {
         e = i;
         break;
      }
   if (e < 0) return false;
   uint16_t count = le16(&tail[e + 10]);
   uint32_t cdSize = le32(&tail[e + 12]), cdOff = le32(&tail[e + 16]);
   std::vector<unsigned char> cd(cdSize);
   fseek(f, cdOff, SEEK_SET);
   if (fread(cd.data(), 1, cdSize, f) != cdSize) return false;
   size_t p = 0;
   for (int i = 0; i < count; i++) {
      if (p + 46 > cd.size() || le32(&cd[p]) != 0x02014b50) return false;
      ZipEntry z;
      z.method = le16(&cd[p + 10]);
      z.csize = le32(&cd[p + 20]);
      z.usize = le32(&cd[p + 24]);
      uint16_t nl = le16(&cd[p + 28]), xl = le16(&cd[p + 30]), cl = le16(&cd[p + 32]);
      z.offset = le32(&cd[p + 42]);
      if (p + 46 + nl > cd.size()) return false;
      z.name.assign((const char *)&cd[p + 46], nl);
      p += 46 + nl + xl + cl;
      out.push_back(z);
   }
   return true;
}
// one file out of the zip: into a file, or into memory when dst is null
static bool zipExtract(FILE *f, const ZipEntry &z, FILE *dst, std::string *mem) {
   unsigned char lh[30];
   if (fseek(f, z.offset, SEEK_SET) != 0 || fread(lh, 1, 30, f) != 30 || le32(lh) != 0x04034b50) return false;
   fseek(f, z.offset + 30 + le16(lh + 26) + le16(lh + 28), SEEK_SET);
   static unsigned char in[32768], out[65536];
   auto put = [&](const unsigned char *d, size_t n) {
      if (mem) mem->append((const char *)d, n);
      else if (fwrite(d, 1, n, dst) != n) return false;
      return true;
   };
   uint32_t left = z.csize;
   if (z.method == 0) {
      while (left) {
         size_t n = fread(in, 1, std::min<uint32_t>(left, sizeof in), f);
         if (!n || !put(in, n)) return false;
         left -= n;
      }
      return true;
   }
   if (z.method != 8) return false;
   z_stream s;
   memset(&s, 0, sizeof s);
   if (inflateInit2(&s, -MAX_WBITS) != Z_OK) return false;
   int r = Z_OK;
   while (r != Z_STREAM_END) {
      if (!s.avail_in) {
         if (!left) break;
         size_t n = fread(in, 1, std::min<uint32_t>(left, sizeof in), f);
         if (!n) break;
         left -= n;
         s.next_in = in;
         s.avail_in = n;
      }
      s.next_out = out;
      s.avail_out = sizeof out;
      r = inflate(&s, Z_NO_FLUSH);
      if (r != Z_OK && r != Z_STREAM_END) break;
      if (!put(out, sizeof out - s.avail_out)) {
         r = Z_DATA_ERROR;
         break;
      }
   }
   inflateEnd(&s);
   return r == Z_STREAM_END;
}
bool zipList(const std::string &zip, std::vector<std::string> &names) {
   FILE *f = fopen(zip.c_str(), "rb");
   if (!f) return false;
   std::vector<ZipEntry> d;
   bool ok = zipDir(f, d);
   fclose(f);
   for (auto &z : d) names.push_back(z.name);
   return ok;
}

// ---------------------------------------------------------------- the catalogs
static long kb(const Json &v) { return (long)v.num(0); }
bool loadCatalog(std::vector<Item> &items, std::string &err) {
   items.clear();
   std::string a, b, e1, e2;
   bool okHb = get(hbRepo + "/repo.json", a, e1);
   bool okOwn = get(cosmoBase + "wiiu/shop/shop.json", b, e2);
   // last good copies on the SD card, for a moment without internet
   std::string cache = cacheDir();
   mkdirs(cache);
   if (okHb) writeAll(cache + "repo.json", a);
   else a = readAll(cache + "repo.json");
   if (okOwn) writeAll(cache + "shop.json", b);
   else b = readAll(cache + "shop.json");
   Json hb, own;
   bool hasHb = !a.empty() && Json::parse(a, hb), hasOwn = !b.empty() && Json::parse(b, own);
   if (!hasHb && !hasOwn) return err = e1.empty() ? e2 : e1, false;

   std::map<std::string, std::string> notes;
   std::set<std::string> nintendo, emus;
   std::map<std::string, int> featured;
   for (auto &f : own["featured"].a) {
      featured[f["id"].str()] = (int)featured.size();
      notes[f["id"].str()] = f["note"].str();
   }
   for (auto &n : own["nintendo"].a) nintendo.insert(n.str()), emus.insert(n.str());
   for (auto &n : own["emulators"].a) emus.insert(n.str());
   for (auto &n : own["notes"].o) notes[n.first] = n.second.str();

   for (auto &p : hb["packages"].a) {
      Item it;
      it.id = p["name"].str();
      if (it.id.empty() || it.id == "appstore") continue;
      it.title = p["title"].str(it.id);
      it.author = p["author"].str();
      it.desc = p["description"].str();
      it.details = p["details"].str();
      for (size_t i; (i = it.details.find("\\n")) != std::string::npos;) it.details.replace(i, 2, "\n");
      it.version = p["version"].str();
      it.category = p["category"].str();
      it.binary = p["binary"].str();
      it.license = p["license"].str();
      it.sizeKB = kb(p["filesize"]);
      it.iconUrl = hbRepo + "/packages/" + it.id + "/icon.png";
      it.legacy = it.category == "legacy";
      it.kind = it.category == "emu" || emus.count(it.id) ? Emulator : App;
      it.featured = featured.count(it.id) > 0;
      if (it.featured) it.order = featured[it.id];
      it.nintendo = nintendo.count(it.id) > 0;
      it.note = notes[it.id];
      refreshInstalled(it);
      items.push_back(it);
   }
   auto pack = [&](const Json &list, Kind k) {
      for (auto &p : list.a) {
         Item it;
         it.kind = k;
         it.id = p["id"].str();
         it.title = p["title"].str(it.id);
         it.author = p["author"].str("CosmoU");
         it.desc = p["desc"].str();
         it.details = p["details"].str();
         it.version = p["version"].str("1");
         it.license = p["license"].str();
         it.sizeKB = kb(p["size"]);
         it.category = k == ThemePack ? "theme" : "font";
         for (auto &c : p["colors"].a) it.colors.push_back(c.str());
         for (auto &f : p["files"].a) {
            std::string u = f["url"].str();
            if (u.rfind("http", 0) != 0) u = cosmoBase + u;
            it.files.push_back({u, f["path"].str()});
         }
         if (it.id.empty() || it.files.empty()) continue;
         refreshInstalled(it);
         items.push_back(it);
      }
   };
   pack(own["themes"], ThemePack);
   pack(own["fonts"], FontPack);

   // emulators (recommended, Nintendo, the rest), then apps for Aroma, tools, games … and the older ones last
   auto rank = [](const Item &i) {
      if (i.kind == Emulator) return i.featured ? 0 : i.nintendo ? 1 : i.legacy ? 3 : 2;
      if (i.kind == App) {
         static const char *order[] = {"aroma", "tool", "game", "_misc", "advanced", "concept", "legacy"};
         for (int k = 0; k < 7; k++)
            if (i.category == order[k]) return 10 + k;
         return 16;
      }
      return i.kind == ThemePack ? 20 : 21;
   };
   std::stable_sort(items.begin(), items.end(), [&](const Item &x, const Item &y) {
      int a1 = rank(x), b1 = rank(y);
      if (a1 != b1) return a1 < b1;
      if (x.kind >= ThemePack) return false; // themes and fonts keep the order of shop.json
      if (x.featured && y.featured) return x.order < y.order;
      std::string p = x.title, q = y.title;
      std::transform(p.begin(), p.end(), p.begin(), ::tolower);
      std::transform(q.begin(), q.end(), q.begin(), ::tolower);
      return p < q;
   });
   if (!okHb && !okOwn) err = "Offline: showing the last list";
   return true;
}

// ---------------------------------------------------------------- what is installed
static std::string dirOf(const Item &it) { return it.kind == ThemePack ? themeDir(it.id) : fontDir(it.id); }
void refreshInstalled(Item &it) {
   it.installed.clear();
   if (it.kind == ThemePack || it.kind == FontPack) {
      std::string v = readAll(dirOf(it) + "version.txt");
      while (!v.empty() && (v.back() == '\n' || v.back() == '\r' || v.back() == ' ')) v.pop_back();
      bool all = true;
      for (auto &f : it.files) all = all && exists(root + "wiiu/cosmou/" + f.second);
      if (all) it.installed = v.empty() ? "?" : v;
      return;
   }
   std::string d = getDir(it.id);
   if (exists(d + "manifest.install")) {
      Json info;
      it.installed = Json::parse(readAll(d + "info.json"), info) && !info["version"].str().empty() ? info["version"].str() : "?";
      return;
   }
   // put there by hand or with another tool
   if (!it.binary.empty() && it.binary != "none") {
      std::string b = it.binary[0] == '/' ? it.binary.substr(1) : it.binary;
      if (exists(root + b)) it.installed = "?";
   }
}

// ---------------------------------------------------------------- installing and removing
static bool safePath(const std::string &p) {
   if (p.empty() || p[0] == '/' || p.find('\\') != std::string::npos || p.find(':') != std::string::npos) return false;
   size_t s = 0;
   while (s <= p.size()) {
      size_t e = p.find('/', s);
      if (e == std::string::npos) e = p.size();
      if (p.compare(s, e - s, "..") == 0) return false;
      s = e + 1;
   }
   return true;
}
struct Op {
   char mode; // U update (replace), E extract once and keep on removal, G get only when missing
   std::string path;
};
static std::vector<Op> parseManifest(const std::string &txt) {
   std::vector<Op> ops;
   size_t s = 0;
   while (s < txt.size()) {
      size_t e = txt.find('\n', s);
      if (e == std::string::npos) e = txt.size();
      std::string l = txt.substr(s, e - s);
      s = e + 1;
      while (!l.empty() && (l.back() == '\r' || l.back() == ' ')) l.pop_back();
      if (l.size() > 3 && l[1] == ':' && strchr("UEG", l[0])) ops.push_back({l[0], l.substr(3)});
   }
   return ops;
}
static void removeEmptyDirs(std::set<std::string> dirs) {
   // deepest first; a folder that still has files in it stays
   std::vector<std::string> v(dirs.begin(), dirs.end());
   std::sort(v.begin(), v.end(), [](const std::string &a, const std::string &b) { return a.size() > b.size(); });
   for (auto d : v)
      while (d.size() > root.size() + 1 && d != root + "wiiu/" && d != root + "wiiu/apps/") {
         std::string x = d;
         if (!x.empty() && x.back() == '/') x.pop_back();
         if (rmdir(x.c_str()) != 0) break;
         d = parentOf(d);
      }
}
// moves the downloaded *.part files into place only when everything arrived
static bool commit(const std::vector<std::string> &targets, std::string &err) {
   for (auto &t : targets) {
      if (exists(t)) ::remove(t.c_str());
      if (rename((t + ".part").c_str(), t.c_str()) != 0) return err = "Can't write to the SD card", false;
   }
   return true;
}
static void dropParts(const std::vector<std::string> &targets) {
   for (auto &t : targets) ::remove((t + ".part").c_str());
}

static bool installPack(Item &it, std::string &err, const Progress &p) {
   std::vector<std::string> targets;
   for (size_t i = 0; i < it.files.size(); i++) {
      if (!safePath(it.files[i].second)) return err = "Bad file in the shop list", false;
      std::string t = root + "wiiu/cosmou/" + it.files[i].second;
      targets.push_back(t);
      float a = (float)i / it.files.size(), w = 1.f / it.files.size();
      Progress sub = [&](float f) {
         if (p) p(a + w * f);
      };
      if (!getFile(it.files[i].first, t + ".part", err, sub)) {
         dropParts(targets);
         return false;
      }
   }
   if (!commit(targets, err)) return dropParts(targets), false;
   writeAll(dirOf(it) + "version.txt", it.version + "\n");
   refreshInstalled(it);
   return true;
}
static bool removePack(Item &it, std::string &err) {
   std::set<std::string> dirs;
   for (auto &f : it.files) {
      std::string t = root + "wiiu/cosmou/" + f.second;
      ::remove(t.c_str());
      dirs.insert(parentOf(t));
   }
   ::remove((dirOf(it) + "version.txt").c_str());
   dirs.insert(dirOf(it));
   removeEmptyDirs(dirs);
   refreshInstalled(it);
   if (!it.installed.empty()) return err = "Couldn't remove everything", false;
   return true;
}

bool install(Item &it, std::string &err, const Progress &p) {
   cancel = false;
   if (it.kind == ThemePack || it.kind == FontPack) return installPack(it, err, p);
   std::string zip = cacheDir() + it.id + ".zip";
   // download: the first 80 %
   if (!getFile(hbRepo + "/zips/" + it.id + ".zip", zip, err, [&](float f) {
          if (p) p(f * 0.8f);
       }))
      return false;
   FILE *f = fopen(zip.c_str(), "rb");
   std::vector<ZipEntry> dir;
   if (!f || !zipDir(f, dir)) {
      if (f) fclose(f);
      ::remove(zip.c_str());
      return err = "The download is broken, try again", false;
   }
   std::map<std::string, const ZipEntry *> byName;
   for (auto &z : dir) byName[z.name] = &z;
   std::string manifestTxt, infoTxt;
   if (byName.count("manifest.install")) zipExtract(f, *byName["manifest.install"], nullptr, &manifestTxt);
   if (byName.count("info.json")) zipExtract(f, *byName["info.json"], nullptr, &infoTxt);
   std::vector<Op> ops = parseManifest(manifestTxt);
   if (ops.empty()) // no list inside: every file in the zip, like the Homebrew App Store does
      for (auto &z : dir)
         if (!z.name.empty() && z.name.back() != '/' && z.name != "manifest.install" && z.name != "info.json") ops.push_back({'U', z.name});
   std::string gd = getDir(it.id);
   std::vector<Op> old = parseManifest(readAll(gd + "manifest.install"));

   std::vector<std::string> targets;
   std::set<std::string> fresh;
   size_t i = 0;
   for (auto &op : ops) {
      i++;
      if (p) p(0.8f + 0.18f * i / ops.size());
      if (!safePath(op.path)) continue;
      std::string t = root + op.path;
      fresh.insert(op.path);
      auto z = byName.find(op.path);
      if (z == byName.end()) continue;
      if (op.mode == 'G' && exists(t)) continue;
      mkdirs(parentOf(t));
      FILE *o = fopen((t + ".part").c_str(), "wb");
      bool ok = o && zipExtract(f, *z->second, o, nullptr);
      if (o && fclose(o) != 0) ok = false;
      targets.push_back(t);
      if (!ok || cancel) {
         fclose(f);
         dropParts(targets);
         ::remove(zip.c_str());
         return err = cancel ? "Stopped" : "Couldn't unpack it (is the SD card full?)", false;
      }
   }
   fclose(f);
   ::remove(zip.c_str());
   if (!commit(targets, err)) return dropParts(targets), false;
   // files the old version had and the new one doesn't
   std::set<std::string> dirs;
   for (auto &op : old)
      if (op.mode == 'U' && !fresh.count(op.path) && safePath(op.path)) {
         ::remove((root + op.path).c_str());
         dirs.insert(parentOf(root + op.path));
      }
   removeEmptyDirs(dirs);
   // the Homebrew App Store's record of it
   mkdirs(gd);
   std::string m;
   for (auto &op : ops) m += std::string(1, op.mode) + ": " + op.path + "\n";
   writeAll(gd + "manifest.install", m);
   if (infoTxt.empty()) infoTxt = "{\"version\":\"" + it.version + "\",\"title\":\"" + it.title + "\"}";
   writeAll(gd + "info.json", infoTxt);
   if (p) p(1.f);
   refreshInstalled(it);
   if (it.installed == "?") it.installed = it.version;
   return true;
}

bool remove(Item &it, std::string &err) {
   if (it.kind == ThemePack || it.kind == FontPack) return removePack(it, err);
   std::string gd = getDir(it.id);
   std::vector<Op> ops = parseManifest(readAll(gd + "manifest.install"));
   if (ops.empty()) return err = "It was put on the SD card another way, remove it there", false;
   std::set<std::string> dirs;
   for (auto &op : ops)
      if (op.mode != 'E' && safePath(op.path)) {
         ::remove((root + op.path).c_str());
         dirs.insert(parentOf(root + op.path));
      }
   removeEmptyDirs(dirs);
   ::remove((gd + "manifest.install").c_str());
   ::remove((gd + "info.json").c_str());
   ::remove((gd + "icon.png").c_str());
   std::string x = gd.substr(0, gd.size() - 1);
   rmdir(x.c_str());
   refreshInstalled(it);
   return true;
}

} // namespace shop

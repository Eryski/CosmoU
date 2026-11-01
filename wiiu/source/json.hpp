// A small JSON reader for the shop catalogs (objects, arrays, strings, numbers, true/false/null).
#pragma once
#include <cstdlib>
#include <map>
#include <memory>
#include <string>
#include <vector>

struct Json {
   enum Type { Null, Bool, Num, Str, Arr, Obj } type = Null;
   bool b = false;
   double n = 0;
   std::string s;
   std::vector<Json> a;
   std::map<std::string, Json> o;

   const Json &operator[](const std::string &k) const {
      static const Json none;
      auto it = o.find(k);
      return it == o.end() ? none : it->second;
   }
   const Json &operator[](size_t i) const {
      static const Json none;
      return i < a.size() ? a[i] : none;
   }
   bool has(const std::string &k) const { return o.count(k) > 0; }
   std::string str(const std::string &def = "") const {
      if (type == Str) return s;
      if (type == Num) {
         char b2[32];
         snprintf(b2, sizeof b2, "%g", n);
         return b2;
      }
      return def;
   }
   double num(double def = 0) const { return type == Num ? n : type == Str ? atof(s.c_str()) : def; }

   static bool parse(const std::string &txt, Json &out) {
      size_t i = 0;
      return value(txt, i, out, 0) && (ws(txt, i), true);
   }

 private:
   static void ws(const std::string &t, size_t &i) {
      while (i < t.size() && (t[i] == ' ' || t[i] == '\n' || t[i] == '\r' || t[i] == '\t')) i++;
   }
   static void utf8(std::string &o, unsigned c) {
      if (c < 0x80) o += (char)c;
      else if (c < 0x800) o += (char)(0xC0 | (c >> 6)), o += (char)(0x80 | (c & 63));
      else if (c < 0x10000) o += (char)(0xE0 | (c >> 12)), o += (char)(0x80 | ((c >> 6) & 63)), o += (char)(0x80 | (c & 63));
      else o += (char)(0xF0 | (c >> 18)), o += (char)(0x80 | ((c >> 12) & 63)), o += (char)(0x80 | ((c >> 6) & 63)), o += (char)(0x80 | (c & 63));
   }
   static bool string(const std::string &t, size_t &i, std::string &o) {
      if (t[i] != '"') return false;
      i++;
      while (i < t.size() && t[i] != '"') {
         char c = t[i++];
         if (c != '\\') {
            o += c;
            continue;
         }
         if (i >= t.size()) return false;
         char e = t[i++];
         switch (e) {
         case 'n': o += '\n'; break;
         case 't': o += '\t'; break;
         case 'r': o += '\r'; break;
         case 'b': o += '\b'; break;
         case 'f': o += '\f'; break;
         case 'u': {
            if (i + 4 > t.size()) return false;
            unsigned c1 = (unsigned)strtoul(t.substr(i, 4).c_str(), nullptr, 16);
            i += 4;
            if (c1 >= 0xD800 && c1 < 0xDC00 && i + 6 <= t.size() && t[i] == '\\' && t[i + 1] == 'u') {
               unsigned c2 = (unsigned)strtoul(t.substr(i + 2, 4).c_str(), nullptr, 16);
               i += 6;
               c1 = 0x10000 + ((c1 - 0xD800) << 10) + (c2 - 0xDC00);
            }
            utf8(o, c1);
            break;
         }
         default: o += e; break;
         }
      }
      if (i >= t.size()) return false;
      i++;
      return true;
   }
   static bool value(const std::string &t, size_t &i, Json &v, int depth) {
      if (depth > 64) return false;
      ws(t, i);
      if (i >= t.size()) return false;
      char c = t[i];
      if (c == '{') {
         v.type = Obj;
         i++;
         ws(t, i);
         if (i < t.size() && t[i] == '}') return ++i, true;
         while (i < t.size()) {
            ws(t, i);
            std::string k;
            if (!string(t, i, k)) return false;
            ws(t, i);
            if (i >= t.size() || t[i] != ':') return false;
            i++;
            if (!value(t, i, v.o[k], depth + 1)) return false;
            ws(t, i);
            if (i < t.size() && t[i] == ',') {
               i++;
               continue;
            }
            if (i < t.size() && t[i] == '}') return ++i, true;
            return false;
         }
         return false;
      }
      if (c == '[') {
         v.type = Arr;
         i++;
         ws(t, i);
         if (i < t.size() && t[i] == ']') return ++i, true;
         while (i < t.size()) {
            v.a.emplace_back();
            if (!value(t, i, v.a.back(), depth + 1)) return false;
            ws(t, i);
            if (i < t.size() && t[i] == ',') {
               i++;
               continue;
            }
            if (i < t.size() && t[i] == ']') return ++i, true;
            return false;
         }
         return false;
      }
      if (c == '"') {
         v.type = Str;
         return string(t, i, v.s);
      }
      if (!t.compare(i, 4, "true")) return v.type = Bool, v.b = true, i += 4, true;
      if (!t.compare(i, 5, "false")) return v.type = Bool, i += 5, true;
      if (!t.compare(i, 4, "null")) return i += 4, true;
      char *end = nullptr;
      v.n = strtod(t.c_str() + i, &end);
      if (end == t.c_str() + i) return false;
      v.type = Num;
      i = end - t.c_str();
      return true;
   }
};

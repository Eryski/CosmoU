package com.cosmou.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * What the page (js/android-api.js) can ask Android for: its own files, the games folder (picked once with the
 * system folder picker), the internet, Cemu for Android and other apps. "sync" answers at once, "call" answers
 * later through window.__cosmoDone(id, result) – everything that waits for the user or the network.
 * All paths the page gives are relative to the app's own folder and can't leave it.
 */
public class Bridge {
    static final String TAG = "CosmoU";
    static final String[] CEMU = {"info.cemu.cemu", "info.cemu.cemu.debug"};
    static final String CEMU_GAME = "info.cemu.cemu.emulation.EmulationActivity";
    static final Pattern GAME_FILE = Pattern.compile("(?i).+\\.(wua|wud|wux|wuhb)$");

    final MainActivity act;
    final WebView web;
    final File root;
    final ExecutorService work = Executors.newFixedThreadPool(3);
    final Map<Integer, Pending> pending = new HashMap<>();
    int nextRequest = 100;

    Bridge(MainActivity act, WebView web) {
        this.act = act;
        this.web = web;
        this.root = act.getFilesDir();
        new File(root, "public").mkdirs();
    }

    /** where the folder picker starts in the automatic test (set by MainActivity) */
    static String testStart = null;
    /** the automatic test can start CosmoU without its menu music */
    static boolean testQuiet = false;

    /** a file inside the app's folder, or null when the path tries to leave it */
    File file(String rel) {
        try {
            File f = new File(root, rel).getCanonicalFile();
            String base = root.getCanonicalPath() + File.separator;
            return f.getPath().startsWith(base) ? f : null;
        } catch (IOException e) {
            return null;
        }
    }

    // =====================================================================================
    // quick answers
    // =====================================================================================
    @JavascriptInterface
    public String sync(String name, String argsJson) {
        try {
            JSONArray a = new JSONArray(argsJson == null ? "[]" : argsJson);
            return json(syncDo(name, a));
        } catch (Exception e) {
            Log.w(TAG, "sync " + name, e);
            return "null";
        }
    }

    static String json(Object o) {
        if (o == null) return "null";
        if (o instanceof String) return JSONObject.quote((String) o);
        return String.valueOf(JSONObject.wrap(o));
    }

    Object syncDo(String name, JSONArray a) throws Exception {
        switch (name) {
            case "info": {
                JSONObject o = new JSONObject();
                PackageInfo p = act.getPackageManager().getPackageInfo(act.getPackageName(), 0);
                o.put("version", p.versionName);
                o.put("sdk", Build.VERSION.SDK_INT);
                o.put("release", Build.VERSION.RELEASE);
                o.put("manufacturer", Build.MANUFACTURER);
                o.put("model", Build.MODEL);
                o.put("abi", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "");
                if (testStart != null) o.put("test", true);
                if (testQuiet) o.put("quiet", true);
                return o;
            }
            case "read": {
                File f = file(a.getString(0));
                if (f == null || !f.isFile() || f.length() > 8 * 1048576) return null;
                return new String(readAll(new FileInputStream(f), 8 * 1048576), StandardCharsets.UTF_8);
            }
            case "write": {
                File f = file(a.getString(0));
                if (f == null) return false;
                f.getParentFile().mkdirs();
                File tmp = new File(f.getPath() + ".tmp");
                try (OutputStream o = new FileOutputStream(tmp)) {
                    o.write(a.getString(1).getBytes(StandardCharsets.UTF_8));
                }
                return tmp.renameTo(f);
            }
            case "list": {
                File f = file(a.getString(0));
                JSONArray out = new JSONArray();
                String[] n = f == null ? null : f.list();
                if (n != null) for (String s : n) if (!s.endsWith(".tmp")) out.put(s);
                return out;
            }
            case "remove": {
                File f = file(a.getString(0));
                return f != null && !f.equals(root) && deleteTree(f);
            }
            case "move": {
                File from = file(a.getString(0)), to = file(a.getString(1));
                if (from == null || to == null || !from.exists()) return false;
                to.getParentFile().mkdirs();
                return from.renameTo(to);
            }
            case "assets": {
                JSONArray out = new JSONArray();
                String[] n = act.getAssets().list(a.getString(0));
                if (n != null) for (String s : n) out.put(s);
                return out;
            }
            case "cemuInfo":
                return cemuInfo();
            case "night":
                return (act.getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
                        == android.content.res.Configuration.UI_MODE_NIGHT_YES;
            case "appInstalled":
                return act.getPackageManager().getLaunchIntentForPackage(a.getString(0)) != null;
            case "appIcon":
                return appIcon(a.getString(0), a.getString(1));
            case "openUrl":
                return openUrl(a.getString(0));
            case "openCemu": {
                JSONObject c = cemuInfo();
                if (!c.optBoolean("installed")) return false;
                Intent i = act.getPackageManager().getLaunchIntentForPackage(c.getString("pkg"));
                if (i == null) return false;
                act.runOnUiThread(() -> act.startActivity(i));
                return true;
            }
            case "immersive":
                act.runOnUiThread(act::immersive);
                return true;
        }
        return null;
    }

    JSONObject cemuInfo() throws Exception {
        JSONObject o = new JSONObject();
        PackageManager pm = act.getPackageManager();
        for (String p : CEMU) {
            try {
                PackageInfo i = pm.getPackageInfo(p, 0);
                o.put("installed", true);
                o.put("pkg", p);
                o.put("version", i.versionName == null ? "" : i.versionName);
                return o;
            } catch (PackageManager.NameNotFoundException ignored) {
            }
        }
        o.put("installed", false);
        return o;
    }

    boolean openUrl(String url) {
        if (url == null || !url.startsWith("https://")) return false;
        act.runOnUiThread(() -> {
            try {
                act.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (ActivityNotFoundException e) {
                Log.w(TAG, "no browser", e);
            }
        });
        return true;
    }

    boolean appIcon(String pkg, String rel) {
        try {
            File f = file(rel);
            if (f == null) return false;
            Drawable d = act.getPackageManager().getApplicationIcon(pkg);
            Bitmap b = Bitmap.createBitmap(256, 256, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(b);
            d.setBounds(0, 0, 256, 256);
            d.draw(c);
            f.getParentFile().mkdirs();
            try (OutputStream o = new FileOutputStream(f)) {
                b.compress(Bitmap.CompressFormat.PNG, 100, o);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // =====================================================================================
    // answers that take a while
    // =====================================================================================
    @JavascriptInterface
    public void call(int id, String name, String argsJson) {
        work.execute(() -> {
            Object r;
            try {
                JSONArray a = new JSONArray(argsJson == null ? "[]" : argsJson);
                r = callDo(id, name, a);
            } catch (Exception e) {
                Log.w(TAG, "call " + name, e);
                r = err("Something went wrong: " + e.getMessage());
            }
            if (r != WAIT) done(id, r);
        });
    }

    static final Object WAIT = new Object();

    void done(int id, Object r) {
        String js = "window.__cosmoDone(" + id + "," + JSONObject.quote(json(r)) + ")";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    static JSONObject err(String msg) {
        JSONObject o = new JSONObject();
        try {
            o.put("ok", false);
            o.put("error", msg);
        } catch (Exception ignored) {
        }
        return o;
    }

    static JSONObject ok() {
        JSONObject o = new JSONObject();
        try {
            o.put("ok", true);
        } catch (Exception ignored) {
        }
        return o;
    }

    Object callDo(int id, String name, JSONArray a) throws Exception {
        switch (name) {
            case "pickFolder":
                return pickFolder(id);
            case "scanTree":
                return scanTree(a.getString(0));
            case "fetchFile":
                return fetchFile(a.getString(0), a.getString(1), a.optString(2, ""));
            case "fetchText":
                return fetchText(a.getString(0));
            case "launchCemu":
                return launchCemu(a.getString(0), a.optString(1, ""));
            case "launchApp":
                return launchApp(a.getString(0));
            case "pickApp":
                return pickApp(id);
            case "pickFile":
                return pickFile(id, a.getString(0), a.optString(1, ""));
            case "saveFile":
                return saveFile(id, a.getString(0), a.getString(1), a.getString(2).getBytes(StandardCharsets.UTF_8));
            case "themePick":
                return themePick(id);
            case "themeInstall":
                return themeInstall(a.getString(0), a.getString(1), a.optString(2, ""));
            case "themeExport":
                return themeExport(id, a.getString(0), a.getString(1));
            case "scanFiles":
                return scanFiles(a.getString(0), a.getString(1));
            case "launchEmu":
                return launchEmu(a.getJSONObject(0));
            case "forgetFolder":
                return forgetFolder(a.getString(0));
        }
        return err("Unknown request: " + name);
    }

    // ---------- system pickers: start one, answer when it comes back ----------
    interface Done {
        Object result(int code, Intent data) throws Exception;
    }

    static class Pending {
        final int callId;
        final Done then;

        Pending(int callId, Done then) {
            this.callId = callId;
            this.then = then;
        }
    }

    Object startPicker(int callId, Intent i, Done then) {
        act.runOnUiThread(() -> {
            int req = nextRequest++;
            pending.put(req, new Pending(callId, then));
            try {
                act.startActivityForResult(i, req);
            } catch (ActivityNotFoundException e) {
                pending.remove(req);
                done(callId, err("This device has no app to choose files."));
            }
        });
        return WAIT;
    }

    void onResult(int request, int code, Intent data) {
        Pending p = pending.remove(request);
        if (p == null) return;
        work.execute(() -> {
            Object r;
            try {
                r = code == Activity.RESULT_OK && data != null ? p.then.result(code, data) : cancel();
            } catch (Exception e) {
                Log.w(TAG, "picker", e);
                r = err("That didn’t work: " + e.getMessage());
            }
            if (r != WAIT) done(p.callId, r);
        });
    }

    static JSONObject cancel() {
        JSONObject o = new JSONObject();
        try {
            o.put("cancel", true);
        } catch (Exception ignored) {
        }
        return o;
    }

    // ---------- games folder ----------
    Object pickFolder(int id) throws Exception {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        if (testStart != null && testStart.startsWith("content://"))
            i.putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse(testStart));
        return startPicker(id, i, (code, data) -> {
            Uri tree = data.getData();
            if (tree == null) return cancel();
            ContentResolver cr = act.getContentResolver();
            // every console has its own games folder, so CosmoU keeps the permission of each one
            cr.takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            JSONObject o = new JSONObject();
            o.put("uri", tree.toString());
            Uri doc = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            o.put("name", displayName(doc));
            return o;
        });
    }

    String displayName(Uri doc) {
        try (Cursor c = act.getContentResolver().query(doc, new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignored) {
        }
        return "";
    }

    static class Doc {
        String id, name, mime;
        long size;
        Uri uri;

        boolean dir() {
            return DocumentsContract.Document.MIME_TYPE_DIR.equals(mime);
        }
    }

    List<Doc> children(Uri tree, String docId) {
        List<Doc> out = new ArrayList<>();
        Uri kids = DocumentsContract.buildChildDocumentsUriUsingTree(tree, docId);
        try (Cursor c = act.getContentResolver().query(kids, new String[]{
                DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.COLUMN_SIZE}, null, null, null)) {
            while (c != null && c.moveToNext()) {
                Doc d = new Doc();
                d.id = c.getString(0);
                d.name = c.getString(1);
                d.mime = c.getString(2);
                d.size = c.isNull(3) ? 0 : c.getLong(3);
                d.uri = DocumentsContract.buildDocumentUriUsingTree(tree, d.id);
                out.add(d);
            }
        }
        return out;
    }

    static Doc find(List<Doc> list, String name, boolean dir) {
        for (Doc d : list) if (d.name != null && d.name.equalsIgnoreCase(name) && d.dir() == dir) return d;
        return null;
    }

    static final Pattern TID = Pattern.compile("(?i)<title_id[^>]*>\\s*([0-9a-f]{16})\\s*</title_id>");

    Object scanTree(String treeStr) {
        Uri tree = Uri.parse(treeStr);
        List<Doc> top;
        try {
            top = children(tree, DocumentsContract.getTreeDocumentId(tree));
        } catch (SecurityException e) {
            return err("CosmoU can’t read the games folder anymore. Choose it again in Settings → Cemu & Games.");
        } catch (Exception e) {
            return err("The games folder can’t be read: " + e.getMessage());
        }
        JSONArray out = new JSONArray();
        File covers = file("public/covers-auto");
        covers.mkdirs();
        for (Doc d : top) {
            try {
                if (!d.dir()) {
                    if (d.name != null && GAME_FILE.matcher(d.name).matches()) {
                        JSONObject o = new JSONObject();
                        o.put("kind", "file");
                        o.put("name", d.name);
                        o.put("uri", d.uri.toString());
                        o.put("size", d.size);
                        out.put(o);
                    }
                    continue;
                }
                // a game folder: code/*.rpx and meta/meta.xml (any upper or lower case)
                List<Doc> inside = children(tree, d.id);
                Doc code = find(inside, "code", true);
                if (code == null) continue;
                Doc rpx = null;
                for (Doc x : children(tree, code.id))
                    if (!x.dir() && x.name != null && x.name.toLowerCase(Locale.ROOT).endsWith(".rpx")) rpx = x;
                if (rpx == null) continue;
                JSONObject o = new JSONObject();
                o.put("kind", "dir");
                o.put("name", d.name);
                o.put("uri", d.uri.toString());
                o.put("rpx", rpx.uri.toString());
                Doc meta = find(inside, "meta", true);
                String key = d.name.replaceAll("[<>:\"/\\\\|?*]", "_");
                if (meta != null) {
                    List<Doc> m = children(tree, meta.id);
                    Doc xml = find(m, "meta.xml", false);
                    if (xml != null) {
                        String x = readText(xml.uri, 256 * 1024);
                        o.put("meta", x);
                        Matcher t = TID.matcher(x);
                        if (t.find()) key = t.group(1).toLowerCase(Locale.ROOT);
                    }
                    Doc icon = find(m, "iconTex.tga", false), hero = find(m, "bootTvTex.tga", false);
                    File iconPng = new File(covers, key + "-icon.png"), heroPng = new File(covers, key + "-hero.png");
                    if (icon != null && !iconPng.exists()) Tga.toPng(act.getContentResolver(), icon.uri, iconPng);
                    if (hero != null && !heroPng.exists()) Tga.toPng(act.getContentResolver(), hero.uri, heroPng);
                    if (iconPng.exists()) o.put("color", Tga.averageColor(iconPng));
                }
                o.put("key", key);
                out.put(o);
            } catch (SecurityException e) {
                return err("CosmoU can’t read the games folder anymore. Choose it again in Settings → Cemu & Games.");
            } catch (Exception e) {
                Log.w(TAG, "scan " + d.name, e);
            }
        }
        JSONObject r = ok();
        try {
            r.put("entries", out);
        } catch (Exception ignored) {
        }
        return r;
    }

    String readText(Uri u, int max) throws IOException {
        try (InputStream in = act.getContentResolver().openInputStream(u)) {
            return new String(readAll(in, max), StandardCharsets.UTF_8);
        }
    }

    // ---------- internet ----------
    Object fetchFile(String url, String rel, String typePrefix) throws Exception {
        File f = file(rel);
        if (f == null || !url.startsWith("https://")) return err("Not allowed.");
        HttpURLConnection c = open(url);
        try {
            int st = c.getResponseCode();
            String type = c.getContentType() == null ? "" : c.getContentType();
            JSONObject o = new JSONObject();
            o.put("status", st);
            if (st != 200 || !type.startsWith(typePrefix)) {
                o.put("ok", false);
                return o;
            }
            f.getParentFile().mkdirs();
            File tmp = new File(f.getPath() + ".tmp");
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(tmp)) {
                copy(in, out, 50L * 1048576);
            }
            o.put("ok", tmp.renameTo(f));
            return o;
        } catch (UnknownHostException e) {
            JSONObject o = err("No internet connection.");
            o.put("offline", true);
            return o;
        } finally {
            c.disconnect();
        }
    }

    Object fetchText(String url) throws Exception {
        if (!url.startsWith("https://")) return err("Not allowed.");
        HttpURLConnection c = open(url);
        try {
            int st = c.getResponseCode();
            JSONObject o = new JSONObject();
            o.put("status", st);
            o.put("ok", st == 200);
            if (st == 200) o.put("text", new String(readAll(c.getInputStream(), 16 * 1048576), StandardCharsets.UTF_8));
            return o;
        } catch (UnknownHostException e) {
            return err("No internet connection.");
        } finally {
            c.disconnect();
        }
    }

    static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(20000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "CosmoU-Android");
        c.setRequestProperty("Accept", "application/vnd.github+json, image/*, */*");
        return c;
    }

    // ---------- starting Cemu and other apps ----------
    Object launchCemu(String game, String folder) throws Exception {
        JSONObject c = cemuInfo();
        if (!c.optBoolean("installed"))
            return err("Cemu for Android isn’t installed yet. Open Settings → Cemu & Games to get it.");
        Uri g = Uri.parse(game);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setClassName(c.getString("pkg"), CEMU_GAME);
        i.setDataAndType(g, "application/octet-stream");
        i.putExtra(c.getString("pkg") + ".LaunchPath", game);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        // a game folder: Cemu needs to read everything in it (code, content, meta), not just the .rpx
        if (folder != null && folder.startsWith("content://")) {
            ClipData clip = ClipData.newRawUri("game", g);
            clip.addItem(new ClipData.Item(Uri.parse(folder)));
            i.setClipData(clip);
            i.addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        }
        try {
            act.startActivity(i);
            return ok();
        } catch (ActivityNotFoundException | SecurityException e) {
            Log.w(TAG, "launch", e);
            return err("This version of Cemu for Android can’t be started by other apps. Update it, or start the game in Cemu.");
        }
    }

    Object launchApp(String pkg) {
        Intent i = act.getPackageManager().getLaunchIntentForPackage(pkg);
        if (i == null) return err("This app isn’t installed anymore.");
        try {
            act.startActivity(i);
            return ok();
        } catch (Exception e) {
            return err("The app couldn’t be started.");
        }
    }

    Object pickApp(int id) {
        PackageManager pm = act.getPackageManager();
        Intent main = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> list = pm.queryIntentActivities(main, 0);
        List<String[]> apps = new ArrayList<>();
        for (ResolveInfo r : list) {
            String pkg = r.activityInfo.packageName;
            if (pkg.equals(act.getPackageName())) continue;
            apps.add(new String[]{String.valueOf(r.loadLabel(pm)), pkg});
        }
        Collections.sort(apps, (x, y) -> x[0].compareToIgnoreCase(y[0]));
        String[] names = new String[apps.size()];
        for (int k = 0; k < names.length; k++) names[k] = apps.get(k)[0];
        act.runOnUiThread(() -> new AlertDialog.Builder(act)
                .setTitle("Add an app to CosmoU")
                .setItems(names, (dlg, which) -> {
                    JSONObject o = new JSONObject();
                    try {
                        o.put("pkg", apps.get(which)[1]);
                        o.put("name", apps.get(which)[0]);
                    } catch (Exception ignored) {
                    }
                    done(id, o);
                })
                .setNegativeButton("Cancel", (dlg, w) -> done(id, cancel()))
                .setOnCancelListener(dlg -> done(id, cancel()))
                .show());
        return WAIT;
    }

    // ---------- files from and to the device ----------
    static final Pattern AUDIO = Pattern.compile("(?i).+\\.(mp3|ogg|wav|m4a|flac)$");
    static final Pattern IMAGE = Pattern.compile("(?i).+\\.(png|jpe?g|webp)$");

    Object pickFile(int id, String kind, String destRel) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(kind.equals("audio") ? "audio/*" : kind.equals("image") ? "image/*" : "*/*");
        return startPicker(id, i, (code, data) -> {
            Uri u = data.getData();
            String name = openableName(u);
            JSONObject o = new JSONObject();
            if (kind.equals("json")) {
                o.put("text", readText(u, 2 * 1048576));
                o.put("name", name);
                return o;
            }
            Pattern ok = kind.equals("audio") ? AUDIO : IMAGE;
            if (!ok.matcher(name).matches()) {
                String ext = kind.equals("audio") ? ".mp3" : ".png";
                String type = act.getContentResolver().getType(u);
                if (type != null && type.contains("ogg")) ext = ".ogg";
                else if (type != null && type.contains("jpeg")) ext = ".jpg";
                name = (name.isEmpty() ? kind : name.replaceAll("\\.[^.]*$", "")) + ext;
            }
            name = name.replaceAll("[^\\w .()\\-]", "_");
            File dir = file(destRel);
            if (dir == null) return err("Not allowed.");
            dir.mkdirs();
            // only one own music file at a time
            if (kind.equals("audio")) {
                File[] old = dir.listFiles();
                if (old != null) for (File f : old) if (AUDIO.matcher(f.getName()).matches()) f.delete();
            } else name = "pick-" + System.currentTimeMillis() + name.substring(name.lastIndexOf('.'));
            File to = new File(dir, name);
            try (InputStream in = act.getContentResolver().openInputStream(u); OutputStream out = new FileOutputStream(to)) {
                copy(in, out, 80L * 1048576);
            }
            o.put("rel", destRel + "/" + name);
            o.put("name", name);
            return o;
        });
    }

    String openableName(Uri u) {
        try (Cursor c = act.getContentResolver().query(u, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null) return c.getString(0);
        } catch (Exception ignored) {
        }
        return "";
    }

    Object saveFile(int id, String name, String mime, byte[] data) {
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(mime);
        i.putExtra(Intent.EXTRA_TITLE, name);
        return startPicker(id, i, (code, d) -> {
            try (OutputStream o = act.getContentResolver().openOutputStream(d.getData(), "wt")) {
                o.write(data);
            }
            return ok();
        });
    }

    // ---------- own themes (.cosmoutheme = a zip with theme.json and maybe music) ----------
    Object themePick(int id) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        return startPicker(id, i, (code, data) -> {
            Uri u = data.getData();
            String name = openableName(u).toLowerCase(Locale.ROOT);
            JSONObject o = new JSONObject();
            if (name.endsWith(".json")) {
                o.put("json", readText(u, 64 * 1024));
                return o;
            }
            // first pass: theme.json and the names of the music files
            String json = null;
            List<String> audio = new ArrayList<>();
            try (ZipInputStream z = new ZipInputStream(act.getContentResolver().openInputStream(u))) {
                ZipEntry e;
                while ((e = z.getNextEntry()) != null) {
                    if (e.isDirectory()) continue;
                    String base = new File(e.getName()).getName();
                    if (base.equalsIgnoreCase("theme.json")) json = new String(readAll(z, 64 * 1024), StandardCharsets.UTF_8);
                    else if (AUDIO.matcher(base).matches()) audio.add(e.getName());
                }
            } catch (Exception e) {
                return err("Could not read that file.");
            }
            if (json == null) return err("No theme.json found in that file.");
            o.put("json", json);
            String want = "";
            try {
                want = new File(new JSONObject(json).optString("music", "")).getName().toLowerCase(Locale.ROOT);
            } catch (Exception ignored) {
            }
            String pick = null;
            for (String n : audio) if (new File(n).getName().toLowerCase(Locale.ROOT).equals(want)) pick = n;
            if (pick == null && !audio.isEmpty()) pick = audio.get(0);
            if (pick != null) {
                String ext = pick.substring(pick.lastIndexOf('.')).toLowerCase(Locale.ROOT);
                File tmp = new File(act.getCacheDir(), "theme-music" + ext);
                try (ZipInputStream z = new ZipInputStream(act.getContentResolver().openInputStream(u))) {
                    ZipEntry e;
                    while ((e = z.getNextEntry()) != null) {
                        if (!e.getName().equals(pick)) continue;
                        try (OutputStream out = new FileOutputStream(tmp)) {
                            copy(z, out, 40L * 1048576);
                        } catch (IOException big) {
                            return err("The music file in that theme is too big (40 MB at most).");
                        }
                        break;
                    }
                }
                JSONObject m = new JSONObject();
                m.put("ext", ext);
                m.put("tmp", tmp.getName());
                o.put("music", m);
            }
            return o;
        });
    }

    Object themeInstall(String id, String json, String tmpName) throws Exception {
        if (!id.matches("u-[a-z0-9-]+")) return err("Unknown theme.");
        File dir = file("public/own-themes/" + id);
        if (dir == null) return err("Not allowed.");
        deleteTree(dir);
        dir.mkdirs();
        try (OutputStream o = new FileOutputStream(new File(dir, "theme.json"))) {
            o.write(json.getBytes(StandardCharsets.UTF_8));
        }
        if (tmpName != null && tmpName.matches("theme-music\\.[a-z0-9]+")) {
            File tmp = new File(act.getCacheDir(), tmpName);
            if (tmp.isFile()) {
                File to = new File(dir, "music" + tmpName.substring(tmpName.lastIndexOf('.')));
                if (!tmp.renameTo(to)) {
                    try (InputStream in = new FileInputStream(tmp); OutputStream out = new FileOutputStream(to)) {
                        copy(in, out, 40L * 1048576);
                    }
                    tmp.delete();
                }
            }
        }
        return ok();
    }

    Object themeExport(int id, String themeId, String name) throws Exception {
        if (!themeId.matches("u-[a-z0-9-]+")) return err("Unknown theme.");
        File dir = file("public/own-themes/" + themeId);
        if (dir == null || !dir.isDirectory()) return err("Unknown theme.");
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(buf)) {
            File[] files = dir.listFiles();
            if (files != null)
                for (File f : files) {
                    if (!f.getName().equals("theme.json") && !f.getName().startsWith("music.")) continue;
                    z.putNextEntry(new ZipEntry(f.getName()));
                    try (InputStream in = new FileInputStream(f)) {
                        copy(in, z, 60L * 1048576);
                    }
                    z.closeEntry();
                }
        }
        return saveFile(id, name, "application/zip", buf.toByteArray());
    }

    // ---------- helpers ----------
    static byte[] readAll(InputStream in, int max) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) {
            b.write(buf, 0, n);
            if (b.size() > max) throw new IOException("too big");
        }
        return b.toByteArray();
    }

    static void copy(InputStream in, OutputStream out, long max) throws IOException {
        byte[] buf = new byte[65536];
        long total = 0;
        int n;
        while ((n = in.read(buf)) > 0) {
            total += n;
            if (total > max) throw new IOException("too big");
            out.write(buf, 0, n);
        }
    }

    static boolean deleteTree(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteTree(k);
        return f.delete() || !f.exists();
    }

    // ---------- the other consoles: their games folder and their emulator app ----------
    // every file with one of the console's endings, in the folder and up to three folders deep
    Object scanFiles(String treeStr, String exts) {
        Uri tree = Uri.parse(treeStr);
        java.util.Set<String> want = new java.util.HashSet<>();
        for (String e : exts.split(",")) if (!e.isEmpty()) want.add("." + e.toLowerCase(Locale.ROOT));
        JSONArray out = new JSONArray();
        try {
            walk(tree, DocumentsContract.getTreeDocumentId(tree), want, out, 0);
        } catch (SecurityException e) {
            return err("CosmoU can’t read this games folder anymore. Choose it again in Settings → Cemu & Games.");
        } catch (Exception e) {
            return err("The games folder can’t be read: " + e.getMessage());
        }
        JSONObject r = ok();
        try {
            r.put("files", out);
        } catch (Exception ignored) {
        }
        return r;
    }

    void walk(Uri tree, String docId, java.util.Set<String> want, JSONArray out, int depth) throws Exception {
        for (Doc d : children(tree, docId)) {
            if (d.name == null || d.name.startsWith(".")) continue;
            if (d.dir()) {
                if (depth < 3) walk(tree, d.id, want, out, depth + 1);
                continue;
            }
            int dot = d.name.lastIndexOf('.');
            if (dot < 0 || !want.contains(d.name.substring(dot).toLowerCase(Locale.ROOT))) continue;
            JSONObject o = new JSONObject();
            o.put("name", d.name);
            o.put("uri", d.uri.toString());
            o.put("path", pathOf(d.id));
            o.put("size", d.size);
            out.put(o);
        }
    }

    // a file in the phone's own storage as a path (RetroArch and a few others want a path, not a link)
    static String pathOf(String docId) {
        if (docId != null && docId.startsWith("primary:")) return "/storage/emulated/0/" + docId.substring(8);
        if (docId != null && docId.matches("[0-9A-F]{4}-[0-9A-F]{4}:.*")) {
            int c = docId.indexOf(':');
            return "/storage/" + docId.substring(0, c) + "/" + docId.substring(c + 1);
        }
        return "";
    }

    Object forgetFolder(String treeStr) {
        try {
            act.getContentResolver().releasePersistableUriPermission(Uri.parse(treeStr), Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {
        }
        return ok();
    }

    // start a game in the console's emulator app; each app wants the game its own way (js/systems-data.js → ANDROID)
    Object launchEmu(JSONObject g) throws Exception {
        String pkg = g.getString("pkg"), how = g.optString("how", "view"), act1 = g.optString("activity", "");
        String uriStr = g.getString("uri"), path = g.optString("path", "");
        Uri u = Uri.parse(uriStr);
        PackageManager pm = act.getPackageManager();
        if (pm.getLaunchIntentForPackage(pkg) == null) return err("The emulator app isn’t installed anymore. Choose it again in Settings → Cemu & Games.");
        List<Intent> tries = new ArrayList<>();
        switch (how) {
            case "dolphin": {
                Intent i = new Intent(Intent.ACTION_MAIN);
                i.addCategory("android.intent.category.LEANBACK_LAUNCHER");
                i.setClassName(pkg, act1);
                i.putExtra("AutoStartFile", uriStr);
                tries.add(i);
                break;
            }
            case "yuzu": {
                Intent i = new Intent("android.nfc.action.TECH_DISCOVERED");
                i.setClassName(pkg, act1);
                i.setData(u);
                tries.add(i);
                break;
            }
            case "retroarch": {
                if (path.isEmpty()) return err("RetroArch needs games in the phone’s own storage (not on a memory card or in the cloud).");
                Intent i = new Intent(Intent.ACTION_MAIN);
                i.setClassName(pkg, act1);
                i.putExtra("ROM", path);
                i.putExtra("LIBRETRO", "/data/data/" + pkg + "/cores/" + g.optString("core", "") + "_libretro_android.so");
                i.putExtra("CONFIGFILE", "/storage/emulated/0/Android/data/" + pkg + "/files/retroarch.cfg");
                i.putExtra("IME", android.provider.Settings.Secure.getString(act.getContentResolver(), android.provider.Settings.Secure.DEFAULT_INPUT_METHOD));
                i.putExtra("DATADIR", "/data/data/" + pkg);
                tries.add(i);
                break;
            }
            case "extra": {
                Intent i = pm.getLaunchIntentForPackage(pkg);
                i.putExtra(g.optString("extra", "uri"), uriStr);
                tries.add(i);
                break;
            }
            case "extra-path": {
                Intent i = pm.getLaunchIntentForPackage(pkg);
                i.putExtra(g.optString("extra", "path"), path);
                tries.add(i);
                break;
            }
        }
        // most emulators open a game they are given like a file manager would
        String type = act.getContentResolver().getType(u);
        Intent v1 = new Intent(Intent.ACTION_VIEW);
        v1.setDataAndType(u, type == null ? "application/octet-stream" : type);
        v1.setPackage(pkg);
        tries.add(v1);
        Intent v2 = new Intent(Intent.ACTION_VIEW, u);
        v2.setPackage(pkg);
        tries.add(v2);
        for (Intent i : tries) {
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            i.setClipData(ClipData.newRawUri("game", u));
            try {
                act.startActivity(i);
                Log.i(TAG, "started " + pkg + " (" + how + ")");
                return ok();
            } catch (ActivityNotFoundException | SecurityException e) {
                Log.w(TAG, "launch " + pkg + " " + how + ": " + e);
            }
        }
        return err("This emulator app can’t be given a game by other apps. Start the game in the emulator itself.");
    }
}

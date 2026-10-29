package com.cosmou.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * CosmoU for Android: one full-screen WebView showing the same window as the desktop app
 * (index.html, css, js from the app's assets). The page talks to Android through {@link Bridge}
 * ("CosmoNative" in JavaScript, see js/android-api.js).
 */
public class MainActivity extends Activity {
    static final String TAG = "CosmoU";
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/assets/www/index.html";

    WebView web;
    Bridge bridge;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        // the automatic test starts CosmoU with "cosmou_test" (only adb can look into the page then)
        String test = getIntent().getStringExtra("cosmou_test");
        if (test != null) {
            Bridge.testStart = test;
            Bridge.testQuiet = getIntent().getBooleanExtra("cosmou_quiet", false);
            Log.i(TAG, "test mode");
        }
        if (debuggable || test != null) WebView.setWebContentsDebuggingEnabled(true);

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(0xf4, 0xf9, 0xfb));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " CosmoU-Android");
        // CosmoU draws its own dark mode; Android must not darken the page on top of it
        if (Build.VERSION.SDK_INT >= 33) s.setAlgorithmicDarkening(false);
        else if (Build.VERSION.SDK_INT >= 29) noForceDark(s);

        bridge = new Bridge(this, web);
        web.addJavascriptInterface(bridge, "CosmoNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                return serve(u.getPath());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.i(TAG, "page finished: " + url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, android.webkit.WebResourceError err) {
                Log.w(TAG, "load error: " + req.getUrl() + " " + err.getErrorCode() + " " + err.getDescription());
            }

            // if the page's drawing process stops, start the page again instead of closing CosmoU
            @Override
            public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail d) {
                Log.e(TAG, "page process gone, crashed=" + d.didCrash());
                recreate();
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                // links to other sites open in the browser
                if ("https".equals(u.getScheme())) bridge.openUrl(u.toString());
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                Log.i(TAG, "page: " + m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
                return true;
            }
        });
        setContentView(web);
        immersive();
        // the automatic test can open a plain page instead, to tell problems of the device from problems of CosmoU's page
        String plain = test != null ? getIntent().getStringExtra("cosmou_plain") : null;
        if (plain != null) web.loadDataWithBaseURL("https://" + HOST + "/", "<html><body><h1>" + plain + "</h1></body></html>", "text/html", "utf-8", null);
        else if (saved == null) web.loadUrl(START);
        else web.restoreState(saved);
    }

    @SuppressWarnings("deprecation")
    static void noForceDark(WebSettings s) {
        s.setForceDark(WebSettings.FORCE_DARK_OFF);
    }

    // Android's dark mode switched on or off: "System" in CosmoU follows it
    @Override
    public void onConfigurationChanged(android.content.res.Configuration c) {
        super.onConfigurationChanged(c);
        boolean night = (c.uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES;
        js("window.__cosmoEvent && __cosmoEvent('night','" + night + "')");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    // ---------- files for the page ----------
    // /assets/... comes from the app itself, /files/... from the app's "public" folder (covers, music, own themes)
    static final Map<String, String> MIME = new HashMap<>();

    static {
        MIME.put("html", "text/html");
        MIME.put("css", "text/css");
        MIME.put("js", "text/javascript");
        MIME.put("json", "application/json");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("webp", "image/webp");
        MIME.put("svg", "image/svg+xml");
        MIME.put("gif", "image/gif");
        MIME.put("ogg", "audio/ogg");
        MIME.put("mp3", "audio/mpeg");
        MIME.put("wav", "audio/wav");
        MIME.put("m4a", "audio/mp4");
        MIME.put("flac", "audio/flac");
        MIME.put("woff2", "font/woff2");
        MIME.put("ttf", "font/ttf");
    }

    WebResourceResponse serve(String path) {
        if (path == null) return null;
        String ext = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1).toLowerCase() : "";
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        String enc = mime.startsWith("text/") || mime.endsWith("json") ? "utf-8" : null;
        Map<String, String> head = new HashMap<>();
        head.put("Cache-Control", "no-cache");
        try {
            InputStream in;
            if (path.startsWith("/assets/")) {
                String rel = path.substring("/assets/".length());
                if (rel.contains("..")) return notFound();
                in = getAssets().open(rel);
            } else if (path.startsWith("/files/")) {
                File f = bridge.file("public/" + path.substring("/files/".length()));
                if (f == null || !f.isFile()) return notFound();
                in = new FileInputStream(f);
            } else return notFound();
            WebResourceResponse r = new WebResourceResponse(mime, enc, in);
            r.setResponseHeaders(head);
            return r;
        } catch (Exception e) {
            Log.w(TAG, "not found: " + path + " (" + e + ")");
            return notFound();
        }
    }

    static WebResourceResponse notFound() {
        WebResourceResponse r = new WebResourceResponse("text/plain", "utf-8", null);
        r.setStatusCodeAndReasonPhrase(404, "Not Found");
        return r;
    }

    // ---------- full screen ----------
    void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    // ---------- coming back from Cemu (play time) and leaving (music stops) ----------
    @Override
    protected void onPause() {
        super.onPause();
        js("dispatchEvent(new Event('blur'))");
    }

    @Override
    protected void onResume() {
        super.onResume();
        immersive();
        js("window.__cosmoEvent && __cosmoEvent('resumed','{}'); dispatchEvent(new Event('focus'))");
    }

    void js(String code) {
        if (web != null) web.post(() -> web.evaluateJavascript(code, null));
    }

    // ---------- back button: closes the top window inside CosmoU first ----------
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("window.__cosmoBack ? __cosmoBack() : false", v -> {
            if (!"true".equals(v)) moveTaskToBack(true);
        });
    }

    // ---------- game controllers: their buttons go to the page as a "gamepad" ----------
    static final Map<Integer, Integer> PAD = new HashMap<>();

    static {
        PAD.put(KeyEvent.KEYCODE_BUTTON_A, 0);
        PAD.put(KeyEvent.KEYCODE_BUTTON_B, 1);
        PAD.put(KeyEvent.KEYCODE_BUTTON_X, 2);
        PAD.put(KeyEvent.KEYCODE_BUTTON_Y, 3);
        PAD.put(KeyEvent.KEYCODE_BUTTON_L1, 4);
        PAD.put(KeyEvent.KEYCODE_BUTTON_R1, 5);
        PAD.put(KeyEvent.KEYCODE_BUTTON_L2, 6);
        PAD.put(KeyEvent.KEYCODE_BUTTON_R2, 7);
        PAD.put(KeyEvent.KEYCODE_BUTTON_SELECT, 8);
        PAD.put(KeyEvent.KEYCODE_BUTTON_START, 9);
        PAD.put(KeyEvent.KEYCODE_BUTTON_THUMBL, 10);
        PAD.put(KeyEvent.KEYCODE_BUTTON_THUMBR, 11);
        PAD.put(KeyEvent.KEYCODE_DPAD_UP, 12);
        PAD.put(KeyEvent.KEYCODE_DPAD_DOWN, 13);
        PAD.put(KeyEvent.KEYCODE_DPAD_LEFT, 14);
        PAD.put(KeyEvent.KEYCODE_DPAD_RIGHT, 15);
        PAD.put(KeyEvent.KEYCODE_BUTTON_MODE, 16);
    }

    static boolean fromPad(int source) {
        return (source & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD
                || (source & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        Integer b = PAD.get(e.getKeyCode());
        boolean pad = fromPad(e.getSource()) || KeyEvent.isGamepadButton(e.getKeyCode());
        // a TV remote's D-pad and OK button act like a controller too
        boolean remote = (e.getSource() & InputDevice.SOURCE_DPAD) == InputDevice.SOURCE_DPAD
                && (b != null || e.getKeyCode() == KeyEvent.KEYCODE_DPAD_CENTER);
        if (e.getKeyCode() == KeyEvent.KEYCODE_DPAD_CENTER) b = 0;
        // controllers: all their buttons go to the page's "gamepad" (js/android-api.js), so they act the same on every device
        if (b != null && pad) {
            if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) js("window.__cosmoPad&&__cosmoPad(" + b + ",true)");
            else if (e.getAction() == KeyEvent.ACTION_UP) js("window.__cosmoPad&&__cosmoPad(" + b + ",false)");
            return true;
        }
        // keyboards and TV remotes: the page's own key handling (arrows, Enter, Esc) first
        if (super.dispatchKeyEvent(e)) return true;
        if (b != null && remote) {
            if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) js("window.__cosmoPad&&__cosmoPad(" + b + ",true)");
            else if (e.getAction() == KeyEvent.ACTION_UP) js("window.__cosmoPad&&__cosmoPad(" + b + ",false)");
            return true;
        }
        return false;
    }

    float lastX, lastY, hatX, hatY;

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        if (fromPad(e.getSource()) && e.getAction() == MotionEvent.ACTION_MOVE) {
            float x = dz(e.getAxisValue(MotionEvent.AXIS_X)), y = dz(e.getAxisValue(MotionEvent.AXIS_Y));
            if (x != lastX || y != lastY) {
                lastX = x;
                lastY = y;
                js("window.__cosmoPad&&__cosmoPad(-1,false," + x + "," + y + ")");
            }
            // many controllers send their D-pad as a "hat"
            float hx = e.getAxisValue(MotionEvent.AXIS_HAT_X), hy = e.getAxisValue(MotionEvent.AXIS_HAT_Y);
            if (hx != hatX) {
                if (hatX < 0) js("__cosmoPad(14,false)");
                if (hatX > 0) js("__cosmoPad(15,false)");
                if (hx < 0) js("__cosmoPad(14,true)");
                if (hx > 0) js("__cosmoPad(15,true)");
                hatX = hx;
            }
            if (hy != hatY) {
                if (hatY < 0) js("__cosmoPad(12,false)");
                if (hatY > 0) js("__cosmoPad(13,false)");
                if (hy < 0) js("__cosmoPad(12,true)");
                if (hy > 0) js("__cosmoPad(13,true)");
                hatY = hy;
            }
            return true;
        }
        return super.dispatchGenericMotionEvent(e);
    }

    static float dz(float v) {
        return Math.abs(v) < 0.2f ? 0 : Math.round(v * 100) / 100f;
    }

    // ---------- results of the system's file, folder and app pickers ----------
    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        bridge.onResult(request, result, data);
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}

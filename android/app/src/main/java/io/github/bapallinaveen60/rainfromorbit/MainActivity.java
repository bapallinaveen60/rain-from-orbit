package io.github.bapallinaveen60.rainfromorbit;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rain from Orbit as an Android app: the web book, bundled in assets/www, in a full-screen
 * WebView. Files are served from a private https origin, so the book's workers, WebAssembly
 * and local storage behave exactly as they do on the website, and it all works offline.
 */
public class MainActivity extends Activity {

    /** Android's reserved host for app-served content; it never reaches the network. */
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/";
    private static final int REQ_CHOOSE = 1;
    private static final int REQ_SAVE = 2;

    private FrameLayout root;
    private WebView web;
    private String bridgeJs;
    private ValueCallback<Uri[]> chooserCallback;

    // What the next "Save as" writes: bytes from the page (notes export) or a bundled file (PDF).
    private byte[] pendingBytes;
    private String pendingAsset;
    private String pendingMime;

    private OnBackInvokedCallback backCallback;
    private boolean backRegistered;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        setContentView(root);
        edgeToEdge();
        bridgeJs = readAsset("bridge.js");
        createWebView();
        if (state == null || web.restoreState(state) == null) web.loadUrl(HOME);
        setUpBack();
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void createWebView() {
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        WebView.setWebContentsDebuggingEnabled(
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        web.addJavascriptInterface(new Bridge(), "RainApp");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
    }

    // ---- serving the bundled site -------------------------------------------------------

    private class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri url = req.getUrl();
            if (!HOST.equals(url.getHost())) return null; // map tiles etc. go to the network
            String path = url.getPath();
            if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
            String mime = mimeOf(path);
            String charset = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("xml")
                    ? "utf-8" : null;
            try {
                WebResourceResponse res = new WebResourceResponse(mime, charset, getAssets().open("www" + path));
                res.setResponseHeaders(Collections.singletonMap("Cache-Control", "no-cache"));
                return res;
            } catch (IOException e) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri url = req.getUrl();
            if (HOST.equals(url.getHost())) return false;
            // Anything outside the book (GitHub, NASA, references) opens in the phone's browser.
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, url));
            } catch (ActivityNotFoundException e) {
                toast(R.string.no_app);
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (bridgeJs != null) view.evaluateJavascript(bridgeJs, null);
        }

        @Override
        public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            updateBack();
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // The page's process died (usually memory); start again rather than crash the app.
            root.removeView(web);
            web.destroy();
            web = null;
            recreate();
            return true;
        }
    }

    private static String mimeOf(String path) {
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        switch (ext) {
            case "html": return "text/html";
            case "js": case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "wasm": return "application/wasm";
            case "pdf": return "application/pdf";
            case "h5": case "hdf5": return "application/x-hdf5";
            case "txt": return "text/plain";
            default: return "application/octet-stream";
        }
    }

    // ---- file picker (granule explorer, notes import) -----------------------------------

    private class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (chooserCallback != null) chooserCallback.onReceiveValue(null);
            chooserCallback = callback;
            // Any file type: Android has no MIME type for .HDF5, so filtering would hide granules.
            Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("*/*")
                    .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
            try {
                startActivityForResult(pick, REQ_CHOOSE);
                return true;
            } catch (ActivityNotFoundException e) {
                chooserCallback = null;
                return false;
            }
        }
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == REQ_CHOOSE && chooserCallback != null) {
            Uri[] picked = null;
            if (result == RESULT_OK && data != null) {
                ClipData clip = data.getClipData();
                if (clip != null) {
                    picked = new Uri[clip.getItemCount()];
                    for (int i = 0; i < picked.length; i++) picked[i] = clip.getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    picked = new Uri[] {data.getData()};
                }
            }
            chooserCallback.onReceiveValue(picked);
            chooserCallback = null;
        } else if (request == REQ_SAVE) {
            if (result == RESULT_OK && data != null && data.getData() != null) writePending(data.getData());
            pendingBytes = null;
            pendingAsset = null;
        }
    }

    // ---- downloads: "Save as", then open PDFs -------------------------------------------

    private void saveAs(String name, String mime) {
        pendingMime = mime;
        Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(mime)
                .putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(save, REQ_SAVE);
        } catch (ActivityNotFoundException e) {
            toast(R.string.no_app);
        }
    }

    private void writePending(Uri target) {
        try (OutputStream out = getContentResolver().openOutputStream(target)) {
            if (out == null) throw new IOException("no output stream");
            if (pendingBytes != null) {
                out.write(pendingBytes);
            } else if (pendingAsset != null) {
                try (InputStream in = getAssets().open(pendingAsset)) {
                    copy(in, out);
                }
            }
        } catch (IOException | SecurityException e) {
            toast(R.string.save_failed);
            return;
        }
        if ("application/pdf".equals(pendingMime)) {
            Intent view = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(target, pendingMime)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            try {
                startActivity(view);
                return;
            } catch (ActivityNotFoundException ignored) {
                // saved, just nothing to show it with
            }
        }
        toast(R.string.saved);
    }

    /** Called from bridge.js. JavaScript calls arrive on a background thread. */
    private class Bridge {
        @JavascriptInterface
        public void saveFile(String name, String mime, String base64) {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            runOnUiThread(() -> {
                pendingBytes = bytes;
                pendingAsset = null;
                saveAs(name, mime);
            });
        }

        @JavascriptInterface
        public void saveAsset(String path, String name) {
            runOnUiThread(() -> {
                pendingBytes = null;
                pendingAsset = "www" + path;
                saveAs(name, mimeOf(path));
            });
        }

        @JavascriptInterface
        public void copy(String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = getSystemService(ClipboardManager.class);
                cm.setPrimaryClip(ClipData.newPlainText(getString(R.string.app_name), text));
                // Android 13+ shows its own confirmation.
                if (Build.VERSION.SDK_INT < 33) toast(R.string.copied);
            });
        }

        @JavascriptInterface
        public void setBars(String cssColor) {
            Integer color = parseCssColor(cssColor);
            if (color != null) runOnUiThread(() -> applyBarColor(color));
        }
    }

    // ---- system bars --------------------------------------------------------------------

    private void edgeToEdge() {
        if (Build.VERSION.SDK_INT < 30) return; // older phones keep the theme's coloured bars
        Window w = getWindow();
        w.setDecorFitsSystemWindows(false);
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.TRANSPARENT);
        // Pad the page clear of the bars, cutouts and keyboard; the padding shows the page colour.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            Insets i = insets.getInsets(WindowInsets.Type.systemBars()
                    | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
            v.setPadding(i.left, i.top, i.right, i.bottom);
            return WindowInsets.CONSUMED;
        });
    }

    @SuppressWarnings("deprecation")
    private void applyBarColor(int color) {
        root.setBackgroundColor(color);
        boolean light = (0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)) > 140;
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            int both = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            WindowInsetsController c = w.getInsetsController();
            if (c != null) c.setSystemBarsAppearance(light ? both : 0, both);
        } else {
            w.setStatusBarColor(color);
            w.setNavigationBarColor(color);
            View decor = w.getDecorView();
            int flags = decor.getSystemUiVisibility();
            int lightFlags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    | (Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0);
            decor.setSystemUiVisibility(light ? flags | lightFlags : flags & ~lightFlags);
        }
    }

    private static final Pattern RGB = Pattern.compile("rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)");

    private static Integer parseCssColor(String css) {
        if (css == null) return null;
        Matcher m = RGB.matcher(css);
        if (!m.find()) return null;
        return Color.rgb(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)));
    }

    // ---- back button: page history first, then leave ------------------------------------

    private void setUpBack() {
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = () -> {
                if (web != null && web.canGoBack()) web.goBack();
            };
        }
        updateBack();
    }

    /** Only claim the back gesture while there is page history, so Android's own back-to-home still works. */
    private void updateBack() {
        if (Build.VERSION.SDK_INT < 33 || backCallback == null || web == null) return;
        boolean want = web.canGoBack();
        if (want == backRegistered) return;
        OnBackInvokedDispatcher d = getOnBackInvokedDispatcher();
        if (want) d.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        else d.unregisterOnBackInvokedCallback(backCallback);
        backRegistered = want;
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    // ---- lifecycle ----------------------------------------------------------------------

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    // ---- helpers ------------------------------------------------------------------------

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            copy(in, out);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (IOException e) {
            return null;
        }
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buf = new byte[64 * 1024];
        for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
    }

    private void toast(int text) {
        Toast.makeText(this, text, Toast.LENGTH_SHORT).show();
    }
}

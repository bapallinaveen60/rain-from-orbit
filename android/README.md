# Rain from Orbit for Android

The Rain from Orbit book (the React web app in the folder above this one) packaged as an Android app.
The whole site is bundled in the APK, so the book, the simulators, the quizzes and the granule
explorer all work offline. Only the explorer's background map tiles need a connection.

- Package: `io.github.bapallinaveen60.rainfromorbit`
- Android 7.0 (API 24) and up; built for API 36
- Plain Java, no libraries: one activity with a WebView (`MainActivity.java`)

## Open in Android Studio

1. **File → Open…** and pick this `android` folder (not the repo root).
2. Let Gradle sync. It uses Gradle 8.14.3 and Android Gradle Plugin 8.13.0.
3. Press **Run ▶** with a phone plugged in (USB debugging on) or an emulator.

## Make an APK to share

**Quick (debug-signed):** **Build → Generate App Bundles or APKs → Generate APKs**, or:

```bash
./gradlew assembleDebug
```

The APK is `app/build/outputs/apk/debug/app-debug.apk`. Anyone can install it by allowing
"Install unknown apps" for the app they open it with (Files, WhatsApp, Drive…).

**Proper release (recommended for sharing widely):**

1. **Build → Generate Signed App Bundle or APK → APK**.
2. **Create new…** keystore. Keep the `.jks` file and its passwords safe: every future update
   must be signed with the same key, or phones will refuse to install it over the old one.
3. Choose **release** and finish. The APK is in `app/release/`.

To sign release builds from the command line instead, create `keystore.properties` here (it's
in `.gitignore`):

```properties
storeFile=rain-from-orbit.jks
storePassword=…
keyAlias=rain-from-orbit
keyPassword=…
```

and run `./gradlew assembleRelease` → `app/build/outputs/apk/release/app-release.apk`.

For Google Play, use **Android App Bundle** instead of APK in step 1.

## Updating the book inside the app

The web build lives in `app/src/main/assets/www`. After changing the web app, rebuild it from
the web project, then rebuild the APK:

```bash
cd ..
npm run build:android
```

`build:android` builds with `--mode android` (no service worker, since the APK already holds
every file) straight into `android/app/src/main/assets/www`, and drops the two A5 PDFs the book never
links to. Bump `versionCode` and `versionName` in `app/build.gradle` before sharing an update.

## How it works

- Files are served from `https://appassets.androidplatform.net/`, a private address that never
  reaches the network, so workers, WebAssembly and saved progress behave as on the website.
- `assets/bridge.js` is injected into the page and passes on what a WebView can't do itself:
  - **PDF edition**: saved where you choose, then opened.
  - **Notes export**: saved as a `.json` file.
  - **Copy storm link**: copies a link to the live website, which works for anyone.
  - **System bars**: they follow the page colour in light and dark themes.
- **Open a granule…** and notes import use Android's file picker (any file type, since HDF5 has
  no Android MIME type).
- Links outside the book open in the phone's browser; the back button walks back through pages.

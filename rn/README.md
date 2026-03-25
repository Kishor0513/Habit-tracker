# Habit Tracker (React Native + Web)

This folder contains an **Expo (React Native)** version of the Habit Tracker that runs on:

- **Android** (device/emulator)
- **Web** (React Native Web via Expo)

## Setup

```bash
cd rn
npm install
```

## Run

```bash
# web
npm run web

# android
npm run android
```

## Build an APK (no Play Store)

Recommended: use **EAS Build** (Expo cloud build). It produces an `.apk` you can upload to GitHub Releases or share directly.

From `rn/`:

```powershell
# login once
npx.cmd eas-cli@latest login

# build an APK (see rn/eas.json)
npx.cmd eas-cli@latest build -p android --profile apk
```

When the build finishes, EAS will show a download link. Download the `.apk`.

### Build on GitHub (Actions)

This repo includes a GitHub Actions workflow at `.github/workflows/android-apk.yml` that can build an APK for you.

1. Create an Expo access token (in your Expo account) and add it to your GitHub repo as a secret:
   - Secret name: `EAS_ACCESS_TOKEN`
2. On GitHub: **Actions** → **Build Android APK (Expo EAS)** → **Run workflow**
3. Download the APK from the workflow **Artifacts**

If you push a tag like `apk-v1.0.0`, the workflow also attaches the APK to a GitHub **Release**.

### Put the APK on GitHub

Best option: GitHub **Releases** (don’t commit APKs into the repo).

1. Open your repo on GitHub → **Releases** → **Draft a new release**
2. Upload the downloaded `.apk` as an asset
3. Publish the release

### If Expo fails to write to `C:\\Users\\<you>\\.expo` (EPERM)

Set `EXPO_HOME` to a writable folder (example from repo root):

```powershell
$env:EXPO_HOME = (Resolve-Path .\\rn\\.expo).Path
```

## Supabase (optional cloud sync)

1. Copy `rn/.env.example` to `rn/.env`
2. Fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

If Supabase env vars are not set, the app runs in **local-only mode** using AsyncStorage.

### Magic-link note (Android)

`app.json` uses the Expo scheme `habit-tracker://`. If you use magic links, configure your Supabase Auth redirect/deep link URLs accordingly.

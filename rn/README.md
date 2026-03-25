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

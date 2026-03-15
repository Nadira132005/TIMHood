# Frontend

## Run On Android Phone Over USB

These steps match commit `e010a0f` (`Better UI`).

### 1. Install dependencies

From the repo `main/` folder:

```bash
npm install
```

### 2. Start MongoDB

In terminal 1:

```bash
/opt/homebrew/opt/mongodb-community/bin/mongod --config /opt/homebrew/etc/mongod.conf
```

### 3. Start backend

In terminal 2:

```bash
cd /Users/sergiubodrogean/Desktop/2026/TIMHood/main
npm run dev:backend
```

Expected output:

```bash
Backend listening on 0.0.0.0:4000
```

### 4. Check Android device over USB

In terminal 3:

```bash
/Users/sergiubodrogean/Library/Android/sdk/platform-tools/adb devices
```

Your phone must appear as `device`.

### 5. Install the Android debug app

Still in terminal 3:

```bash
cd /Users/sergiubodrogean/Desktop/2026/TIMHood/main/frontend/android
./gradlew installDebug
```

### 6. Start Metro for the development build

In terminal 4:

```bash
cd /Users/sergiubodrogean/Desktop/2026/TIMHood/main/frontend
npx expo start --dev-client --clear --port 8081
```

Do not switch to port `8082`. If `8081` is busy, stop the other Metro process first.

### 7. Forward ports over USB

Back in terminal 3:

```bash
/Users/sergiubodrogean/Library/Android/sdk/platform-tools/adb reverse tcp:8081 tcp:8081
/Users/sergiubodrogean/Library/Android/sdk/platform-tools/adb reverse tcp:4000 tcp:4000
```

### 8. Open the app

Open the installed app on the phone.

If it does not attach automatically, run:

```bash
/Users/sergiubodrogean/Library/Android/sdk/platform-tools/adb shell am start -a android.intent.action.VIEW -d 'com.timhood.app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' com.timhood.app
```

## Demo Login

This app still requires the backend even for demo login.

- Open `Connection settings`
- Set backend URL to `http://127.0.0.1:4000/api`
- Use demo CAN `0000`, `0001`, or `0002`

Without MongoDB and the backend, login will fail.

## Current structure

- `src/app`: shell and top-level tab experience
- `src/features`: domain feature screens
- `src/shared`: UI primitives, theme tokens, API client, shared types/state

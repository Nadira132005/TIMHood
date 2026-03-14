# TimHoodNfc

Android React Native app for reading Romanian CEI data from an Android phone over NFC.

## What it does

- Detects NFC support and whether NFC is enabled on the Android device
- Collects the 6-digit CAN before starting contactless access
- Keeps the APDU tooling for CEI probing and debugging
- Includes a native Android `PACE` path using `JMRTD`
- Reads `DG1` after successful `PACE` and shows:
  - full name
  - document number
  - issuing state
  - nationality
  - date of birth
  - date of expiry

## Important limitation

This build currently reads the CEI holder identity fields through `CAN + PACE + DG1`. It does **not** yet export PDF files, use the CEI authentication PIN in the working path, or read richer personal/address/photo data groups.

## Install dependencies

```sh
npm install
```

## Run on an Android phone

1. Install Android Studio and the Android SDK.
2. Enable `Developer options` and `USB debugging` on the phone.
3. Connect the phone by USB.
4. Verify that `adb` sees the device:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
adb devices
```

5. Start Metro from the project root:

```sh
npm start
```

6. In another terminal, expose Metro to the phone and install the app:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
adb reverse tcp:8081 tcp:8081
npx react-native run-android
```

7. Open the app on the phone.
8. Enter the 6-digit `CAN`.
9. Tap `Native PACE Name`.
10. Hold the Romanian ID card steady on the NFC area of the phone until the read completes.

## Build and install the debug APK manually

```sh
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Android notes

- The app includes the `android.permission.NFC` permission
- NFC hardware is marked as optional so the app can still install on devices without NFC
- Testing requires a real Android phone with NFC; emulators generally do not expose real NFC hardware
- The current working read path uses `CAN + PACE`; the CEI authentication PIN is not yet part of the successful native flow

# TimHoodNfc

Android React Native app for starting Romanian CEI NFC access from an Android phone.

## What it does

- Detects NFC support and whether NFC is enabled on the Android device
- Collects the 6-digit CAN before starting contactless access
- Collects the 4-digit authentication PIN as a separate credential for later identity operations
- Scans a nearby NFC tag using `react-native-nfc-manager`
- Shows raw tag metadata from Android
- Opens an `IsoDep` session and sends probe APDUs to test for a standard ICAO applet
- Shows APDU command and response status words

## Important limitation

This build does **not** yet read CEI data groups from the secure session. It validates the access inputs, opens an `IsoDep` transport, and probes the chip with basic APDUs, but actual CEI reading still needs the Romanian secure-access flow and protected file parsing.

## Run

```sh
npm install
npm start
```

In another terminal:

```sh
npm run android
```

## Android notes

- The app includes the `android.permission.NFC` permission
- NFC hardware is marked as optional so the app can still install on devices without NFC
- Testing requires a real Android phone with NFC; emulators generally do not expose real NFC hardware
- The Romanian CEI flow distinguishes CAN-based chip access from PIN-based authentication

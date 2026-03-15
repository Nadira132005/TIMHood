import "tsx/cjs";
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Timhood",
  slug: "timhood",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  splash: {
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      backgroundColor: "#ffffff",
    },
    package: "com.timhood.app",
  },
  web: {
    bundler: "metro",
  },
  plugins: [
    "./plugins/with-cei-reader.ts",
    "./plugins/with-disable-jetifier.ts",
    [
      "expo-build-properties",
      {
        android: {
          packagingOptions: {
            exclude: ["META-INF/versions/9/OSGI-INF/MANIFEST.MF"],
          },
        },
      },
    ],
  ],
});

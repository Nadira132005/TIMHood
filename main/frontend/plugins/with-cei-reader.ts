import {
  AndroidConfig,
  ConfigPlugin,
  withAppBuildGradle,
  withDangerousMod,
  withAndroidManifest,
  withMainApplication,
} from "expo/config-plugins";
import fs from "fs";
import path from "path";

const PACKAGE_NAME = "com.timhood.app";
const MODULE_CLASS = "CeiNativeReaderModule";
const PACKAGE_CLASS = "CeiNativeReaderPackage";

function ensureDependency(contents: string, dependency: string) {
  if (contents.includes(dependency)) {
    return contents;
  }

  return contents.replace(
    /dependencies\s*{/,
    `dependencies {
    implementation "${dependency}"`,
  );
}

function ensureImport(contents: string, importLine: string) {
  if (contents.includes(importLine)) {
    return contents;
  }

  const packageRegex = /package\s+[\w.]+\s*/;
  const match = contents.match(packageRegex);

  if (match) {
    const insertAt = match.index! + match[0].length;
    return `${contents.slice(0, insertAt)}\n${importLine}\n${contents.slice(insertAt)}`;
  }

  return `${importLine}\n${contents}`;
}

function ensureKotlinPackageRegistration(contents: string) {
  if (contents.includes(`${PACKAGE_CLASS}()`)) {
    return contents;
  }

  // Kotlin RN template usually looks like:
  // override fun getPackages(): List<ReactPackage> =
  //   PackageList(this).packages.apply {
  //     ...
  //   }
  contents = contents.replace(
    /PackageList\(this\)\.packages\.apply\s*\{/,
    `PackageList(this).packages.apply {
        add(${PACKAGE_CLASS}())`,
  );

  return contents;
}

const withCeiReader: ConfigPlugin = (config) => {
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;

      const srcDir = path.join(projectRoot, "plugins", "java");
      const destDir = path.join(
        platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        ...PACKAGE_NAME.split("."),
      );

      console.log(destDir);

      fs.mkdirSync(destDir, { recursive: true });

      const files = [`${MODULE_CLASS}.kt`, `${PACKAGE_CLASS}.kt`];

      for (const file of files) {
        const source = path.join(srcDir, file);
        const dest = path.join(destDir, file);

        if (!fs.existsSync(source)) {
          throw new Error(`[with-cei-reader] Missing source file: ${source}`);
        }

        fs.copyFileSync(source, dest);
      }

      return config;
    },
  ]);

  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      throw new Error(
        "[with-cei-reader] Only Groovy app/build.gradle is supported right now.",
      );
    }

    let contents = config.modResults.contents;
    contents = ensureDependency(contents, "org.jmrtd:jmrtd:0.7.42");
    contents = ensureDependency(
      contents,
      "net.sf.scuba:scuba-sc-android:0.0.24",
    );
    config.modResults.contents = contents;
    return config;
  });

  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    const importLine = `import ${PACKAGE_NAME}.${PACKAGE_CLASS}`;

    if (config.modResults.language === "kt") {
      contents = ensureImport(contents, importLine);
      contents = ensureKotlinPackageRegistration(contents);
    } else {
      // Java fallback
      if (!contents.includes(importLine)) {
        contents = contents.replace(
          /import com\.facebook\.react\.ReactPackage;/,
          `import com.facebook.react.ReactPackage;
${importLine};`,
        );
      }

      if (!contents.includes(`new ${PACKAGE_CLASS}()`)) {
        contents = contents.replace(
          /return packages;/,
          `packages.add(new ${PACKAGE_CLASS}());
      return packages;`,
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest["uses-permission"] = manifest["uses-permission"] ?? [];
    manifest["uses-feature"] = manifest["uses-feature"] ?? [];

    const permissions = manifest["uses-permission"];
    const features = manifest["uses-feature"];

    const hasNfcPermission = permissions.some(
      (p: any) => p?.$?.["android:name"] === "android.permission.NFC",
    );

    if (!hasNfcPermission) {
      permissions.push({
        $: { "android:name": "android.permission.NFC" },
      });
    }

    const hasNfcFeature = features.some(
      (f: any) => f?.$?.["android:name"] === "android.hardware.nfc",
    );

    if (!hasNfcFeature) {
      features.push({
        $: {
          "android:name": "android.hardware.nfc",
          "android:required": "true",
        },
      });
    }

    return config;
  });

  return config;
};

export default withCeiReader;

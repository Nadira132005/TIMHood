import { ConfigPlugin, withGradleProperties } from "expo/config-plugins";

const withDisableJetifier: ConfigPlugin = (config) => {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    const setProp = (key: string, value: string) => {
      const existing = props.find(
        (p) => p.type === "property" && p.key === key,
      );
      if (existing) {
        // @ts-ignore
        existing.value = value;
      } else {
        props.push({ type: "property", key, value });
      }
    };

    setProp("android.useAndroidX", "true");
    setProp("android.enableJetifier", "false");

    return config;
  });
};

export default withDisableJetifier;

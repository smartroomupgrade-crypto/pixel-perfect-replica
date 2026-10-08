import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.smartroom.remote",
  appName: "Smart Room Remote Monitoring",
  webDir: "dist/client",
  android: {
    // Allow cleartext HTTP so the app can talk to the local Wi-Fi gateway
    // (e.g. http://192.168.x.x) on the home network.
    allowMixedContent: true,
  },
  server: {
    // Local gateway uses plain HTTP on the LAN; remote traffic stays HTTPS.
    cleartext: true,
  },
};

export default config;

// Helpers for running inside the Android app (Capacitor).
// The Android app ships the screens inside the APK, so the app's online
// features (ThingSpeak, Telegram, remote control) must be called on the
// published web address instead of the phone itself.

/** Origins the Android WebView uses when serving the bundled app. */
export const NATIVE_ORIGINS = ["https://localhost", "http://localhost", "capacitor://localhost"];

/** Published web address the Android app sends its online requests to. Set at APK build time. */
export const APP_SERVER_URL = String(import.meta.env.VITE_APP_SERVER_URL ?? "").replace(/\/+$/, "");

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** Resolve a relative server-function URL to the published address when running in the Android app. */
export function resolveServerUrl(url: string, native: boolean, base: string): string {
  if (!native || !url.startsWith("/")) return url;
  if (!base) throw new Error("Online features aren't set up in this app version yet.");
  return base + url;
}

export const serverFnFetch: typeof fetch = (input, init) => {
  if (typeof input === "string") {
    return fetch(resolveServerUrl(input, isNativeApp(), APP_SERVER_URL), init);
  }
  if (input instanceof URL && isNativeApp() && input.origin === window.location.origin) {
    return fetch(resolveServerUrl(input.pathname + input.search, true, APP_SERVER_URL), init);
  }
  return fetch(input, init);
};

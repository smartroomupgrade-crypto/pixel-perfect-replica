<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Android packaging
- Capacitor wraps the app for Android (appId com.smartroom.remote); webDir is dist/client, which gets a prerendered static index.html via the tanstackStart prerender config in vite.config.ts — keep that prerender block or the APK build breaks. Build with `bun run apk:debug`.

- Gateway command naming lives in src/lib/logical.ts (FAN, LAMP, else Device ID in capitals; `KEY_ON/OFF` -> `KEY_STATE,ON|OFF`) and is shared by the local path, the remote server function and the Arduino firmware — change all three together, since a mismatch silently breaks device control.

// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Pre-bundle deps up front so the dev server doesn't reload mid-page-load
    // (which surfaces as "Importing a module script failed").
    optimizeDeps: {
      include: [
        "recharts", "sonner", "zod", "lucide-react", "clsx", "tailwind-merge", "class-variance-authority",
        "@lovable.dev/cloud-auth-js", "@supabase/supabase-js",
        "@radix-ui/react-label", "@radix-ui/react-slot", "@radix-ui/react-dialog", "@radix-ui/react-select",
        "@radix-ui/react-slider", "@radix-ui/react-switch", "@radix-ui/react-tabs",
      ],
    },
  },
});

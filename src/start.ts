import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { NATIVE_ORIGINS, serverFnFetch } from "./lib/native";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// The Android app serves its screens from the phone (https://localhost) and calls
// server functions on the published address, so allow those origins via CORS.
// Server functions authenticate with a bearer token, not cookies.
const nativeCorsMiddleware = createMiddleware().server(async ({ request, next }) => {
  const origin = request.headers.get("Origin");
  if (!origin || !NATIVE_ORIGINS.includes(origin)) return next();
  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      request.headers.get("Access-Control-Request-Headers") ?? "content-type, authorization",
    "Access-Control-Expose-Headers": "*",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const result = await next();
  const response = result instanceof Response ? result : result.response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  const patched = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  return result instanceof Response ? patched : { ...result, response: patched };
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests. The Android app's own origins are allowed.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  secFetchSite: (site, ctx) =>
    site === "same-origin" || NATIVE_ORIGINS.includes(ctx.request.headers.get("Origin") ?? ""),
  origin: (origin, ctx) => origin === new URL(ctx.request.url).origin || NATIVE_ORIGINS.includes(origin),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, nativeCorsMiddleware, csrfMiddleware],
  serverFns: { fetch: serverFnFetch },
}));

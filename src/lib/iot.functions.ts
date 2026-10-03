import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCreds(projectId: string, kinds: string[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("project_credentials")
    .select("kind,value")
    .eq("project_id", projectId)
    .in("kind", kinds);
  const out: Record<string, string> = {};
  for (const r of data ?? []) out[r.kind] = r.value;
  return out;
}

function joinUrl(base: string, path?: string | null) {
  const b = base.trim().replace(/\/+$/, "");
  if (!path) return b;
  if (/^https?:\/\//.test(path)) return path;
  return b + "/" + path.trim().replace(/^\/+/, "");
}

const pid = z.object({ projectId: z.string().uuid() });

export const credentialStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pid.parse(d))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("projects").select("id").eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("Project not found");
    const creds = await getCreds(data.projectId, ["ts_read", "ts_write", "gateway_key", "telegram_token", "camera_key"]);
    return Object.fromEntries(Object.keys(creds).map((k) => [k, true])) as Record<string, boolean>;
  });

export const testGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pid.parse(d))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("Project not found");
    if (!p.gateway_url) return { online: false, message: "No gateway address configured" };
    const creds = await getCreds(p.id, ["gateway_key"]);
    let online = false;
    let message = "";
    try {
      const res = await fetch(joinUrl(p.gateway_url, p.gateway_endpoint ? `${p.gateway_endpoint}/status` : "status"), {
        headers: creds.gateway_key ? { "X-API-Key": creds.gateway_key } : {},
        signal: AbortSignal.timeout(6000),
      });
      online = res.ok;
      message = res.ok ? "Gateway responded" : `Gateway returned ${res.status}`;
    } catch (e) {
      message = "Gateway not reachable from the internet. Local addresses (192.168.x.x) need a public URL or tunnel.";
    }
    await context.supabase
      .from("projects")
      .update({ gateway_status: online ? "online" : "offline", gateway_checked_at: new Date().toISOString() })
      .eq("id", p.id);
    return { online, message };
  });

export const sendDeviceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ deviceId: z.string().uuid(), command: z.string().min(1).max(60), value: z.number().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: device } = await sb.from("devices").select("*").eq("id", data.deviceId).maybeSingle();
    if (!device) throw new Error("Device not found");
    const { data: p } = await sb.from("projects").select("*").eq("id", device.project_id).single();
    const email = (context.claims as { email?: string }).email ?? null;
    const { data: cmd } = await sb
      .from("device_commands")
      .insert({ project_id: p!.id, device_id: device.id, device_name: device.name, command: data.command, user_email: email, status: "sent" })
      .select()
      .single();
    await sb.from("devices").update({ status: "command_sent" }).eq("id", device.id);

    const wantOn = data.command === "ON";
    const isBinary = data.command === "ON" || data.command === "OFF";

    if (p!.demo_mode) {
      // Simulated gateway round-trip (demo only)
      const state = isBinary ? (wantOn ? "on" : "off") : device.state;
      await sb.from("devices").update({
        state, status: isBinary ? (wantOn ? "confirmed_on" : "confirmed_off") : "confirmed_on",
        value: data.value ?? device.value, last_confirmed_at: new Date().toISOString(),
      }).eq("id", device.id);
      await sb.from("device_commands").update({ status: "confirmed", confirmed_at: new Date().toISOString(), reason: "Simulated (demo mode)" }).eq("id", cmd!.id);
      return { ok: true, simulated: true };
    }

    const fail = async (reason: string) => {
      await sb.from("device_commands").update({ status: "failed", reason }).eq("id", cmd!.id);
      await sb.from("devices").update({ status: "error" }).eq("id", device.id);
      return { ok: false, reason };
    };

    if (!p!.gateway_url) return fail("No gateway configured");
    const creds = await getCreds(p!.id, ["gateway_key"]);
    const raw = isBinary ? (wantOn ? device.command_on : device.command_off) : data.command;
    try {
      const res = await fetch(joinUrl(p!.gateway_url, p!.gateway_endpoint ? `${p!.gateway_endpoint}/command` : "command"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(creds.gateway_key ? { "X-API-Key": creds.gateway_key } : {}) },
        body: JSON.stringify({
          device_id: device.device_key, pin: device.arduino_pin, command: raw || data.command, value: data.value ?? null, command_id: cmd!.id,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return fail(`Gateway returned ${res.status}`);
      const body = (await res.json().catch(() => ({}))) as { state?: string; confirmed?: boolean };
      const reported = typeof body.state === "string" ? body.state.toLowerCase() : null;
      if (reported === "on" || reported === "off") {
        await sb.from("devices").update({
          state: reported, status: reported === "on" ? "confirmed_on" : "confirmed_off",
          value: data.value ?? device.value, last_confirmed_at: new Date().toISOString(),
        }).eq("id", device.id);
        await sb.from("device_commands").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", cmd!.id);
        return { ok: true };
      }
      // Gateway accepted but did not report state — remain unconfirmed
      await sb.from("devices").update({ status: "connecting" }).eq("id", device.id);
      await sb.from("device_commands").update({ status: "pending", reason: "Awaiting device confirmation" }).eq("id", cmd!.id);
      return { ok: true, pending: true };
    } catch {
      return fail("Gateway not reachable");
    }
  });

export const fetchThingSpeak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ projectId: z.string().uuid(), results: z.number().int().min(1).max(8000).optional(), start: z.string().optional(), end: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    if (!p || !p.thingspeak_channel_id) return { feeds: [] as Record<string, string | null>[], error: "ThingSpeak not configured" };
    const creds = await getCreds(p.id, ["ts_read"]);
    const q = new URLSearchParams();
    if (creds.ts_read) q.set("api_key", creds.ts_read);
    if (data.start) q.set("start", data.start.replace("T", " ").slice(0, 19));
    if (data.end) q.set("end", data.end.replace("T", " ").slice(0, 19));
    if (!data.start) q.set("results", String(data.results ?? 100));
    try {
      const res = await fetch(`https://api.thingspeak.com/channels/${encodeURIComponent(p.thingspeak_channel_id)}/feeds.json?${q}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return { feeds: [], error: `ThingSpeak returned ${res.status}` };
      const j = (await res.json()) as { feeds?: Record<string, string | null>[] };
      return { feeds: j.feeds ?? [], error: null as string | null };
    } catch {
      return { feeds: [], error: "Could not reach ThingSpeak" };
    }
  });

export const sendTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pid.extend({ text: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("Project not found");
    const creds = await getCreds(p.id, ["telegram_token"]);
    if (!creds.telegram_token || !p.telegram_chat_id) return { ok: false, message: "Bot token and Chat ID are required" };
    try {
      const res = await fetch(`https://api.telegram.org/bot${creds.telegram_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: p.telegram_chat_id, text: data.text ?? `✅ ${p.name}: test notification from Smart Room Remote Access` }),
        signal: AbortSignal.timeout(8000),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
      return { ok: !!j.ok, message: j.ok ? "Message sent" : j.description ?? "Telegram rejected the request" };
    } catch {
      return { ok: false, message: "Could not reach Telegram" };
    }
  });

export const cameraAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pid.extend({ action: z.enum(["test", "capture"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("Project not found");
    if (p.demo_mode && data.action === "capture") {
      await context.supabase.from("camera_images").insert({ project_id: p.id, note: "Simulated capture (demo mode)" });
      return { ok: true, message: "Simulated capture recorded" };
    }
    if (!p.camera_endpoint) return { ok: false, message: "No camera endpoint configured" };
    const creds = await getCreds(p.id, ["camera_key"]);
    try {
      const res = await fetch(joinUrl(p.camera_endpoint, data.action === "test" ? "status" : "capture"), {
        method: data.action === "test" ? "GET" : "POST",
        headers: creds.camera_key ? { "X-API-Key": creds.camera_key } : {},
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false, message: `Camera returned ${res.status}` };
      if (data.action === "capture") {
        await context.supabase.from("camera_images").insert({ project_id: p.id, note: "Capture requested", image_url: p.camera_upload_endpoint });
      }
      return { ok: true, message: data.action === "test" ? "Camera online" : "Capture requested" };
    } catch {
      return { ok: false, message: "Camera not reachable from the internet" };
    }
  });

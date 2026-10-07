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

const DEFAULT_TS_MAP: { field: number; name: string; type: string; unit: string; kind: "numeric" | "binary"; warn?: number; crit?: number }[] = [
  { field: 1, name: "Temperature", type: "Temperature", unit: "°C", kind: "numeric", warn: 32, crit: 38 },
  { field: 2, name: "Humidity", type: "Humidity", unit: "%", kind: "numeric", warn: 80, crit: 90 },
  { field: 3, name: "Distance", type: "Distance", unit: "cm", kind: "numeric" },
  { field: 4, name: "Motion", type: "Motion", unit: "", kind: "binary" },
  { field: 5, name: "Voltage", type: "Voltage", unit: "V", kind: "numeric", warn: 245, crit: 255 },
  { field: 6, name: "Current", type: "Current", unit: "A", kind: "numeric", warn: 8, crit: 10 },
  { field: 7, name: "Power", type: "Power", unit: "W", kind: "numeric", warn: 1800, crit: 2200 },
  { field: 8, name: "Gas", type: "Gas", unit: "ppm", kind: "numeric", warn: 400, crit: 700 },
];

async function saveCred(projectId: string, kind: string, value: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("project_credentials").upsert(
    { project_id: projectId, kind, value, updated_at: new Date().toISOString() },
    { onConflict: "project_id,kind" },
  );
}

export const connectThingSpeak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      projectId: z.string().uuid(),
      channelId: z.string().trim().regex(/^\d{1,12}$/, "Channel ID must be a number"),
      readKey: z.string().trim().max(64).optional(),
      writeKey: z.string().trim().max(64).optional(),
      interval: z.number().int().min(15).max(3600),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: p } = await sb.from("projects").select("id").eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("Project not found");
    if (data.readKey) await saveCred(p.id, "ts_read", data.readKey);
    if (data.writeKey) await saveCred(p.id, "ts_write", data.writeKey);
    const creds = await getCreds(p.id, ["ts_read"]);
    const url = (key?: string) =>
      `https://api.thingspeak.com/channels/${data.channelId}/feeds.json?results=100${key ? `&api_key=${encodeURIComponent(key)}` : ""}`;
    let res: Response | null = null;
    try {
      res = await fetch(url(creds.ts_read), { signal: AbortSignal.timeout(10000) });
      if (!res.ok && creds.ts_read) res = await fetch(url(), { signal: AbortSignal.timeout(10000) }); // public channel fallback
    } catch {
      return { ok: false as const, message: "Could not reach ThingSpeak. Check your internet connection." };
    }
    if (!res.ok) {
      return { ok: false as const, message: res.status === 400 || res.status === 401 ? "ThingSpeak rejected the request — check the Channel ID and Read API Key." : `ThingSpeak returned ${res.status}` };
    }
    const j = (await res.json().catch(() => null)) as { channel?: Record<string, string>; feeds?: Record<string, string | null>[] } | null;
    if (!j?.channel) return { ok: false as const, message: "Channel not found or not accessible." };
    const fields = DEFAULT_TS_MAP.filter((m) => j.channel![`field${m.field}`]).map((m) => m.field);
    const lastAt = j.feeds?.length ? j.feeds[j.feeds.length - 1]!.created_at : null;

    await sb.from("projects").update({ thingspeak_enabled: true, thingspeak_channel_id: data.channelId, thingspeak_interval_sec: data.interval }).eq("id", p.id);

    // Map fields to sensors (create missing ones; keep existing mappings)
    const { data: existing } = await sb.from("sensors").select("id,name,thingspeak_field").eq("project_id", p.id);
    const list = existing ?? [];
    let order = list.length;
    // Use the channel's own field labels when they name a known sensor; else default order
    const resolved = DEFAULT_TS_MAP.map((m) => {
      const hit = [1, 2, 3, 4, 5, 6, 7, 8].find((f) => (j.channel![`field${f}`] ?? "").toLowerCase().includes(m.name.toLowerCase()));
      return { ...m, field: hit ?? m.field };
    });
    for (const m of resolved) {
      if (!fields.includes(m.field)) continue;
      if (list.some((s) => s.thingspeak_field === m.field)) continue;
      const byName = list.find((s) => s.name.toLowerCase().includes(m.name.toLowerCase()) && !s.thingspeak_field);
      if (byName) { await sb.from("sensors").update({ thingspeak_field: m.field }).eq("id", byName.id); continue; }
      await sb.from("sensors").insert({
        project_id: p.id, name: m.name, sensor_type: m.type, sensor_key: m.name.toLowerCase(), thingspeak_field: m.field,
        data_field: `field${m.field}`, unit: m.unit, value_kind: m.kind, decimals: m.kind === "binary" ? 0 : 1,
        warning_threshold: m.warn ?? null, critical_threshold: m.crit ?? null, sort_order: order++,
      });
    }
    return {
      ok: true as const,
      channelName: j.channel.name ?? "",
      channelId: data.channelId,
      lastAt,
      fieldsDetected: fields.length,
      message: "ThingSpeak connected",
    };
  });

export const writeThingSpeak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pid.extend({ fields: z.record(z.string().regex(/^field[1-8]$/), z.number()) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("projects").select("id").eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("Project not found");
    const creds = await getCreds(p.id, ["ts_write"]);
    if (!creds.ts_write) return { ok: false, message: "Write API Key not set" };
    const q = new URLSearchParams({ api_key: creds.ts_write });
    for (const [k, v] of Object.entries(data.fields)) q.set(k, String(v));
    const res = await fetch(`https://api.thingspeak.com/update?${q}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    const t = res ? await res.text() : "0";
    return { ok: !!res?.ok && t.trim() !== "0", message: t.trim() !== "0" ? "Data sent" : "ThingSpeak rejected the update (wait 15s between writes)" };
  });

export const connectTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    pid.extend({
      token: z.string().trim().regex(/^\d+:[\w-]{20,}$/, "Bot token format looks wrong").optional(),
      chatId: z.string().trim().regex(/^-?\d{3,20}$|^@\w{4,}$/, "Chat ID must be a number like 123456789"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: p } = await sb.from("projects").select("id,name").eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("Project not found");
    if (data.token) await saveCred(p.id, "telegram_token", data.token);
    await sb.from("projects").update({ telegram_chat_id: data.chatId }).eq("id", p.id);
    const creds = await getCreds(p.id, ["telegram_token"]);
    if (!creds.telegram_token) return { ok: false, message: "Bot Token is required" };
    const api = `https://api.telegram.org/bot${creds.telegram_token}`;
    try {
      const me = (await (await fetch(`${api}/getMe`, { signal: AbortSignal.timeout(8000) })).json()) as { ok?: boolean; result?: { username?: string } };
      if (!me.ok) return { ok: false, message: "Bot Token is invalid" };
      const r = (await (await fetch(`${api}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: data.chatId, text: "Smart Room Remote Access\n✓ Telegram connection successful.\nYour Smart Room alert system is now connected." }),
        signal: AbortSignal.timeout(8000),
      })).json()) as { ok?: boolean; description?: string };
      if (!r.ok) {
        await sb.from("projects").update({ telegram_enabled: false }).eq("id", p.id);
        return { ok: false, message: `Chat ID problem: ${r.description ?? "rejected"}. Open your bot in Telegram and press Start first.` };
      }
      await sb.from("projects").update({ telegram_enabled: true }).eq("id", p.id);
      return { ok: true, message: `Test message sent via @${me.result?.username ?? "bot"}` };
    } catch {
      return { ok: false, message: "Could not reach Telegram — check your internet connection." };
    }
  });

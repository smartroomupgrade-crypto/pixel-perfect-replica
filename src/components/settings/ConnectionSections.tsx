import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera, Send, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section, Field, SecretField, useCredentialStatus } from "./common";
import { useProject, type Project } from "@/lib/project";
import { TIMEZONES } from "@/lib/catalog";
import { cameraAction, connectTelegram, connectThingSpeak } from "@/lib/iot.functions";
import { useServerFn } from "@tanstack/react-start";
import { MODE_LABEL, useGateway } from "@/lib/gateway";
import { cn } from "@/lib/utils";

function useDraft<K extends keyof Project>(keys: K[]) {
  const { project, updateProject } = useProject();
  const pick = () => Object.fromEntries(keys.map((k) => [k, project?.[k] ?? ""])) as Pick<Project, K>;
  const [d, setD] = useState(pick);
  useEffect(() => { setD(pick()); }, [project?.id]);
  const set = <T extends K>(k: T, v: Project[T]) => setD((p) => ({ ...p, [k]: v }));
  const save = async () => {
    const patch = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === "" ? null : v]));
    try { await updateProject(patch as Partial<Project>); toast.success("Saved"); } catch (e) { toast.error((e as Error).message); }
  };
  return { d, set, save };
}

export function ProjectSection() {
  const { d, set, save } = useDraft(["name", "description", "location", "timezone"]);
  return (
    <Section title="Project" description="Basic details about your smart room." footer={<Button onClick={save}>Save project</Button>}>
      <Field label="Project name"><Input value={d.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Location"><Input value={d.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Hostel Block B, Room 12" /></Field>
      <Field label="Description" full><Textarea value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} /></Field>
      <Field label="Time zone">
        <Select value={d.timezone ?? "Africa/Kampala"} onValueChange={(v) => set("timezone", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t === "Africa/Kampala" ? "Africa/Kampala (UTC+03:00)" : t}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </Section>
  );
}

export function AccountSection() {
  const { user, isAnonymous } = useAuth();
  const nav = useNavigate();
  return (
    <Section title="Account" description="Optional — sign in to keep your setup if you change devices or browsers.">
      <Field label="Status" full>
        <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm">
          {isAnonymous ? "Using the app without an account" : `Signed in as ${user?.email ?? "you"}`}
          {isAnonymous ? (
            <Button variant="outline" size="sm" onClick={() => nav({ to: "/auth" })}>Sign in</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}>Sign out</Button>
          )}
        </div>
      </Field>
    </Section>
  );
}

export function DemoSection() {
  const { project, updateProject } = useProject();
  return (
    <Section title="Demo Mode" description="Explore the interface with simulated sensors and devices. Nothing is sent to real hardware.">
      <Field label="Status" full>
        <label className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm">
          {project?.demo_mode ? "Demo mode is ON — values are simulated" : "Demo mode is OFF — using real connections"}
          <Switch checked={!!project?.demo_mode} onCheckedChange={(c) => updateProject({ demo_mode: c })} />
        </label>
      </Field>
    </Section>
  );
}

const INTERVALS = [20, 30, 60, 300];
function StatusLine({ tone, children }: { tone: "ok" | "bad" | "wait" | "idle"; children: React.ReactNode }) {
  const c = tone === "ok" ? "text-success" : tone === "bad" ? "text-destructive" : "text-muted-foreground";
  const dot = tone === "ok" ? "bg-success" : tone === "bad" ? "bg-destructive" : tone === "wait" ? "bg-warning animate-pulse" : "bg-muted-foreground/40";
  return <span className={cn("ml-auto flex items-center gap-2 text-sm font-medium", c)}><span className={cn("size-2 rounded-full", dot)} />{children}</span>;
}

export function ThingSpeakSection() {
  const { project, reload, telemetryError, lastFetchAt, readings } = useProject();
  const { status, refresh } = useCredentialStatus();
  const [channel, setChannel] = useState("");
  const [readKey, setReadKey] = useState("");
  const [writeKey, setWriteKey] = useState("");
  const [interval, setIntervalSec] = useState(20);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ ok: boolean; message: string; channelName?: string; lastAt?: string | null; fields?: number } | null>(null);
  useEffect(() => {
    setChannel(project?.thingspeak_channel_id ?? "");
    setIntervalSec(project?.thingspeak_interval_sec ?? 20);
  }, [project?.id]);
  const connect = useServerFn(connectThingSpeak);
  async function go() {
    if (!project) return;
    if (!/^\d+$/.test(channel.trim())) return toast.error("Enter a numeric Channel ID");
    setBusy(true);
    try {
      const r = await connect({ data: { projectId: project.id, channelId: channel.trim(), readKey: readKey || undefined, writeKey: writeKey || undefined, interval } });
      if (r.ok) {
        setInfo({ ok: true, message: r.message, channelName: r.channelName, lastAt: r.lastAt, fields: r.fieldsDetected });
        setReadKey(""); setWriteKey("");
        toast.success("ThingSpeak connected");
        await Promise.all([reload(), refresh()]);
      } else { setInfo({ ok: false, message: r.message }); toast.error(r.message); }
    } catch (e) { const m = (e as Error).message; setInfo({ ok: false, message: m }); toast.error(m); }
    setBusy(false);
  }
  const enabled = !!project?.thingspeak_enabled && !!project?.thingspeak_channel_id;
  const tz = project?.timezone ?? "Africa/Kampala";
  const stale = lastFetchAt && Date.now() - lastFetchAt > (project?.thingspeak_interval_sec ?? 20) * 3000;
  const tone = busy ? "wait" : !enabled ? "idle" : telemetryError ? "bad" : lastFetchAt ? (stale ? "wait" : "ok") : "wait";
  const label = busy ? "Connecting…" : !enabled ? "Not configured" : telemetryError ? "Error — retrying" : lastFetchAt ? (stale ? "Stale" : "Connected") : "Connecting…";
  const hasData = Object.values(readings).some((r) => r.length);
  return (
    <Section title="ThingSpeak" description="Sensor history and graphs. Enter your channel details and press Save & Connect."
      footer={<>
        <Button onClick={go} disabled={busy}>{busy ? "Connecting…" : "Save & Connect"}</Button>
        {enabled && <Button variant="outline" onClick={() => updateTs(false)}>Disconnect</Button>}
        <StatusLine tone={tone}>{label}</StatusLine>
      </>}>
      <Field label="Channel ID"><Input inputMode="numeric" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="e.g. 3494616" /></Field>
      <Field label="Update interval">
        <Select value={String(interval)} onValueChange={(v) => setIntervalSec(Number(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{INTERVALS.map((i) => <SelectItem key={i} value={String(i)}>{i < 60 ? `${i} seconds` : i === 60 ? "60 seconds" : "5 minutes"}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Read API Key" hint={status.ts_read ? "Saved securely. Leave empty to keep it." : "Optional for public channels."}>
        <Input type="password" autoComplete="off" value={readKey} onChange={(e) => setReadKey(e.target.value)} placeholder={status.ts_read ? "••••••••  (saved)" : "Not set"} />
      </Field>
      <Field label="Write API Key" hint={status.ts_write ? "Saved securely. Leave empty to keep it." : "Optional — used only by the server."}>
        <Input type="password" autoComplete="off" value={writeKey} onChange={(e) => setWriteKey(e.target.value)} placeholder={status.ts_write ? "••••••••  (saved)" : "Not set"} />
      </Field>
      {(info || (enabled && lastFetchAt)) && (
        <div className={cn("rounded-lg border px-4 py-3 text-sm sm:col-span-2", info && !info.ok ? "border-destructive/40 bg-danger-soft" : "border-success/40 bg-success-soft")}>
          {info && !info.ok ? <p className="font-medium">✕ {info.message}</p> : <>
            <p className="font-semibold">✓ ThingSpeak Connected</p>
            {info?.channelName && <p>Channel: {info.channelName}</p>}
            <p>Channel ID: {project?.thingspeak_channel_id}</p>
            {info?.fields != null && <p>Fields detected: {info.fields} / 8</p>}
            {lastFetchAt && <p>Last updated: {new Date(lastFetchAt).toLocaleTimeString("en-GB", { timeZone: tz })}{!hasData ? " · no readings in channel yet" : ""}</p>}
          </>}
        </div>
      )}
    </Section>
  );
  async function updateTs(on: boolean) {
    await supabase.from("projects").update({ thingspeak_enabled: on }).eq("id", project!.id);
    setInfo(null); await reload();
  }
}

export function GatewaySection() {
  const { project } = useProject();
  const { d, set, save } = useDraft(["gateway_name", "gateway_id", "gateway_local_ip", "remote_enabled", "gateway_url"]);
  const { status, refresh } = useCredentialStatus();
  const { mode, latencyMs, testing, testConnection } = useGateway();
  const [msg, setMsg] = useState<string | null>(null);
  async function test() {
    await save();
    const r = await testConnection();
    setMsg(r.message);
  }
  const modeColor = mode === "local" || mode === "remote" ? "text-success" : mode === "offline" ? "text-destructive" : "text-muted-foreground";
  const dotColor = mode === "local" || mode === "remote" ? "bg-success" : mode === "offline" ? "bg-destructive" : "bg-warning animate-pulse";
  return (
    <Section title="Gateway Connection" description="The Wi-Fi module that relays commands to your Arduino. The app tries the local network first and falls back to the internet automatically."
      footer={<>
        <Button onClick={save}>Save gateway</Button>
        <Button variant="outline" onClick={test} disabled={testing}><Wifi />{testing ? "Testing…" : "Test connection"}</Button>
        <span className={cn("ml-auto flex items-center gap-2 text-sm font-medium", modeColor)}>
          <span className={cn("size-2 rounded-full", dotColor)} />
          {MODE_LABEL[mode]}{mode === "local" && latencyMs != null ? ` · ${latencyMs} ms` : ""}
        </span>
      </>}>
      <Field label="Gateway name"><Input value={d.gateway_name ?? ""} onChange={(e) => set("gateway_name", e.target.value)} placeholder="Smart Room Gateway" /></Field>
      <Field label="Gateway ID" hint="Unique ID of your physical room, e.g. SR-UG-001"><Input value={d.gateway_id ?? ""} onChange={(e) => set("gateway_id", e.target.value)} placeholder="SR-UG-001" /></Field>
      <Field label="Local IP address" hint="Used first when your phone is on the same Wi-Fi."><Input value={d.gateway_local_ip ?? ""} onChange={(e) => set("gateway_local_ip", e.target.value)} placeholder="192.168.1.50" /></Field>
      <Field label="Remote access" hint="Internet fallback address (public IP, tunnel or cloud relay).">
        <div className="flex items-center gap-3">
          <Switch checked={!!d.remote_enabled} onCheckedChange={(c) => set("remote_enabled", c)} />
          <span className="text-sm text-muted-foreground">{d.remote_enabled ? "ON" : "OFF"}</span>
        </div>
      </Field>
      {!!d.remote_enabled && (
        <Field label="Remote gateway URL" full><Input value={d.gateway_url ?? ""} onChange={(e) => set("gateway_url", e.target.value)} placeholder="https://your-tunnel.example.com" /></Field>
      )}
      <SecretField label="Gateway API key" kind="gateway_key" isSet={status.gateway_key} onSaved={refresh} />
      {msg && <p className="text-sm text-muted-foreground sm:col-span-2">{msg}</p>}
    </Section>
  );
}

export function TelegramSection() {
  const { project, reload } = useProject();
  const { status, refresh } = useCredentialStatus();
  const [token, setToken] = useState("");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => { setChat(project?.telegram_chat_id ?? ""); }, [project?.id]);
  const connect = useServerFn(connectTelegram);
  async function go() {
    if (!project) return;
    setBusy(true);
    try {
      const r = await connect({ data: { projectId: project.id, chatId: chat.trim(), token: token.trim() || undefined } });
      setRes(r);
      r.ok ? toast.success("Telegram connected") : toast.error(r.message);
      if (r.ok) setToken("");
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      const m = (e as Error).message.includes("format") ? "Bot Token or Chat ID format looks wrong" : (e as Error).message;
      setRes({ ok: false, message: m }); toast.error(m);
    }
    setBusy(false);
  }
  const connected = !!project?.telegram_enabled && !!status.telegram_token;
  const tone = busy ? "wait" : res && !res.ok ? "bad" : connected ? "ok" : "idle";
  const label = busy ? "Connecting…" : res && !res.ok ? "Error" : connected ? "Connected" : "Not configured";
  return (
    <Section title="Telegram" description="Alerts for motion, door, gas, temperature, voltage and offline events."
      footer={<>
        <Button onClick={go} disabled={busy || !chat}><Send />{busy ? "Connecting…" : "Save & Connect"}</Button>
        {connected && <Button variant="outline" onClick={async () => { await supabase.from("projects").update({ telegram_enabled: false }).eq("id", project!.id); setRes(null); await reload(); }}>Turn off alerts</Button>}
        <StatusLine tone={tone}>{label}</StatusLine>
      </>}>
      <Field label="Bot Token" hint={status.telegram_token ? "Saved securely. Leave empty to keep it." : "From @BotFather."}>
        <Input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder={status.telegram_token ? "••••••••  (saved)" : "Not set"} />
      </Field>
      <Field label="Chat ID" hint="Send /start to your bot first."><Input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="e.g. 123456789" /></Field>
      {res && (
        <div className={cn("rounded-lg border px-4 py-3 text-sm sm:col-span-2", res.ok ? "border-success/40 bg-success-soft" : "border-destructive/40 bg-danger-soft")}>
          {res.ok ? <><p className="font-semibold">✓ Telegram Connected</p><p>{res.message}</p></> : <>
            <p className="font-semibold">✕ Telegram Connection Failed</p><p>{res.message}</p>
            <p className="mt-1 text-muted-foreground">Check: Bot Token · Chat ID · Internet connection · Bot availability</p></>}
        </div>
      )}
    </Section>
  );
}

export function CameraSection() {
  const { project } = useProject();
  const { d, set, save } = useDraft(["camera_enabled", "camera_name", "camera_endpoint", "camera_upload_endpoint"]);
  const { status, refresh } = useCredentialStatus();
  async function act(action: "test" | "capture") {
    if (!project) return;
    await save();
    const r = await cameraAction({ data: { projectId: project.id, action } }).catch(() => ({ ok: false, message: "Failed" }));
    r.ok ? toast.success(r.message) : toast.error(r.message);
  }
  return (
    <Section title="Camera · ESP32-CAM" description="Separate camera device for image capture. It does not control sensors."
      footer={<><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => act("test")}>Test camera</Button><Button variant="outline" onClick={() => act("capture")}><Camera />Capture photo</Button></>}>
      <Field label="Enable camera" full>
        <label className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm">Use camera in automations
          <Switch checked={!!d.camera_enabled} onCheckedChange={(c) => set("camera_enabled", c)} /></label>
      </Field>
      <Field label="Camera name"><Input value={d.camera_name ?? ""} onChange={(e) => set("camera_name", e.target.value)} placeholder="Entrance Camera" /></Field>
      <Field label="Camera endpoint"><Input value={d.camera_endpoint ?? ""} onChange={(e) => set("camera_endpoint", e.target.value)} placeholder="http://cam.example.com" /></Field>
      <Field label="Storage / upload endpoint"><Input value={d.camera_upload_endpoint ?? ""} onChange={(e) => set("camera_upload_endpoint", e.target.value)} /></Field>
      <SecretField label="Camera API key" kind="camera_key" isSet={status.camera_key} onSaved={refresh} />
    </Section>
  );
}

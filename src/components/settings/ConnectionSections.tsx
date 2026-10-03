import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Send, Wifi } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section, Field, SecretField, useCredentialStatus } from "./common";
import { useProject, type Project } from "@/lib/project";
import { TIMEZONES } from "@/lib/catalog";
import { cameraAction, sendTelegramTest, testGateway } from "@/lib/iot.functions";
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

export function ThingSpeakSection() {
  const { d, set, save } = useDraft(["thingspeak_enabled", "thingspeak_channel_id", "thingspeak_interval_sec"]);
  const { status, refresh } = useCredentialStatus();
  return (
    <Section title="Data Connection · ThingSpeak" description="Your channel's time-series data. Field mapping is set per sensor in Sensors."
      footer={<Button onClick={save}>Save connection</Button>}>
      <Field label="Enable ThingSpeak" full>
        <label className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm">Read sensor data from ThingSpeak
          <Switch checked={!!d.thingspeak_enabled} onCheckedChange={(c) => set("thingspeak_enabled", c)} /></label>
      </Field>
      <Field label="Channel ID"><Input value={d.thingspeak_channel_id ?? ""} onChange={(e) => set("thingspeak_channel_id", e.target.value)} placeholder="e.g. 2345678" /></Field>
      <Field label="Update interval (seconds)"><Input type="number" min={15} value={d.thingspeak_interval_sec ?? 20} onChange={(e) => set("thingspeak_interval_sec", Number(e.target.value))} /></Field>
      <SecretField label="Read API key" kind="ts_read" isSet={status.ts_read} onSaved={refresh} />
      <SecretField label="Write API key" kind="ts_write" isSet={status.ts_write} onSaved={refresh} />
    </Section>
  );
}

export function GatewaySection() {
  const { project, reload } = useProject();
  const { d, set, save } = useDraft(["gateway_name", "gateway_url", "gateway_endpoint"]);
  const { status, refresh } = useCredentialStatus();
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const online = project?.gateway_status === "online";
  async function test() {
    if (!project) return;
    setTesting(true);
    await save();
    const r = await testGateway({ data: { projectId: project.id } }).catch(() => ({ online: false, message: "Test failed" }));
    setMsg(r.message); setTesting(false); reload();
  }
  return (
    <Section title="Gateway Connection" description="The Wi-Fi module (ESP8266, ESP32, etc.) that relays commands to your Arduino."
      footer={<>
        <Button onClick={save}>Save gateway</Button>
        <Button variant="outline" onClick={test} disabled={testing}><Wifi />{testing ? "Testing…" : "Test connection"}</Button>
        <span className={cn("ml-auto flex items-center gap-2 text-sm font-medium", online ? "text-success" : "text-muted-foreground")}>
          <span className={cn("size-2 rounded-full", online ? "bg-success" : project?.gateway_status === "offline" ? "bg-destructive" : "bg-muted-foreground")} />
          {online ? "Gateway Online" : project?.gateway_status === "offline" ? "Gateway Offline" : "Not tested"}
        </span>
      </>}>
      <Field label="Gateway name"><Input value={d.gateway_name ?? ""} onChange={(e) => set("gateway_name", e.target.value)} placeholder="Smart Room Gateway" /></Field>
      <Field label="Gateway URL / IP" hint="Must be reachable from the internet (public IP, tunnel or cloud relay).">
        <Input value={d.gateway_url ?? ""} onChange={(e) => set("gateway_url", e.target.value)} placeholder="http://192.168.1.100" /></Field>
      <Field label="API endpoint" hint="Commands POST to {endpoint}/command, status via {endpoint}/status">
        <Input value={d.gateway_endpoint ?? ""} onChange={(e) => set("gateway_endpoint", e.target.value)} placeholder="/api" /></Field>
      <SecretField label="Gateway API key" kind="gateway_key" isSet={status.gateway_key} onSaved={refresh} />
      {msg && <p className="text-sm text-muted-foreground sm:col-span-2">{msg}</p>}
    </Section>
  );
}

export function TelegramSection() {
  const { project } = useProject();
  const { d, set, save } = useDraft(["telegram_enabled", "telegram_chat_id"]);
  const { status, refresh } = useCredentialStatus();
  async function test() {
    if (!project) return;
    await save();
    const r = await sendTelegramTest({ data: { projectId: project.id } }).catch(() => ({ ok: false, message: "Failed" }));
    r.ok ? toast.success(r.message) : toast.error(r.message);
  }
  return (
    <Section title="Telegram Notifications" description="Receive alerts in a Telegram chat via your own bot."
      footer={<><Button onClick={save}>Save</Button><Button variant="outline" onClick={test}><Send />Send test message</Button></>}>
      <Field label="Enable Telegram" full>
        <label className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm">Send alert notifications
          <Switch checked={!!d.telegram_enabled} onCheckedChange={(c) => set("telegram_enabled", c)} /></label>
      </Field>
      <SecretField label="Bot token" kind="telegram_token" isSet={status.telegram_token} onSaved={refresh} />
      <Field label="Chat ID"><Input value={d.telegram_chat_id ?? ""} onChange={(e) => set("telegram_chat_id", e.target.value)} placeholder="e.g. 123456789" /></Field>
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

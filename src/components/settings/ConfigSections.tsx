import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./common";
import { supabase } from "@/integrations/supabase/client";
import { useProject, type Automation, type Device, type Sensor } from "@/lib/project";
import { CONTROL_TYPES, DEVICE_TYPES, SENSOR_PRESETS, slugKey } from "@/lib/catalog";
import { DeviceVisual } from "../DeviceVisual";
import { cn } from "@/lib/utils";

function ListShell({ title, desc, onAdd, addLabel, children }: { title: string; desc: string; onAdd: () => void; addLabel: string; children: React.ReactNode }) {
  return (
    <section className="card-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div><h2 className="text-base font-semibold">{title}</h2><p className="mt-0.5 text-sm text-muted-foreground">{desc}</p></div>
        <Button onClick={onAdd}><Plus />{addLabel}</Button>
      </div>
      <div className="divide-y">{children}</div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">{label}<Switch checked={checked} onCheckedChange={onChange} /></label>
  );
}

const num = (v: string) => (v === "" ? null : Number(v));

/* ---------------- Sensors ---------------- */
export function SensorsSection() {
  const { project, sensors, reload } = useProject();
  const [edit, setEdit] = useState<Partial<Sensor> | null>(null);

  async function save() {
    if (!project || !edit?.name) return;
    const row = { ...edit, project_id: project.id, sensor_key: edit.sensor_key || slugKey(edit.name) } as Sensor;
    const { error } = edit.id
      ? await supabase.from("sensors").update(row).eq("id", edit.id)
      : await supabase.from("sensors").insert({ ...row, sort_order: sensors.length });
    if (error) return toast.error(error.message);
    setEdit(null); reload(); toast.success("Sensor saved");
  }
  async function remove(id: string) {
    if (!confirm("Delete this sensor?")) return;
    await supabase.from("sensors").delete().eq("id", id); reload();
  }

  return (
    <ListShell title="Sensors" desc="Anything your Arduino measures. Map each to a ThingSpeak field." addLabel="Add sensor"
      onAdd={() => setEdit({ name: "", sensor_type: "Custom", value_kind: "numeric", decimals: 1, enabled: true, show_on_monitoring: true, include_in_analytics: true, alerts_enabled: true })}>
      {sensors.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No sensors yet.</p>}
      {sensors.map((s) => (
        <div key={s.id} className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{s.name} <span className="text-xs font-normal text-muted-foreground">· {s.sensor_type}</span></p>
            <p className="text-xs text-muted-foreground tabular">
              {s.thingspeak_field ? `field${s.thingspeak_field}` : "no field"}{s.arduino_pin ? ` · pin ${s.arduino_pin}` : ""}{s.unit ? ` · ${s.unit}` : ""}
              {s.warning_threshold != null ? ` · warn ≥ ${s.warning_threshold}` : ""}
            </p>
          </div>
          {!s.enabled && <span className="rounded bg-muted px-2 py-0.5 text-xs">Disabled</span>}
          <Button size="icon" variant="ghost" onClick={() => setEdit(s)} aria-label="Edit"><Pencil /></Button>
          <Button size="icon" variant="ghost" onClick={() => remove(s.id)} aria-label="Delete"><Trash2 /></Button>
        </div>
      ))}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit sensor" : "Add sensor"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-4 sm:grid-cols-2">
              {!edit.id && (
                <Field label="Start from a preset" full>
                  <Select onValueChange={(i) => { const p = SENSOR_PRESETS[Number(i)]!; setEdit({ ...edit, name: p.name, sensor_type: p.type, unit: p.unit, value_kind: p.kind, min_value: p.min ?? null, max_value: p.max ?? null }); }}>
                    <SelectTrigger><SelectValue placeholder="Choose a sensor type…" /></SelectTrigger>
                    <SelectContent>{SENSOR_PRESETS.map((p, i) => <SelectItem key={i} value={String(i)}>{p.type} — {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              )}
              <Field label="Sensor name"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Sensor type"><Input value={edit.sensor_type ?? ""} onChange={(e) => setEdit({ ...edit, sensor_type: e.target.value })} placeholder="DHT22, custom…" /></Field>
              <Field label="Sensor ID"><Input value={edit.sensor_key ?? ""} onChange={(e) => setEdit({ ...edit, sensor_key: e.target.value })} placeholder={slugKey(edit.name ?? "")} /></Field>
              <Field label="Arduino pin"><Input value={edit.arduino_pin ?? ""} onChange={(e) => setEdit({ ...edit, arduino_pin: e.target.value })} placeholder="D2, A0…" /></Field>
              <Field label="Data field (JSON key)"><Input value={edit.data_field ?? ""} onChange={(e) => setEdit({ ...edit, data_field: e.target.value })} placeholder="temp" /></Field>
              <Field label="ThingSpeak field">
                <Select value={edit.thingspeak_field ? String(edit.thingspeak_field) : ""} onValueChange={(v) => setEdit({ ...edit, thingspeak_field: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5, 6, 7, 8].map((f) => <SelectItem key={f} value={String(f)}>Field {f}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Value kind">
                <Select value={edit.value_kind ?? "numeric"} onValueChange={(v) => setEdit({ ...edit, value_kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="numeric">Numeric</SelectItem><SelectItem value="binary">Binary (0/1)</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Unit"><Input value={edit.unit ?? ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="°C" /></Field>
              <Field label="Minimum value"><Input type="number" value={edit.min_value ?? ""} onChange={(e) => setEdit({ ...edit, min_value: num(e.target.value) })} /></Field>
              <Field label="Maximum value"><Input type="number" value={edit.max_value ?? ""} onChange={(e) => setEdit({ ...edit, max_value: num(e.target.value) })} /></Field>
              <Field label="Warning threshold"><Input type="number" value={edit.warning_threshold ?? ""} onChange={(e) => setEdit({ ...edit, warning_threshold: num(e.target.value) })} /></Field>
              <Field label="Critical threshold"><Input type="number" value={edit.critical_threshold ?? ""} onChange={(e) => setEdit({ ...edit, critical_threshold: num(e.target.value) })} /></Field>
              <Field label="Decimal precision"><Input type="number" min={0} max={4} value={edit.decimals ?? 1} onChange={(e) => setEdit({ ...edit, decimals: Number(e.target.value) })} /></Field>
              <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                <Toggle label="Enabled" checked={!!edit.enabled} onChange={(v) => setEdit({ ...edit, enabled: v })} />
                <Toggle label="Show on Monitoring" checked={!!edit.show_on_monitoring} onChange={(v) => setEdit({ ...edit, show_on_monitoring: v })} />
                <Toggle label="Include in Analytics" checked={!!edit.include_in_analytics} onChange={(v) => setEdit({ ...edit, include_in_analytics: v })} />
                <Toggle label="Enable alerts" checked={!!edit.alerts_enabled} onChange={(v) => setEdit({ ...edit, alerts_enabled: v })} />
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} disabled={!edit?.name}>Save sensor</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ListShell>
  );
}

/* ---------------- Devices ---------------- */
export function DevicesSection() {
  const { project, devices, reload } = useProject();
  const [edit, setEdit] = useState<Partial<Device> | null>(null);

  async function save() {
    if (!project || !edit?.name) return;
    const row = { ...edit, project_id: project.id, device_key: edit.device_key || slugKey(edit.name) } as Device;
    const { error } = edit.id
      ? await supabase.from("devices").update(row).eq("id", edit.id)
      : await supabase.from("devices").insert({ ...row, sort_order: devices.length, status: "offline", state: "off" });
    if (error) return toast.error(error.message);
    setEdit(null); reload(); toast.success("Device saved — it now appears on Controls");
  }
  async function remove(id: string) {
    if (!confirm("Delete this device?")) return;
    await supabase.from("devices").delete().eq("id", id); reload();
  }

  return (
    <ListShell title="Devices & Controls" desc="Appliances switched by your Arduino. Each creates a card on Controls." addLabel="Add device"
      onAdd={() => setEdit({ name: "", device_type: "fan", control_type: "onoff", command_on: "ON", command_off: "OFF", enabled: true })}>
      {devices.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No devices yet.</p>}
      {devices.map((d) => (
        <div key={d.id} className="flex items-center gap-3 px-5 py-3">
          <div className="size-10 shrink-0 rounded-lg bg-muted p-1"><DeviceVisual type={d.device_type} on={false} /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{d.name}</p>
            <p className="text-xs text-muted-foreground tabular">{d.device_type} · {d.control_type}{d.arduino_pin ? ` · pin ${d.arduino_pin}` : ""}{d.room ? ` · ${d.room}` : ""}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setEdit(d)} aria-label="Edit"><Pencil /></Button>
          <Button size="icon" variant="ghost" onClick={() => remove(d.id)} aria-label="Delete"><Trash2 /></Button>
        </div>
      ))}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit device" : "Add device"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Device type / visual" full>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {DEVICE_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => setEdit({ ...edit, device_type: t.value })}
                      className={cn("flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px]", edit.device_type === t.value ? "border-primary bg-primary-soft" : "hover:bg-accent")}>
                      <span className="size-9"><DeviceVisual type={t.value} on={edit.device_type === t.value} /></span>{t.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Device name"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Smart Fan" /></Field>
              <Field label="Room"><Input value={edit.room ?? ""} onChange={(e) => setEdit({ ...edit, room: e.target.value })} placeholder="Living Room" /></Field>
              <Field label="Device ID"><Input value={edit.device_key ?? ""} onChange={(e) => setEdit({ ...edit, device_key: e.target.value })} placeholder={slugKey(edit.name ?? "")} /></Field>
              <Field label="Arduino pin"><Input value={edit.arduino_pin ?? ""} onChange={(e) => setEdit({ ...edit, arduino_pin: e.target.value })} placeholder="A5" /></Field>
              <Field label="Control type">
                <Select value={edit.control_type ?? "onoff"} onValueChange={(v) => setEdit({ ...edit, control_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTROL_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Feedback / state field"><Input value={edit.feedback_field ?? ""} onChange={(e) => setEdit({ ...edit, feedback_field: e.target.value })} placeholder="fan_state" /></Field>
              <Field label="ON command"><Input value={edit.command_on ?? ""} onChange={(e) => setEdit({ ...edit, command_on: e.target.value })} placeholder="FAN_ON" /></Field>
              <Field label="OFF command"><Input value={edit.command_off ?? ""} onChange={(e) => setEdit({ ...edit, command_off: e.target.value })} placeholder="FAN_OFF" /></Field>
              <div className="sm:col-span-2"><Toggle label="Enabled" checked={!!edit.enabled} onChange={(v) => setEdit({ ...edit, enabled: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} disabled={!edit?.name}>Save device</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ListShell>
  );
}

/* ---------------- Automations ---------------- */
const ACTIONS = [
  { value: "device_on", label: "Turn ON device" },
  { value: "device_off", label: "Turn OFF device" },
  { value: "notify", label: "Send notification" },
  { value: "capture", label: "Capture camera image" },
];

export function AutomationsSection() {
  const { project, sensors, devices } = useProject();
  const [rules, setRules] = useState<Automation[]>([]);
  const [edit, setEdit] = useState<Partial<Automation> | null>(null);
  const load = async () => {
    if (!project) return;
    const { data } = await supabase.from("automations").select("*").eq("project_id", project.id).order("created_at");
    setRules(data ?? []);
  };
  useEffect(() => { load(); }, [project?.id]);

  async function save() {
    if (!project || !edit?.sensor_id) return;
    const s = sensors.find((x) => x.id === edit.sensor_id);
    const d = devices.find((x) => x.id === edit.device_id);
    const a = ACTIONS.find((x) => x.value === edit.action);
    const name = `IF ${s?.name} ${edit.operator} ${edit.threshold ?? ""} → ${a?.label}${d && edit.action?.startsWith("device") ? ` (${d.name})` : ""}`;
    const row = { ...edit, name, project_id: project.id } as Automation;
    const { error } = edit.id ? await supabase.from("automations").update(row).eq("id", edit.id) : await supabase.from("automations").insert(row);
    if (error) return toast.error(error.message);
    setEdit(null); load();
  }

  return (
    <ListShell title="Automation" desc="Simple IF → THEN rules using your sensors and devices. Rules run while the app is open." addLabel="Add rule"
      onAdd={() => setEdit({ operator: ">", action: "device_on", enabled: true })}>
      {rules.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No rules yet. Example: IF Temperature &gt; 30.5 THEN turn ON Fan.</p>}
      {rules.map((r) => (
        <div key={r.id} className="flex items-center gap-3 px-5 py-3">
          <p className="min-w-0 flex-1 truncate text-sm font-medium tabular">{r.name}</p>
          <Switch checked={r.enabled} onCheckedChange={async (c) => { await supabase.from("automations").update({ enabled: c }).eq("id", r.id); load(); }} />
          <Button size="icon" variant="ghost" onClick={() => setEdit(r)}><Pencil /></Button>
          <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("automations").delete().eq("id", r.id); load(); }}><Trash2 /></Button>
        </div>
      ))}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Automation rule</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-4">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground">IF</p>
              <div className="grid grid-cols-[1fr_80px_100px] gap-2">
                <Select value={edit.sensor_id ?? ""} onValueChange={(v) => setEdit({ ...edit, sensor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sensor" /></SelectTrigger>
                  <SelectContent>{sensors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={edit.operator ?? ">"} onValueChange={(v) => setEdit({ ...edit, operator: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[">", "<", ">=", "<=", "="].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={edit.threshold ?? ""} onChange={(e) => setEdit({ ...edit, threshold: num(e.target.value) })} placeholder="30.5" />
              </div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground">THEN</p>
              <Select value={edit.action ?? "device_on"} onValueChange={(v) => setEdit({ ...edit, action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
              {edit.action?.startsWith("device") && (
                <Select value={edit.device_id ?? ""} onValueChange={(v) => setEdit({ ...edit, device_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Device" /></SelectTrigger>
                  <SelectContent>{devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={save} disabled={!edit?.sensor_id}>Save rule</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ListShell>
  );
}

/* ---------------- Command history ---------------- */
type Cmd = { id: string; device_name: string; command: string; created_at: string; user_email: string | null; status: string; reason: string | null };
export function CommandHistory({ limit = 50 }: { limit?: number }) {
  const { project } = useProject();
  const [rows, setRows] = useState<Cmd[]>([]);
  useEffect(() => {
    if (!project) return;
    const load = () => supabase.from("device_commands").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(limit).then(({ data }) => setRows(data ?? []));
    load();
    const ch = supabase.channel(`cmd-${project.id}`).on("postgres_changes", { event: "*", schema: "public", table: "device_commands", filter: `project_id=eq.${project.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [project?.id, limit]);
  const tz = project?.timezone ?? "Africa/Kampala";
  return (
    <section className="card-surface">
      <div className="border-b px-5 py-4"><h2 className="text-base font-semibold">Command History</h2></div>
      {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No commands sent yet.</p>}
      <div className="divide-y">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_auto] gap-x-3 px-5 py-3 text-sm sm:grid-cols-[1.5fr_0.6fr_0.8fr_1.4fr_1fr]">
            <span className="font-medium">{r.device_name}</span>
            <span className="tabular">{r.command}</span>
            <span className="tabular text-muted-foreground">{new Date(r.created_at).toLocaleTimeString("en-GB", { timeZone: tz })}</span>
            <span className="hidden truncate text-muted-foreground sm:block">{r.user_email ?? "—"}</span>
            <span className={cn("flex items-center gap-1 font-medium", r.status === "confirmed" ? "text-success" : r.status === "failed" ? "text-destructive" : "text-primary")} title={r.reason ?? ""}>
              {r.status === "confirmed" ? <Check className="size-3.5" /> : r.status === "failed" ? <X className="size-3.5" /> : <Clock className="size-3.5" />}
              {r.status === "confirmed" ? "Confirmed" : r.status === "failed" ? "Failed" : r.status === "pending" ? "Awaiting" : "Sent"}
            </span>
            {r.status === "failed" && r.reason && <span className="col-span-full text-xs text-destructive">{r.reason}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

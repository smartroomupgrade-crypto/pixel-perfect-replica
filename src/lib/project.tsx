import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "./auth";
import { fetchThingSpeak } from "./iot.functions";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Sensor = Database["public"]["Tables"]["sensors"]["Row"];
export type Device = Database["public"]["Tables"]["devices"]["Row"];
export type Automation = Database["public"]["Tables"]["automations"]["Row"];
export type Reading = { t: number; v: number };

type Ctx = {
  loading: boolean;
  project: Project | null;
  sensors: Sensor[];
  devices: Device[];
  readings: Record<string, Reading[]>;
  telemetryError: string | null;
  reload: () => Promise<void>;
  updateProject: (patch: Partial<Project>) => Promise<void>;
};
const C = createContext<Ctx | null>(null);

// Deterministic-ish demo generator
function demoValue(s: Sensor, t: number) {
  const n = s.name.toLowerCase();
  const h = t / 3600000;
  const noise = Math.sin(t / 97000 + s.sort_order) * 0.3 + Math.sin(t / 13000) * 0.15;
  if (s.value_kind === "binary") return Math.sin(t / 240000 + s.sort_order * 2) > 0.7 ? 1 : 0;
  if (n.includes("temp")) return 26 + 3.5 * Math.sin(h / 3.8) + noise * 2;
  if (n.includes("humid")) return 60 + 8 * Math.cos(h / 4) + noise * 3;
  if (n.includes("volt")) return 228 + 6 * Math.sin(h * 2) + noise * 4;
  if (n.includes("current")) return 2.3 + Math.sin(h * 1.5) * 0.8 + noise;
  if (n.includes("power")) return 520 + 150 * Math.sin(h * 1.5) + noise * 40;
  if (n.includes("gas")) return 180 + 60 * Math.max(0, Math.sin(h * 0.9)) + noise * 20;
  if (n.includes("dist")) return 34 + 10 * Math.sin(h * 3) + noise * 5;
  const min = Number(s.min_value ?? 0), max = Number(s.max_value ?? 100);
  return min + (max - min) * (0.5 + 0.35 * Math.sin(h / 2 + s.sort_order) + noise * 0.1);
}

export function demoSeries(s: Sensor, from: number, to: number, points = 120): Reading[] {
  const step = Math.max(1, (to - from) / points);
  const out: Reading[] = [];
  for (let t = from; t <= to; t += step) out.push({ t, v: demoValue(s, t) });
  return out;
}

export function feedsToReadings(sensors: Sensor[], feeds: Record<string, string | null>[]) {
  const out: Record<string, Reading[]> = {};
  for (const s of sensors) {
    if (!s.thingspeak_field) continue;
    out[s.id] = feeds
      .map((f) => ({ t: Date.parse(f.created_at ?? ""), v: parseFloat(f[`field${s.thingspeak_field}`] ?? "") }))
      .filter((r) => !isNaN(r.t) && !isNaN(r.v));
  }
  return out;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [readings, setReadings] = useState<Record<string, Reading[]>>({});
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data: p } = await supabase.from("projects").select("*").order("created_at").limit(1).maybeSingle();
    setProject(p ?? null);
    if (p) {
      const [s, d] = await Promise.all([
        supabase.from("sensors").select("*").eq("project_id", p.id).order("sort_order").order("created_at"),
        supabase.from("devices").select("*").eq("project_id", p.id).order("sort_order").order("created_at"),
      ]);
      setSensors(s.data ?? []);
      setDevices(d.data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime device state
  useEffect(() => {
    if (!project) return;
    const ch = supabase
      .channel(`devices-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "devices", filter: `project_id=eq.${project.id}` }, (payload) => {
        setDevices((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((d) => d.id !== (payload.old as Device).id);
          const row = payload.new as Device;
          const i = prev.findIndex((d) => d.id === row.id);
          if (i === -1) return [...prev, row];
          const n = prev.slice(); n[i] = row; return n;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [project?.id]);

  // Telemetry polling
  const sensorsRef = useRef(sensors);
  sensorsRef.current = sensors;
  useEffect(() => {
    if (!project) return;
    let stop = false;
    const tick = async () => {
      const ss = sensorsRef.current.filter((s) => s.enabled);
      if (project.demo_mode) {
        const now = Date.now();
        const r: Record<string, Reading[]> = {};
        for (const s of ss) r[s.id] = demoSeries(s, now - 2 * 3600000, now, 60);
        setReadings(r);
        setTelemetryError(null);
      } else if (project.thingspeak_enabled && project.thingspeak_channel_id) {
        const res = await fetchThingSpeak({ data: { projectId: project.id, results: 200 } }).catch(() => null);
        if (stop) return;
        if (res) { setReadings(feedsToReadings(ss, res.feeds)); setTelemetryError(res.error); }
      } else {
        setReadings({});
        setTelemetryError(null);
      }
    };
    tick();
    const ms = project.demo_mode ? 5000 : Math.max(15, project.thingspeak_interval_sec) * 1000;
    const id = setInterval(tick, ms);
    return () => { stop = true; clearInterval(id); };
  }, [project?.id, project?.demo_mode, project?.thingspeak_enabled, project?.thingspeak_channel_id, project?.thingspeak_interval_sec, sensors.length]);

  const updateProject = useCallback(async (patch: Partial<Project>) => {
    if (!project) return;
    const { data, error } = await supabase.from("projects").update(patch).eq("id", project.id).select().single();
    if (error) throw error;
    setProject(data);
  }, [project]);

  const value = useMemo(
    () => ({ loading, project, sensors, devices, readings, telemetryError, reload, updateProject }),
    [loading, project, sensors, devices, readings, telemetryError, reload, updateProject],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useProject() {
  const c = useContext(C);
  if (!c) throw new Error("useProject outside provider");
  return c;
}

export function latest(readings: Reading[] | undefined) {
  return readings && readings.length ? readings[readings.length - 1] : null;
}

export function sensorLevel(s: Sensor, v: number | null): "normal" | "warning" | "critical" {
  if (v == null) return "normal";
  if (s.value_kind === "binary") return v >= 1 && s.alerts_enabled ? "warning" : "normal";
  if (s.critical_threshold != null && v >= Number(s.critical_threshold)) return "critical";
  if (s.warning_threshold != null && v >= Number(s.warning_threshold)) return "warning";
  return "normal";
}

export function formatValue(s: Sensor, v: number | null) {
  if (v == null) return "—";
  if (s.value_kind === "binary") {
    const n = s.name.toLowerCase();
    if (n.includes("motion")) return v ? "Detected" : "Clear";
    if (n.includes("door")) return v ? "Open" : "Closed";
    if (n.includes("rain")) return v ? "Raining" : "Dry";
    if (n.includes("flame")) return v ? "Flame!" : "Normal";
    return v ? "Active" : "Inactive";
  }
  return v.toFixed(s.decimals);
}

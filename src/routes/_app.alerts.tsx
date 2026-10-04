import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, Check, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatValue, latest, sensorLevel, useProject } from "@/lib/project";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Smart Room" },
      { name: "description", content: "Warnings and critical events from your smart room sensors." },
      { property: "og:title", content: "Alerts — Smart Room" },
      { property: "og:description", content: "Warnings and critical events from your smart room sensors." },
    ],
  }),
  component: Alerts,
});

type Ev = Database["public"]["Tables"]["events"]["Row"];

function Alerts() {
  const { project, sensors, readings } = useProject();
  const [rows, setRows] = useState<Ev[]>([]);
  const logged = useRef<Record<string, string>>({});

  const load = async () => {
    if (!project) return;
    const { data } = await supabase.from("events").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [project?.id]);

  // Log new threshold crossings as events (once per level change per sensor)
  useEffect(() => {
    if (!project) return;
    for (const s of sensors) {
      if (!s.enabled || !s.alerts_enabled) continue;
      const l = latest(readings[s.id]);
      const lvl = sensorLevel(s, l?.v ?? null);
      const prev = logged.current[s.id];
      logged.current[s.id] = lvl;
      if (prev === undefined || lvl === "normal" || lvl === prev || !l) continue;
      supabase.from("events").insert({
        project_id: project.id, kind: "threshold", severity: lvl, sensor_id: s.id, value: l.v,
        title: `${s.name} ${lvl === "critical" ? "critical" : "warning"}`,
        detail: `${s.name} reading ${formatValue(s, l.v)} ${s.unit ?? ""}`.trim(),
      }).then(load);
    }
  }, [readings]);

  const active = sensors.filter((s) => s.enabled && s.alerts_enabled).map((s) => ({ s, l: latest(readings[s.id]) }))
    .map((x) => ({ ...x, lvl: sensorLevel(x.s, x.l?.v ?? null) })).filter((x) => x.lvl !== "normal");
  const tz = project?.timezone ?? "Africa/Kampala";

  async function ackAll() {
    if (!project) return;
    await supabase.from("events").update({ acknowledged: true }).eq("project_id", project.id).eq("acknowledged", false);
    load();
  }

  return (
    <>
      <PageHeader title="Alerts" subtitle="Active warnings and recent event history."
        action={rows.some((r) => !r.acknowledged) && <Button variant="outline" onClick={ackAll}><Check />Mark all read</Button>} />
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active now</h2>
        {active.length === 0 ? (
          <div className="card-surface flex items-center gap-3 p-5 text-sm text-muted-foreground"><Check className="size-4 text-success" />All sensors are within normal range.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map(({ s, l, lvl }) => (
              <div key={s.id} className={cn("flex items-center gap-3 rounded-lg border p-4", lvl === "critical" ? "border-destructive bg-danger-soft" : "border-warning bg-warning-soft")}>
                <AlertTriangle className={cn("size-5", lvl === "critical" ? "text-destructive" : "text-warning")} />
                <div><p className="font-semibold">{s.name}</p><p className="text-sm tabular">{formatValue(s, l?.v ?? null)} {s.value_kind !== "binary" ? s.unit : ""}</p></div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="card-surface">
        <div className="border-b px-5 py-4"><h2 className="text-base font-semibold">History</h2></div>
        {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No events yet.</p>}
        <div className="divide-y">
          {rows.map((r) => {
            const Icon = r.severity === "critical" || r.severity === "warning" ? AlertTriangle : r.kind === "notification" ? Bell : Info;
            return (
              <div key={r.id} className={cn("flex items-start gap-3 px-5 py-3", !r.acknowledged && "bg-primary-soft/40")}>
                <Icon className={cn("mt-0.5 size-4", r.severity === "critical" ? "text-destructive" : r.severity === "warning" ? "text-warning" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.title}</p>
                  {r.detail && <p className="text-xs text-muted-foreground">{r.detail}</p>}
                </div>
                <span className="text-xs tabular text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB", { timeZone: tz, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

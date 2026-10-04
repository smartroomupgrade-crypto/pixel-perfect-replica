import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, WifiOff } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/AppShell";
import { formatValue, latest, sensorLevel, useProject } from "@/lib/project";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring — Smart Room" },
      { name: "description", content: "Live sensor readings from your smart room." },
      { property: "og:title", content: "Monitoring — Smart Room" },
      { property: "og:description", content: "Live sensor readings from your smart room." },
    ],
  }),
  component: Monitoring,
});

const levelTone = {
  normal: "border-border",
  warning: "border-warning bg-warning-soft",
  critical: "border-destructive bg-danger-soft",
};

function Monitoring() {
  const { project, sensors, readings, telemetryError } = useProject();
  const list = sensors.filter((s) => s.enabled && s.show_on_monitoring);
  const tz = project?.timezone ?? "Africa/Kampala";
  const lastAll = Math.max(0, ...list.map((s) => latest(readings[s.id])?.t ?? 0));
  const stale = lastAll > 0 && Date.now() - lastAll > (project?.offline_timeout_sec ?? 120) * 1000;
  const noSource = !project?.demo_mode && !project?.thingspeak_enabled;

  return (
    <>
      <PageHeader title="Monitoring" subtitle={lastAll ? `Last update ${new Date(lastAll).toLocaleTimeString("en-GB", { timeZone: tz })}` : "Waiting for data"} />
      {(stale || telemetryError || noSource) && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <span>
            {noSource ? "No data source connected. Turn on ThingSpeak or Demo mode in Settings."
              : telemetryError ? `Data connection problem: ${telemetryError}`
              : "Sensors look offline — no new readings recently. Values shown may be out of date."}
          </span>
        </div>
      )}
      {list.length === 0 ? (
        <div className="card-surface p-10 text-center text-sm text-muted-foreground">No sensors yet. Add them in Settings.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const r = readings[s.id];
            const l = latest(r);
            const lvl = sensorLevel(s, l?.v ?? null);
            return (
              <div key={s.id} className={cn("card-surface border p-5", levelTone[lvl])}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{s.name}</p>
                  {lvl !== "normal" && <AlertTriangle className={cn("size-4", lvl === "critical" ? "text-destructive" : "text-warning")} />}
                </div>
                <p className="mt-2 font-display text-3xl font-bold tabular">
                  {formatValue(s, l?.v ?? null)}
                  {s.value_kind !== "binary" && l && <span className="ml-1 text-base font-medium text-muted-foreground">{s.unit}</span>}
                </p>
                {s.value_kind !== "binary" && r && r.length > 1 && (
                  <div className="mt-3 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={r.slice(-40)}>
                        <Line type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

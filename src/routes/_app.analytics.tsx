import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/AppShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demoSeries, type Reading, type Sensor, useProject } from "@/lib/project";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Smart Room" },
      { name: "description", content: "Sensor trends, averages and peaks over time." },
      { property: "og:title", content: "Analytics — Smart Room" },
      { property: "og:description", content: "Sensor trends, averages and peaks over time." },
    ],
  }),
  component: Analytics,
});

const RANGES = { "1h": 3600e3, "6h": 6 * 3600e3, "24h": 24 * 3600e3, "7d": 7 * 24 * 3600e3 } as const;

function Analytics() {
  const { project, sensors, readings } = useProject();
  const [range, setRange] = useState<keyof typeof RANGES>("6h");
  const list = sensors.filter((s) => s.enabled && s.include_in_analytics && s.value_kind !== "binary");
  return (
    <>
      <PageHeader title="Analytics" subtitle="Tap any point on a chart to see its exact time and value."
        action={
          <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGES)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(RANGES).map((k) => <SelectItem key={k} value={k}>Last {k}</SelectItem>)}</SelectContent>
          </Select>
        } />
      {list.length === 0 && <div className="card-surface p-10 text-center text-sm text-muted-foreground">No numeric sensors to chart yet.</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        {list.map((s) => {
          const now = Date.now();
          const data = project?.demo_mode ? demoSeries(s, now - RANGES[range], now, 120) : (readings[s.id] ?? []).filter((r) => r.t >= now - RANGES[range]);
          return <SensorChart key={s.id} sensor={s} data={data} tz={project?.timezone ?? "Africa/Kampala"} long={range === "7d"} />;
        })}
      </div>
    </>
  );
}

function SensorChart({ sensor: s, data, tz, long }: { sensor: Sensor; data: Reading[]; tz: string; long: boolean }) {
  const [sel, setSel] = useState<Reading | null>(null);
  const stats = useMemo(() => {
    if (!data.length) return null;
    let max = data[0], min = data[0], sum = 0;
    for (const r of data) { if (r.v > max.v) max = r; if (r.v < min.v) min = r; sum += r.v; }
    return { max, min, avg: sum / data.length };
  }, [data]);
  const fmt = (t: number) => new Date(t).toLocaleString("en-GB", { timeZone: tz, ...(long ? { day: "2-digit", month: "short" } : {}), hour: "2-digit", minute: "2-digit" });
  const v = (n: number) => `${n.toFixed(s.decimals)} ${s.unit ?? ""}`;
  return (
    <section className="card-surface p-5">
      <h2 className="text-base font-semibold">{s.name}</h2>
      {stats ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <button className="rounded-md bg-secondary px-2 py-1.5 text-left" onClick={() => setSel(stats.max)}><span className="block text-muted-foreground">Peak</span><span className="font-semibold tabular">{v(stats.max.v)}</span></button>
          <button className="rounded-md bg-secondary px-2 py-1.5 text-left" onClick={() => setSel(stats.min)}><span className="block text-muted-foreground">Lowest</span><span className="font-semibold tabular">{v(stats.min.v)}</span></button>
          <div className="rounded-md bg-secondary px-2 py-1.5"><span className="block text-muted-foreground">Average</span><span className="font-semibold tabular">{v(stats.avg)}</span></div>
        </div>
      ) : <p className="mt-2 text-sm text-muted-foreground">No readings in this period.</p>}
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} onClick={(e) => { const p = e?.activePayload?.[0]?.payload as Reading | undefined; if (p) setSel(p); }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fmt} fontSize={11} stroke="var(--muted-foreground)" />
            <YAxis fontSize={11} width={40} stroke="var(--muted-foreground)" domain={["auto", "auto"]} />
            <Tooltip labelFormatter={(t) => fmt(Number(t))} formatter={(x) => [v(Number(x)), s.name]} />
            <Line type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {sel && <ReferenceDot x={sel.t} y={sel.v} r={5} fill="var(--primary)" stroke="var(--background)" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {sel && <p className="mt-2 text-sm"><span className="font-semibold tabular">{v(sel.v)}</span> <span className="text-muted-foreground">at {fmt(sel.t)}</span></p>}
    </section>
  );
}

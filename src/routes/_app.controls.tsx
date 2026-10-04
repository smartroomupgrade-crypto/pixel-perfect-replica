import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PremiumVisual } from "@/components/PremiumDevice";
import { sendDeviceCommand } from "@/lib/iot.functions";
import { useProject, type Device } from "@/lib/project";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/controls")({
  head: () => ({
    meta: [
      { title: "Controls — Smart Room" },
      { name: "description", content: "Switch your fan and lamp on and off remotely." },
      { property: "og:title", content: "Controls — Smart Room" },
      { property: "og:description", content: "Switch your fan and lamp on and off remotely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Controls,
});

// V1 shows only these; more types can be enabled later.
const V1_TYPES = [
  { type: "fan", label: "Fan" },
  { type: "lamp", label: "Lamp", alt: ["light"] },
];

function Controls() {
  const { devices } = useProject();
  return (
    <div className="mx-auto max-w-4xl py-4">
      <div className="grid gap-6 sm:grid-cols-2">
        {V1_TYPES.map((t) => {
          const d = devices.find((x) => x.enabled && (x.device_type === t.type || t.alt?.includes(x.device_type)));
          return <PremiumCard key={t.type} type={t.type} label={d?.name ?? t.label} device={d} />;
        })}
      </div>
    </div>
  );
}

function PremiumCard({ type, label, device }: { type: string; label: string; device?: Device }) {
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const on = optimistic ?? device?.state === "on";

  async function toggle() {
    if (!device) {
      toast.message(`Add a ${label.toLowerCase()} in Settings to control it`);
      return;
    }
    if (busy) return;
    const next = !on;
    setOptimistic(next);
    setBusy(true);
    try {
      const r = await sendDeviceCommand({ data: { deviceId: device.id, command: next ? "ON" : "OFF" } });
      if (!r.ok) {
        toast.error(`${label}: ${r.reason}`);
        setOptimistic(null);
      } else if (!("pending" in r && r.pending)) {
        setOptimistic(null);
      }
    } catch {
      toast.error(`${label}: command failed`);
      setOptimistic(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-[28px] bg-card p-5 shadow-[0_20px_50px_-24px_color-mix(in_oklab,var(--foreground)_35%,transparent)] ring-1 ring-border/60">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Turn ${label} ${on ? "off" : "on"}`}
        className={cn(
          "relative block aspect-square w-full rounded-[22px] p-10 transition-colors duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          on ? "bg-gradient-to-b from-secondary to-background" : "bg-muted/60",
        )}
      >
        <div className={cn("h-full w-full transition-transform duration-300 active:scale-95", !on && "opacity-90")}>
          <PremiumVisual type={type} on={on} />
        </div>
      </button>
      <div className="mt-5 flex items-center justify-between px-1">
        <h2 className="text-xl font-semibold tracking-tight">{label}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          className={cn(
            "relative flex h-10 w-[92px] items-center rounded-full px-1 text-xs font-semibold tracking-wider transition-colors duration-300",
            on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <span className={cn("absolute size-8 rounded-full bg-background shadow-md transition-transform duration-300 ease-out", on ? "translate-x-[52px]" : "translate-x-0")} />
          <span className={cn("w-full transition-all duration-300", on ? "pl-3 text-left" : "pr-3 text-right")}>{on ? "ON" : "OFF"}</span>
        </button>
      </div>
      {!device && (
        <Link to="/settings" className="mt-2 block px-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
          Set up in Settings
        </Link>
      )}
    </article>
  );
}

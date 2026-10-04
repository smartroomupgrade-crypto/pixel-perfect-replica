import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { DeviceCard } from "@/components/DeviceCard";
import { CommandHistory } from "@/components/settings/ConfigSections";
import { useProject } from "@/lib/project";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/controls")({
  head: () => ({
    meta: [
      { title: "Controls — Smart Room" },
      { name: "description", content: "Switch your smart room devices on and off remotely." },
      { property: "og:title", content: "Controls — Smart Room" },
      { property: "og:description", content: "Switch your smart room devices on and off remotely." },
    ],
  }),
  component: Controls,
});

function Controls() {
  const { devices } = useProject();
  const list = devices.filter((d) => d.enabled);
  const rooms = Array.from(new Set(list.map((d) => d.room || "Other")));
  return (
    <>
      <PageHeader title="Controls" subtitle="Device states update only after the hardware confirms them." />
      {list.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-muted-foreground">No devices yet. Add your lights, fans and sockets in Settings.</p>
          <Button asChild className="mt-4"><Link to="/settings">Add devices</Link></Button>
        </div>
      ) : (
        rooms.map((room) => (
          <section key={room} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{room}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.filter((d) => (d.room || "Other") === room).map((d) => <DeviceCard key={d.id} device={d} />)}
            </div>
          </section>
        ))
      )}
      <CommandHistory limit={15} />
    </>
  );
}

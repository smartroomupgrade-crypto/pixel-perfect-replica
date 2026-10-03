import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { DeviceVisual } from "./DeviceVisual";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_LABEL } from "@/lib/catalog";
import { sendDeviceCommand } from "@/lib/iot.functions";
import type { Device } from "@/lib/project";
import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  confirmed_on: "bg-success-soft text-success",
  on: "bg-success-soft text-success",
  confirmed_off: "bg-muted text-muted-foreground",
  off: "bg-muted text-muted-foreground",
  command_sent: "bg-primary-soft text-primary",
  connecting: "bg-primary-soft text-primary",
  offline: "bg-muted text-muted-foreground",
  error: "bg-danger-soft text-destructive",
};

export function DeviceCard({ device }: { device: Device }) {
  const [busy, setBusy] = useState(false);
  const [val, setVal] = useState<number>(Number(device.value ?? 50));
  const [custom, setCustom] = useState("");
  const on = device.state === "on";
  const pending = busy || device.status === "command_sent" || device.status === "connecting";

  async function send(command: string, value?: number) {
    setBusy(true);
    try {
      const r = await sendDeviceCommand({ data: { deviceId: device.id, command, value } });
      if (!r.ok) toast.error(`${device.name}: ${r.reason}`);
      else if (r.pending) toast.message(`${device.name}: command delivered, awaiting confirmation`);
    } catch (e) {
      toast.error("Command failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card-surface flex flex-col overflow-hidden transition-shadow hover:shadow-raised">
      <div className={cn("relative mx-4 mt-4 aspect-[4/3] rounded-xl p-6 transition-colors duration-500", on ? "bg-primary-soft" : "bg-muted")}>
        <DeviceVisual type={device.device_type} on={on} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{device.name}</h3>
            {device.room && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{device.room}</p>
            )}
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide tabular", tone[device.status] ?? tone.off)}>
            {pending ? <Loader2 className="mr-1 inline size-3 animate-spin" /> : null}
            {STATUS_LABEL[device.status] ?? device.status.toUpperCase()}
          </span>
        </div>

        {(device.control_type === "onoff" || device.control_type === "toggle") && (
          <label className="mt-auto flex cursor-pointer items-center justify-between rounded-xl bg-secondary px-4 py-3">
            <span className="text-sm font-medium">{on ? "ON" : "OFF"}</span>
            <Switch
              className="scale-125"
              checked={on}
              disabled={pending || !device.enabled}
              onCheckedChange={(c) => send(c ? "ON" : "OFF")}
              aria-label={`Turn ${device.name} ${on ? "off" : "on"}`}
            />
          </label>
        )}

        {(device.control_type === "slider" || device.control_type === "numeric") && (
          <div className="mt-auto space-y-3 rounded-xl bg-secondary px-4 py-3">
            <div className="flex justify-between text-sm"><span>Level</span><span className="tabular">{val}</span></div>
            {device.control_type === "slider" ? (
              <Slider value={[val]} max={100} step={1} onValueChange={(v) => setVal(v[0])} onValueCommit={(v) => send("SET", v[0])} disabled={pending} />
            ) : (
              <div className="flex gap-2">
                <Input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} />
                <Button onClick={() => send("SET", val)} disabled={pending}>Set</Button>
              </div>
            )}
          </div>
        )}

        {device.control_type === "mode" && (
          <div className="mt-auto grid grid-cols-3 gap-2">
            {["OFF", "LOW", "HIGH"].map((m) => (
              <Button key={m} variant="outline" size="sm" disabled={pending} onClick={() => send(m === "OFF" ? "OFF" : m === "HIGH" ? "ON" : m)}>{m}</Button>
            ))}
          </div>
        )}

        {device.control_type === "custom" && (
          <div className="mt-auto flex gap-2">
            <Input placeholder={device.command_on || "Command"} value={custom} onChange={(e) => setCustom(e.target.value)} />
            <Button disabled={pending || !custom} onClick={() => send(custom.toUpperCase())}>Send</Button>
          </div>
        )}
      </div>
    </article>
  );
}

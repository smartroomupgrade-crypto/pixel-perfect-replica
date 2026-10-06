// Local-first communication layer for the Smart Room.
// LocalGatewayService talks to the Wi-Fi gateway on the same network.
// RemoteGatewayService talks through the cloud backend.
// CommunicationManager picks the path automatically: LOCAL first, REMOTE fallback.

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sendDeviceCommand } from "./iot.functions";
import { useProject, type Device, type Project } from "./project";

export type LogicalDevice = string;
export type LogicalCommand = string;
export type ConnMode = "local" | "remote" | "connecting" | "offline";
export type CommandStatus = "PENDING" | "SENT" | "CONFIRMED" | "FAILED" | "TIMEOUT";

export interface CommandResult {
  status: CommandStatus;
  source: "LOCAL" | "REMOTE" | null;
  state?: "on" | "off";
  error?: string;
  latencyMs?: number;
}

// ---- Hardware message parsing (modular: add new prefixes here) ----
export interface GatewayState {
  fan?: "on" | "off";
  lamp?: "on" | "off";
  sensors: Record<string, number | string>;
  pong: boolean;
}

export function parseGatewayMessage(text: string): GatewayState {
  const out: GatewayState = { sensors: {}, pong: false };
  for (const raw of text.split(/[\n;]+/)) {
    const line = raw.trim();
    if (!line) continue;
    const [key, val] = line.split(",").map((s) => s.trim());
    const k = key?.toUpperCase();
    if (k === "PONG") out.pong = true;
    else if (k === "FAN_STATE") out.fan = val?.toUpperCase() === "ON" ? "on" : "off";
    else if (k === "LAMP_STATE") out.lamp = val?.toUpperCase() === "ON" ? "on" : "off";
    else if (k && val !== undefined) {
      const n = parseFloat(val);
      out.sensors[k] = isNaN(n) ? val.toUpperCase() : n;
    }
  }
  return out;
}

function logicalFor(device: Device): LogicalDevice | null {
  const t = device.device_type;
  if (t === "fan") return "FAN";
  if (t === "lamp" || t === "light") return "LAMP";
  const key = (device.device_key || device.name || t).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  return key || null;
}

// ---- Local gateway service ----
class LocalGatewayService {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private url(path: string) {
    const b = this.baseUrl.trim().replace(/\/+$/, "");
    return b + "/" + path.replace(/^\/+/, "");
  }

  private headers(): Record<string, string> {
    return this.apiKey ? { "X-API-Key": this.apiKey } : {};
  }

  async ping(timeoutMs = 2500): Promise<{ ok: boolean; latencyMs: number }> {
    const t0 = performance.now();
    try {
      const res = await fetch(this.url("ping"), { headers: this.headers(), signal: AbortSignal.timeout(timeoutMs) });
      const latencyMs = Math.round(performance.now() - t0);
      if (!res.ok) return { ok: false, latencyMs };
      const text = await res.text().catch(() => "");
      // Accept PONG, or any 2xx from a gateway that only implements /status-style replies
      return { ok: text.toUpperCase().includes("PONG") || res.ok, latencyMs };
    } catch {
      return { ok: false, latencyMs: Math.round(performance.now() - t0) };
    }
  }

  async getState(timeoutMs = 3000): Promise<GatewayState | null> {
    try {
      const res = await fetch(this.url("state"), { headers: this.headers(), signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) return null;
      return parseGatewayMessage(await res.text());
    } catch {
      return null;
    }
  }

  async sendCommand(cmd: LogicalCommand, gatewayId?: string | null, timeoutMs = 5000): Promise<GatewayState | null> {
    try {
      const res = await fetch(this.url("command"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.headers() },
        body: JSON.stringify({ command: cmd, gateway_id: gatewayId ?? undefined }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      return parseGatewayMessage(await res.text());
    } catch {
      return null;
    }
  }
}

// ---- Communication manager (React provider) ----
type ManagerCtx = {
  mode: ConnMode;
  latencyMs: number | null;
  lastOkAt: number | null;
  testing: boolean;
  testConnection: () => Promise<{ ok: boolean; message: string }>;
  sendCommand: (device: Device, on: boolean) => Promise<CommandResult>;
  syncState: () => Promise<void>;
  confirmed: Record<string, "on" | "off">; // device id -> confirmed physical state
};
const Ctx = createContext<ManagerCtx | null>(null);

const LOCAL_RECHECK_MS = 30_000;
const FAILS_TO_SWITCH = 2;

export function CommunicationProvider({ children }: { children: ReactNode }) {
  const { project, devices, reload } = useProject();
  const [mode, setMode] = useState<ConnMode>("connecting");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [confirmed, setConfirmed] = useState<Record<string, "on" | "off">>({});
  const fails = useRef(0);
  const projectRef = useRef<Project | null>(null);
  projectRef.current = project;

  const localSvc = useMemo(() => {
    const ip = project?.gateway_local_ip;
    if (!ip) return null;
    const base = /^https?:\/\//.test(ip) ? ip : `http://${ip}`;
    return new LocalGatewayService(base);
  }, [project?.gateway_local_ip]);

  const markOk = (m: "local" | "remote", ms: number | null) => {
    fails.current = 0;
    setMode(m);
    setLatencyMs(ms);
    setLastOkAt(Date.now());
  };
  const markFail = () => {
    fails.current += 1;
    if (fails.current >= FAILS_TO_SWITCH) setMode((m) => (m === "local" ? "connecting" : "offline"));
  };

  // Probe local gateway; prefer it whenever reachable.
  const probe = async (): Promise<boolean> => {
    if (!localSvc) return false;
    const r = await localSvc.ping();
    if (r.ok) {
      markOk("local", r.latencyMs);
      return true;
    }
    return false;
  };

  // Startup + periodic local re-check (rule 5/6: prefer local, avoid flapping)
  useEffect(() => {
    let stop = false;
    (async () => {
      setMode("connecting");
      if (await probe()) return;
      if (projectRef.current?.remote_enabled) setMode("remote");
      else setMode("offline");
    })();
    const id = setInterval(async () => {
      if (stop) return;
      if (mode !== "local") {
        const ok = await probe();
        if (!ok && mode === "remote") setLastOkAt((v) => v); // stay remote
      }
    }, LOCAL_RECHECK_MS);
    return () => { stop = true; clearInterval(id); };
  }, [localSvc, project?.remote_enabled]);

  const syncState = async () => {
    if (!localSvc) return;
    const st = await localSvc.getState();
    if (!st) return;
    setConfirmed((prev) => {
      const next = { ...prev };
      for (const d of devices) {
        const ld = logicalFor(d);
        if (ld === "FAN" && st.fan) next[d.id] = st.fan;
        if (ld === "LAMP" && st.lamp) next[d.id] = st.lamp;
      }
      return next;
    });
  };

  const sendCommand = async (device: Device, on: boolean): Promise<CommandResult> => {
    const ld = logicalFor(device);
    if (!ld) return { status: "FAILED", source: null, error: "Unsupported device" };
    const cmd: LogicalCommand = `${ld}_${on ? "ON" : "OFF"}` as LogicalCommand;

    // Try LOCAL first
    if (localSvc && mode !== "offline") {
      const t0 = performance.now();
      const st = await localSvc.sendCommand(cmd, project?.gateway_id);
      if (st) {
        const state = ld === "FAN" ? st.fan : ld === "LAMP" ? st.lamp : (typeof st.sensors[`${ld}_STATE`] === "string" ? (String(st.sensors[`${ld}_STATE`]) === "ON" ? "on" : "off") : undefined);
        if (state) {
          markOk("local", Math.round(performance.now() - t0));
          setConfirmed((p) => ({ ...p, [device.id]: state }));
          return { status: "CONFIRMED", source: "LOCAL", state, latencyMs: Math.round(performance.now() - t0) };
        }
        // Gateway answered but no state line — sent, awaiting confirmation
        markOk("local", Math.round(performance.now() - t0));
        return { status: "SENT", source: "LOCAL" };
      }
      markFail();
    }

    // REMOTE fallback
    if (project?.remote_enabled) {
      try {
        const r = await sendDeviceCommand({ data: { deviceId: device.id, command: on ? "ON" : "OFF" } });
        if (r.ok && !("pending" in r && r.pending)) {
          markOk("remote", null);
          setConfirmed((p) => ({ ...p, [device.id]: on ? "on" : "off" }));
          return { status: "CONFIRMED", source: "REMOTE", state: on ? "on" : "off" };
        }
        if (r.ok) {
          markOk("remote", null);
          return { status: "SENT", source: "REMOTE" };
        }
        return { status: "FAILED", source: "REMOTE", error: r.reason ?? "Remote command failed" };
      } catch {
        return { status: "FAILED", source: "REMOTE", error: "Remote path unreachable" };
      }
    }

    setMode("offline");
    return { status: "TIMEOUT", source: null, error: "Command could not reach the Smart Room" };
  };

  const testConnection = async (): Promise<{ ok: boolean; message: string }> => {
    setTesting(true);
    try {
      // Step 1: local PING/PONG
      if (localSvc) {
        const r = await localSvc.ping();
        if (r.ok) {
          markOk("local", r.latencyMs);
          await syncState();
          return { ok: true, message: `Local gateway connected${project?.gateway_id ? ` · ${project.gateway_id}` : ""} · ${r.latencyMs} ms` };
        }
      }
      // Step 2: remote fallback
      if (project?.remote_enabled && project?.gateway_url) {
        const { testGateway } = await import("./iot.functions");
        const r = await testGateway({ data: { projectId: project.id } }).catch(() => ({ online: false, message: "Remote test failed" }));
        if (r.online) {
          markOk("remote", null);
          reload();
          return { ok: true, message: `Remote connection OK — ${r.message}` };
        }
        setMode("offline");
        reload();
        return { ok: false, message: r.message ?? "Remote gateway not reachable" };
      }
      setMode("offline");
      return { ok: false, message: localSvc ? "Local gateway did not answer PING" : "No local IP or remote address configured" };
    } finally {
      setTesting(false);
    }
  };

  const value = useMemo(
    () => ({ mode, latencyMs, lastOkAt, testing, testConnection, sendCommand, syncState, confirmed }),
    [mode, latencyMs, lastOkAt, testing, confirmed, devices, project?.id],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const FALLBACK: ManagerCtx = {
  mode: "connecting",
  latencyMs: null,
  lastOkAt: null,
  testing: false,
  testConnection: async () => ({ ok: false, message: "Connection manager not ready" }),
  sendCommand: async () => ({ status: "FAILED", source: null, error: "Connection manager not ready" }),
  syncState: async () => {},
  confirmed: {},
};

export function useGateway(): ManagerCtx {
  const c = useContext(Ctx);
  if (!c) return FALLBACK;
  return c;
}

export const MODE_LABEL: Record<ConnMode, string> = {
  local: "Local Connected",
  remote: "Remote Connected",
  connecting: "Connecting",
  offline: "Offline",
};

// Shared naming contract between the app and the Smart Room gateway firmware.
// Fan devices are always "FAN", lamp/light devices are always "LAMP";
// any other device uses its Device ID in capitals (e.g. "desk_socket" -> "DESK_SOCKET").
// Commands are `${KEY}_ON` / `${KEY}_OFF`; the hardware confirms with `${KEY}_STATE,ON|OFF`.

export interface LogicalDeviceLike {
  device_type: string;
  device_key?: string | null;
  name?: string | null;
}

export function logicalKey(device: LogicalDeviceLike): string | null {
  const t = device.device_type;
  if (t === "fan") return "FAN";
  if (t === "lamp" || t === "light") return "LAMP";
  const key = (device.device_key || device.name || t)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return key || null;
}

export function logicalCommand(device: LogicalDeviceLike, on: boolean): string | null {
  const k = logicalKey(device);
  return k ? `${k}_${on ? "ON" : "OFF"}` : null;
}

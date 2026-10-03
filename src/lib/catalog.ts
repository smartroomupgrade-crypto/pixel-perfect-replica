export const DEVICE_TYPES = [
  { value: "fan", label: "Fan" },
  { value: "lamp", label: "Lamp" },
  { value: "light", label: "Light" },
  { value: "socket", label: "Socket" },
  { value: "pump", label: "Water Pump" },
  { value: "door", label: "Door" },
  { value: "curtain", label: "Curtains" },
  { value: "ac", label: "Air Conditioner" },
  { value: "tv", label: "Television" },
  { value: "valve", label: "Valve" },
  { value: "alarm", label: "Alarm / Buzzer" },
  { value: "rain", label: "Rain Protection" },
  { value: "custom", label: "Custom Device" },
] as const;

export const CONTROL_TYPES = [
  { value: "onoff", label: "ON / OFF" },
  { value: "toggle", label: "Toggle" },
  { value: "slider", label: "Slider" },
  { value: "numeric", label: "Numeric value" },
  { value: "mode", label: "Mode selection" },
  { value: "custom", label: "Custom command" },
] as const;

export const SENSOR_PRESETS: { type: string; name: string; unit: string; kind: "numeric" | "binary"; min?: number; max?: number }[] = [
  { type: "DHT22", name: "Temperature", unit: "°C", kind: "numeric", min: -10, max: 60 },
  { type: "DHT22", name: "Humidity", unit: "%", kind: "numeric", min: 0, max: 100 },
  { type: "PIR", name: "Motion", unit: "", kind: "binary" },
  { type: "Reed Switch", name: "Door Contact", unit: "", kind: "binary" },
  { type: "HC-SR04", name: "Distance", unit: "cm", kind: "numeric", min: 2, max: 400 },
  { type: "MQ-2", name: "Gas", unit: "ppm", kind: "numeric", min: 0, max: 1000 },
  { type: "ZMPT101B", name: "Voltage", unit: "V", kind: "numeric", min: 0, max: 260 },
  { type: "ACS712", name: "Current", unit: "A", kind: "numeric", min: 0, max: 30 },
  { type: "Rain Sensor", name: "Rain", unit: "", kind: "binary" },
  { type: "LDR", name: "Light Level", unit: "lx", kind: "numeric", min: 0, max: 1000 },
  { type: "Soil Moisture", name: "Soil Moisture", unit: "%", kind: "numeric", min: 0, max: 100 },
  { type: "Water Level", name: "Water Level", unit: "%", kind: "numeric", min: 0, max: 100 },
  { type: "Flame Sensor", name: "Flame", unit: "", kind: "binary" },
  { type: "DS18B20", name: "Water Temperature", unit: "°C", kind: "numeric", min: -20, max: 100 },
  { type: "BMP280", name: "Pressure", unit: "hPa", kind: "numeric", min: 300, max: 1100 },
  { type: "CO2 Sensor", name: "CO₂", unit: "ppm", kind: "numeric", min: 400, max: 5000 },
  { type: "Air Quality", name: "Air Quality", unit: "AQI", kind: "numeric", min: 0, max: 500 },
  { type: "Custom", name: "Custom Sensor", unit: "", kind: "numeric" },
];

export const TIMEZONES = [
  "Africa/Kampala", "Africa/Nairobi", "Africa/Lagos", "Africa/Johannesburg", "Africa/Cairo",
  "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
  "America/New_York", "America/Los_Angeles", "UTC",
];

export type DeviceStatus =
  | "on" | "off" | "connecting" | "command_sent" | "confirmed_on" | "confirmed_off" | "offline" | "error";

export const STATUS_LABEL: Record<string, string> = {
  on: "ON", off: "OFF", connecting: "CONNECTING", command_sent: "COMMAND SENT",
  confirmed_on: "CONFIRMED ON", confirmed_off: "CONFIRMED OFF", offline: "OFFLINE", error: "ERROR",
};

export function slugKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "item";
}

import { describe, expect, it } from "vitest";
import { logicalCommand, logicalKey } from "@/lib/logical";
import { parseGatewayMessage } from "@/lib/gateway";

describe("gateway naming contract", () => {
  it("fan devices always use FAN, whatever their name", () => {
    expect(logicalCommand({ device_type: "fan", device_key: "ceiling_fan", name: "Ceiling Fan" }, true)).toBe("FAN_ON");
  });

  it("lamp and light devices both use LAMP", () => {
    expect(logicalKey({ device_type: "lamp", device_key: "desk" })).toBe("LAMP");
    expect(logicalCommand({ device_type: "light", device_key: "x" }, false)).toBe("LAMP_OFF");
  });

  it("other devices use their Device ID in capitals", () => {
    expect(logicalCommand({ device_type: "socket", device_key: "desk_socket", name: "Desk Socket" }, true)).toBe("DESK_SOCKET_ON");
  });

  it("reads confirmed states sent by the hardware", () => {
    const st = parseGatewayMessage("FAN_STATE,ON\nLAMP_STATE,OFF\nDESK_SOCKET_STATE,ON\nTEMP,26.4\n");
    expect(st.fan).toBe("on");
    expect(st.lamp).toBe("off");
    expect(st.sensors["DESK_SOCKET_STATE"]).toBe("ON");
    expect(st.sensors["TEMP"]).toBe(26.4);
  });

  it("recognises PONG", () => {
    expect(parseGatewayMessage("PONG").pong).toBe(true);
  });
});

type P = { type: string; on: boolean };

const S = "var(--color-metal-dark)";
const M = "var(--color-metal)";
const C = "var(--color-card)";
const A = "var(--color-primary)";
const G = "var(--color-glow)";
const W = "var(--color-water)";

function Base() {
  return <ellipse cx="60" cy="108" rx="34" ry="5" fill="var(--color-foreground)" opacity="0.06" />;
}

function Fan() {
  return (
    <>
      <Base />
      <rect x="54" y="62" width="12" height="40" rx="3" fill={M} />
      <rect x="40" y="98" width="40" height="8" rx="4" fill={S} />
      <circle cx="60" cy="50" r="40" fill={C} stroke={M} strokeWidth="3" />
      <circle cx="60" cy="50" r="34" fill="none" stroke={M} strokeWidth="1" strokeDasharray="2 4" />
      <g className="blades">
        {[0, 120, 240].map((r) => (
          <path key={r} transform={`rotate(${r} 60 50)`} d="M60 50 C 52 30, 62 16, 72 22 C 78 28, 70 42, 60 50 Z" fill={A} opacity="0.85" />
        ))}
        <circle cx="60" cy="50" r="6" fill={S} />
      </g>
    </>
  );
}

function Lamp() {
  return (
    <>
      <circle className="halo" cx="60" cy="44" r="40" fill={G} style={{ filter: "blur(10px)" }} />
      <Base />
      <path d="M38 52 L48 18 H72 L82 52 Z" fill={C} stroke={M} strokeWidth="2" />
      <ellipse cx="60" cy="52" rx="22" ry="4" fill={M} />
      <circle className="halo" cx="60" cy="56" r="7" fill={G} />
      <rect x="57" y="56" width="6" height="44" fill={S} />
      <rect x="42" y="100" width="36" height="7" rx="3.5" fill={S} />
    </>
  );
}

function Light() {
  return (
    <>
      <circle className="halo" cx="60" cy="50" r="40" fill={G} style={{ filter: "blur(10px)" }} />
      <Base />
      <path d="M60 14 a28 28 0 0 1 16 51 v10 h-32 v-10 a28 28 0 0 1 16 -51 z" fill={C} stroke={M} strokeWidth="2.5" />
      <path className="halo" d="M60 18 a24 24 0 0 1 13 44 v9 h-26 v-9 a24 24 0 0 1 13 -44 z" fill={G} />
      <rect x="46" y="78" width="28" height="6" rx="2" fill={S} />
      <rect x="48" y="86" width="24" height="6" rx="2" fill={S} />
      <rect x="53" y="94" width="14" height="6" rx="3" fill={S} />
    </>
  );
}

function Socket() {
  return (
    <>
      <Base />
      <rect x="22" y="18" width="76" height="80" rx="14" fill={C} stroke={M} strokeWidth="3" />
      <rect x="32" y="28" width="56" height="60" rx="10" fill="var(--color-muted)" />
      <rect x="47" y="44" width="6" height="16" rx="2" fill={S} />
      <rect x="67" y="44" width="6" height="16" rx="2" fill={S} />
      <rect x="57" y="66" width="6" height="10" rx="2" fill={S} />
      <circle className="led" cx="82" cy="34" r="4" fill="var(--color-success)" opacity="var(--led-o, 1)" />
    </>
  );
}

function Pump() {
  return (
    <>
      <Base />
      <path className="flow" d="M10 82 H40" stroke={W} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path className="flow" d="M80 40 H96 V16" stroke={W} strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="34" y="34" width="52" height="64" rx="10" fill={C} stroke={M} strokeWidth="3" />
      <g className="piston">
        <rect x="46" y="20" width="28" height="14" rx="3" fill={S} />
      </g>
      <circle cx="60" cy="66" r="16" fill="var(--color-muted)" stroke={M} strokeWidth="2" />
      <g className="blades"><path d="M60 54 L64 66 L60 78 L56 66 Z" fill={W} /><path d="M48 66 L60 62 L72 66 L60 70 Z" fill={W} /></g>
    </>
  );
}

function Door() {
  return (
    <>
      <Base />
      <rect x="30" y="10" width="60" height="96" rx="3" fill="var(--color-muted)" stroke={M} strokeWidth="3" />
      <rect x="34" y="14" width="52" height="92" fill="var(--color-primary-soft)" />
      <g className="door-leaf">
        <rect x="34" y="14" width="52" height="92" rx="2" fill={C} stroke={M} strokeWidth="2" />
        <rect x="40" y="22" width="40" height="30" rx="2" fill="none" stroke={M} />
        <rect x="40" y="60" width="40" height="38" rx="2" fill="none" stroke={M} />
        <circle cx="78" cy="60" r="3.5" fill={S} />
      </g>
    </>
  );
}

function Curtain() {
  return (
    <>
      <Base />
      <rect x="18" y="16" width="84" height="86" fill="var(--color-primary-soft)" />
      <circle cx="84" cy="34" r="8" fill={G} opacity="0.8" />
      <rect x="12" y="10" width="96" height="6" rx="3" fill={S} />
      <g className="curtain-l"><path d="M18 16 H60 V102 H18 Z" fill={A} opacity="0.75" /><path d="M28 16 V102 M40 16 V102 M50 16 V102" stroke={C} strokeOpacity="0.3" /></g>
      <g className="curtain-r"><path d="M60 16 H102 V102 H60 Z" fill={A} opacity="0.75" /><path d="M70 16 V102 M80 16 V102 M92 16 V102" stroke={C} strokeOpacity="0.3" /></g>
    </>
  );
}

function AC() {
  return (
    <>
      <Base />
      <rect x="10" y="26" width="100" height="38" rx="10" fill={C} stroke={M} strokeWidth="3" />
      <rect x="18" y="52" width="84" height="4" rx="2" fill={M} />
      <circle className="led" cx="98" cy="36" r="3" fill="var(--color-success)" />
      <g>
        <path className="breeze" d="M30 72 q6 6 0 12" stroke={W} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path className="breeze" d="M60 72 q6 6 0 12" stroke={W} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path className="breeze" d="M90 72 q6 6 0 12" stroke={W} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </>
  );
}

function TV() {
  return (
    <>
      <Base />
      <rect x="10" y="18" width="100" height="66" rx="6" fill={S} />
      <rect x="15" y="23" width="90" height="56" rx="3" fill="var(--color-foreground)" opacity="0.85" />
      <g className="screen-on">
        <rect x="15" y="23" width="90" height="56" rx="3" fill={A} opacity="0.7" />
        <clipPath id="tvclip"><rect x="15" y="23" width="90" height="56" /></clipPath>
        <rect className="scan" clipPath="url(#tvclip)" x="15" y="23" width="90" height="56" fill={C} opacity="0.15" />
      </g>
      <rect x="54" y="84" width="12" height="12" fill={S} />
      <rect x="38" y="96" width="44" height="6" rx="3" fill={S} />
    </>
  );
}

function Valve() {
  return (
    <>
      <Base />
      <path className="flow" d="M6 70 H114" stroke={W} strokeWidth="8" fill="none" />
      <rect x="6" y="60" width="28" height="20" rx="3" fill={M} />
      <rect x="86" y="60" width="28" height="20" rx="3" fill={M} />
      <rect x="40" y="52" width="40" height="36" rx="8" fill={C} stroke={M} strokeWidth="3" />
      <rect x="56" y="34" width="8" height="18" fill={S} />
      <g className="valve-handle"><rect x="34" y="26" width="52" height="10" rx="5" fill="var(--color-destructive)" /></g>
    </>
  );
}

function Alarm() {
  return (
    <>
      <circle className="halo" cx="60" cy="54" r="40" fill="var(--color-destructive)" style={{ filter: "blur(12px)" }} />
      <Base />
      <g className="bell">
        <path d="M60 16 c-18 0 -26 14 -26 30 v20 l-8 12 h68 l-8 -12 v-20 c0 -16 -8 -30 -26 -30z" fill={C} stroke={M} strokeWidth="3" />
        <circle cx="60" cy="88" r="7" fill={S} />
      </g>
    </>
  );
}

function Rain() {
  return (
    <>
      <Base />
      <path d="M30 50 a18 18 0 0 1 20-24 a22 22 0 0 1 40 6 a14 14 0 0 1 0 28 H34 a14 14 0 0 1 -4 -10z" fill={C} stroke={M} strokeWidth="3" />
      {[38, 56, 74].map((x) => <path key={x} className="flow" d={`M${x} 68 L${x - 6} 92`} stroke={W} strokeWidth="4" strokeLinecap="round" />)}
      <path d="M14 104 Q60 70 106 104" fill="none" stroke={A} strokeWidth="5" className="halo" />
    </>
  );
}

function Custom() {
  return (
    <>
      <Base />
      <rect x="24" y="22" width="72" height="72" rx="18" fill={C} stroke={M} strokeWidth="3" />
      <circle cx="60" cy="58" r="20" fill="none" stroke={A} strokeWidth="5" strokeLinecap="round" strokeDasharray="90 40" transform="rotate(-60 60 58)" />
      <rect x="57" y="32" width="6" height="22" rx="3" fill={A} />
      <circle className="led" cx="84" cy="32" r="4" fill="var(--color-success)" />
    </>
  );
}

const MAP: Record<string, () => React.JSX.Element> = {
  fan: Fan, lamp: Lamp, light: Light, socket: Socket, pump: Pump, door: Door, curtain: Curtain,
  ac: AC, tv: TV, valve: Valve, alarm: Alarm, rain: Rain, custom: Custom,
};

export function DeviceVisual({ type, on }: P) {
  const V = MAP[type] ?? Custom;
  return (
    <svg viewBox="0 0 120 116" className="dv h-full w-full" data-on={on ? "true" : "false"} aria-hidden>
      <V />
    </svg>
  );
}

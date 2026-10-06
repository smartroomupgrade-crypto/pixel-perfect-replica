import { useEffect, useRef } from "react";

/** Realistic 80mm cooling fan. Blades spin up/slow down smoothly with inertia. */
export function FanVisual({ on }: { on: boolean }) {
  const rotor = useRef<SVGGElement>(null);
  const target = useRef(on ? 1 : 0);
  target.current = on ? 1 : 0;

  useEffect(() => {
    let speed = 0;
    let angle = 0;
    let last = performance.now();
    let raf = 0;
    const MAX = 1080; // deg per second at full speed
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const k = target.current > speed ? 1.6 : 0.9; // spin-up faster than coast-down
      speed += (target.current - speed) * (1 - Math.exp(-k * dt));
      if (speed < 0.002 && target.current === 0) speed = 0;
      angle = (angle + speed * MAX * dt) % 360;
      if (rotor.current) {
        rotor.current.setAttribute("transform", `rotate(${angle} 100 100)`);
        rotor.current.style.filter = speed > 0.6 ? `blur(${(speed - 0.6) * 1.6}px)` : "none";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const blades = Array.from({ length: 7 }, (_, i) => i * (360 / 7));
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl" aria-hidden>
      <defs>
        <linearGradient id="fan-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3d42" />
          <stop offset="0.5" stopColor="#1d1f22" />
          <stop offset="1" stopColor="#0d0e10" />
        </linearGradient>
        <radialGradient id="fan-well" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#0a0b0c" />
          <stop offset="1" stopColor="#202226" />
        </radialGradient>
        <linearGradient id="fan-blade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4e55" />
          <stop offset="1" stopColor="#16181b" />
        </linearGradient>
        <radialGradient id="fan-hub" cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#4b4f56" />
          <stop offset="1" stopColor="#141518" />
        </radialGradient>
      </defs>
      {/* depth slab */}
      <rect x="20" y="22" width="166" height="166" rx="16" fill="#08090a" />
      {/* frame */}
      <rect x="14" y="14" width="166" height="166" rx="16" fill="url(#fan-frame)" />
      <rect x="15" y="15" width="164" height="164" rx="15" fill="none" stroke="#5a5e66" strokeOpacity="0.5" />
      {[[30, 30], [164, 30], [30, 164], [164, 164]].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r="7" fill="#0b0c0d" />
          <circle cx={x} cy={y} r="4.2" fill="#f4f5f7" opacity="0.9" />
        </g>
      ))}
      {/* cable */}
      <path d="M150 18 C 120 4, 70 6, 40 16" stroke="#c62828" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M150 21 C 120 9, 70 10, 40 20" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* well */}
      <circle cx="97" cy="97" r="76" fill="url(#fan-well)" />
      <circle cx="97" cy="97" r="76" fill="none" stroke="#000" strokeWidth="2" />
      <g transform="translate(-3 -3)">
        <g ref={rotor}>
          {blades.map((a) => (
            <path
              key={a}
              transform={`rotate(${a} 100 100)`}
              d="M100 100 C 108 70, 128 46, 152 40 C 160 56, 156 74, 140 88 C 128 98, 114 102, 100 100 Z"
              fill="url(#fan-blade)"
              stroke="#000"
              strokeOpacity="0.5"
            />
          ))}
        </g>
        <circle cx="100" cy="100" r="25" fill="url(#fan-hub)" stroke="#000" strokeOpacity="0.6" />
        <circle cx="100" cy="100" r="25" fill="none" stroke="#6b7078" strokeOpacity="0.35" strokeDasharray="40 120" />
        <circle cx="100" cy="93" r="1.6" fill="#888" />
      </g>
    </svg>
  );
}

/** Modern bulb on a matte base with soft halo glow. */
export function LampVisual({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <radialGradient id="lamp-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#ffc24d" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ffb020" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lamp-glass-off" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#e6e9ee" />
          <stop offset="1" stopColor="#c7ccd4" />
        </radialGradient>
        <radialGradient id="lamp-glass-on" cx="0.45" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#fffdf2" />
          <stop offset="0.5" stopColor="#ffe8a3" />
          <stop offset="1" stopColor="#ffc34a" />
        </radialGradient>
        <linearGradient id="lamp-cap" x1="0" x2="1">
          <stop offset="0" stopColor="#6b7078" />
          <stop offset="0.45" stopColor="#d7dbe0" />
          <stop offset="1" stopColor="#5a5f66" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="80" r="95" fill="url(#lamp-halo)"
        style={{ opacity: on ? 1 : 0, transition: "opacity 700ms ease", transformOrigin: "100px 80px" }}
        className={on ? "animate-[pulse_4s_ease-in-out_infinite]" : ""} />
      {/* floor shadow */}
      <ellipse cx="100" cy="186" rx="44" ry="6" fill="#000" opacity="0.12" />
      {/* glass */}
      <g>
        <path d="M100 22 C 136 22, 150 52, 150 74 C 150 98, 128 110, 124 132 L 76 132 C 72 110, 50 98, 50 74 C 50 52, 64 22, 100 22 Z"
          fill="url(#lamp-glass-off)" stroke="#b9bfc8" strokeWidth="1" />
        <path d="M100 22 C 136 22, 150 52, 150 74 C 150 98, 128 110, 124 132 L 76 132 C 72 110, 50 98, 50 74 C 50 52, 64 22, 100 22 Z"
          fill="url(#lamp-glass-on)" style={{ opacity: on ? 1 : 0, transition: "opacity 600ms ease" }} />
        {/* filament */}
        <path d="M86 128 L 88 92 Q 94 80 100 92 Q 106 80 112 92 L 114 128" fill="none"
          stroke={on ? "#ff9d00" : "#8d939c"} strokeWidth="1.6" style={{ transition: "stroke 500ms" }} />
        <ellipse cx="80" cy="54" rx="10" ry="18" fill="#fff" opacity="0.7" transform="rotate(25 80 54)" />
      </g>
      {/* cap */}
      <rect x="76" y="132" width="48" height="26" rx="4" fill="url(#lamp-cap)" />
      {[138, 145, 152].map((y) => <rect key={y} x="76" y={y} width="48" height="2" fill="#4a4e55" opacity="0.5" />)}
      <path d="M84 158 L 116 158 L 108 170 L 92 170 Z" fill="#3a3d42" />
      <rect x="62" y="170" width="76" height="12" rx="6" fill="#2a2d31" />
    </svg>
  );
}

/** Piezo buzzer (for future alarm devices). */
export function BuzzerVisual({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      {on && [0, 1, 2].map((i) => (
        <circle key={i} cx="100" cy="100" r="60" fill="none" stroke="#3b82f6" strokeWidth="2"
          style={{ animation: `ping 1.5s ${i * 0.5}s cubic-bezier(0,0,0.2,1) infinite`, transformOrigin: "100px 100px" }} />
      ))}
      <rect x="96" y="150" width="4" height="36" fill="#a0a4ab" />
      <rect x="40" y="70" width="120" height="80" rx="10" fill="#151618" />
      <ellipse cx="100" cy="150" rx="60" ry="22" fill="#0d0e10" />
      <ellipse cx="100" cy="70" rx="60" ry="22" fill="#f1f2f4" stroke="#ccc" />
      <circle cx="100" cy="70" r="5" fill="#111" />
    </svg>
  );
}

export function PremiumVisual({ type, on }: { type: string; on: boolean }) {
  if (type === "fan") return <FanVisual on={on} />;
  if (type === "alarm" || type === "buzzer") return <BuzzerVisual on={on} />;
  if (type === "lamp" || type === "light") return <LampVisual on={on} />;
  return <DeviceVisual type={type} on={on} />;
}

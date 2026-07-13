import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./theme";
import { grotesk, plex } from "./fonts";

/** A spring entrance value 0→1, delayed by `delay` frames. */
export function useEnter(delay = 0, config: Parameters<typeof spring>[0]["config"] = { damping: 200 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

/** The dark stage backdrop with a soft gel glow that breathes. */
export const Backdrop: React.FC<{ children?: React.ReactNode; glow?: string }> = ({ children, glow = C.gel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drift = Math.sin((frame / fps) * 0.6) * 40;
  return (
    <AbsoluteFill style={{ backgroundColor: C.desk, fontFamily: plex, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1100px 700px at ${50 + drift / 20}% 32%, ${glow}22, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 600px at 80% 90%, ${C.cyan}14, transparent 55%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** A lifted white "script page" panel. */
export const Panel: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  enterDelay?: number;
}> = ({ children, style, enterDelay = 0 }) => {
  const e = useEnter(enterDelay);
  const y = interpolate(e, [0, 1], [40, 0]);
  return (
    <div
      style={{
        background: C.paper,
        borderRadius: 28,
        boxShadow: `0 40px 120px -30px rgba(0,0,0,0.6)`,
        transform: `translateY(${y}px)`,
        opacity: e,
        color: C.ink,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A script cue: NAME + line, colour-coded to the speaker. */
export const CueLine: React.FC<{
  name: string;
  color: string;
  line: string;
  paren?: string;
  delay: number;
  onDark?: boolean;
}> = ({ name, color, line, paren, delay, onDark }) => {
  const e = useEnter(delay, { damping: 200 });
  const x = interpolate(e, [0, 1], [-18, 0]);
  return (
    <div style={{ opacity: e, transform: `translateX(${x}px)`, marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          style={{
            fontFamily: grotesk,
            fontWeight: 700,
            letterSpacing: 4,
            fontSize: 24,
            textTransform: "uppercase",
            color,
          }}
        >
          {name}
        </span>
        {paren ? (
          <span style={{ fontSize: 20, color: onDark ? C.inkFaint : C.inkFaint }}>{paren}</span>
        ) : null}
      </div>
      <div style={{ fontSize: 34, lineHeight: 1.35, color: onDark ? C.white : C.ink, marginTop: 4 }}>{line}</div>
    </div>
  );
};

/** A pill / chip. */
export const Pill: React.FC<{
  children: React.ReactNode;
  color?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}> = ({ children, color = C.gel, filled, style }) => (
  <span
    style={{
      fontFamily: grotesk,
      fontWeight: 600,
      fontSize: 22,
      padding: "10px 20px",
      borderRadius: 999,
      color: filled ? "#fff" : color,
      background: filled ? color : `${color}22`,
      border: `1px solid ${color}55`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

/** A keyboard key cap. */
export const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      fontFamily: grotesk,
      fontWeight: 600,
      fontSize: 22,
      color: C.white,
      padding: "8px 16px",
      borderRadius: 10,
      background: C.deskLight,
      border: `1px solid ${C.rule}`,
      boxShadow: "0 3px 0 0 rgba(0,0,0,0.4)",
    }}
  >
    {children}
  </span>
);

const Q1 =
  "M11 9.5c-2.4 0-4.3 1.9-4.3 4.3 0 2.3 1.7 4.1 3.9 4.3-.2 1.6-1 2.7-2.4 3.4-.5.2-.6.9-.2 1.2.2.2.5.2.7.1 2.9-1.2 4.6-3.6 4.6-7V13.8c0-2.4-1.9-4.3-4.3-4.3z";
const Q2 =
  "M22.5 9.5c-2.4 0-4.3 1.9-4.3 4.3 0 2.3 1.7 4.1 3.9 4.3-.2 1.6-1 2.7-2.4 3.4-.5.2-.6.9-.2 1.2.2.2.5.2.7.1 2.9-1.2 4.6-3.6 4.6-7V13.8c0-2.4-1.9-4.3-4.3-4.3z";

/** The La Réplique quotation mark, with an optional staggered reveal. */
export const Mark: React.FC<{ size?: number; reveal?: boolean; delay?: number; c1?: string; c2?: string }> = ({
  size = 200,
  reveal,
  delay = 0,
  c1 = C.gel,
  c2 = C.cyan,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = reveal ? spring({ frame: frame - delay, fps, config: { damping: 11 } }) : 1;
  const s2 = reveal ? spring({ frame: frame - delay - 7, fps, config: { damping: 11 } }) : 1;
  const stroke = (s: number): React.CSSProperties => ({
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: `scale(${s})`,
    opacity: Math.min(1, s * 1.4),
  });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ filter: `drop-shadow(0 12px 30px ${c1}44)` }}>
      <rect width="32" height="32" rx="7" fill={C.deskLight} stroke={C.rule} strokeWidth="0.5" />
      <path d={Q1} fill={c1} style={stroke(s1)} />
      <path d={Q2} fill={c2} style={stroke(s2)} />
    </svg>
  );
};

export const H1: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontFamily: grotesk,
      fontWeight: 700,
      color: C.white,
      fontSize: 96,
      letterSpacing: -1,
      lineHeight: 1.02,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.gelBright }) => (
  <div
    style={{
      fontFamily: grotesk,
      fontWeight: 600,
      fontSize: 26,
      letterSpacing: 8,
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);

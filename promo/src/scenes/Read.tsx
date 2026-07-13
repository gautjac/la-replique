import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Kicker, Panel, useEnter } from "../ui";
import { grotesk } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

const Waveform: React.FC<{ color: string; active: boolean; seed: number }> = ({ color, active, seed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bars = 22;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, height: 46 }}>
      {new Array(bars).fill(0).map((_, i) => {
        const wobble = Math.sin(t * 9 + i * 0.7 + seed) * 0.5 + 0.5;
        const h = active ? 8 + wobble * 38 : 6 + Math.sin(i * 0.7 + seed) * 3 + 4;
        return (
          <div
            key={i}
            style={{
              width: 5,
              height: h,
              borderRadius: 3,
              background: color,
              opacity: active ? 0.55 + wobble * 0.45 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
};

const Row: React.FC<{ name: string; color: string; voice: string; active: boolean; delay: number; seed: number }> = ({
  name,
  color,
  voice,
  active,
  delay,
  seed,
}) => {
  const e = useEnter(delay);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "18px 24px",
        borderRadius: 16,
        background: active ? C.deskLight : "transparent",
        border: `1px solid ${active ? C.rule : "transparent"}`,
        opacity: e,
        transform: `translateX(${(1 - e) * 20}px)`,
      }}
    >
      <span style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 24, letterSpacing: 3, color, width: 140 }}>{name}</span>
      <Waveform color={color} active={active} seed={seed} />
      <span style={{ marginLeft: "auto", fontSize: 22, color: C.inkFaint }}>{voice}</span>
    </div>
  );
};

export const Read: React.FC<{ c: Copy["read"]; accent: string }> = ({ c, accent }) => {
  const frame = useCurrentFrame();
  const title = useEnter(4);
  const badge = useEnter(40);
  const active = c.rows.length ? Math.floor(frame / 34) % c.rows.length : 0;

  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ padding: "84px 120px", flexDirection: "row", gap: 80, alignItems: "center" }}>
        <div style={{ flex: 0.9, opacity: title }}>
          <Kicker color={accent}>{c.kicker}</Kicker>
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: 62,
              lineHeight: 1.05,
              color: C.white,
              marginTop: 16,
              whiteSpace: "pre-line",
            }}
          >
            {c.title}
          </div>
          <div style={{ fontSize: 30, color: C.inkFaint, marginTop: 22, lineHeight: 1.45 }}>{c.body}</div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginTop: 30,
              padding: "12px 22px",
              borderRadius: 999,
              background: `${accent}1c`,
              border: `1px solid ${accent}55`,
              fontFamily: grotesk,
              fontWeight: 600,
              fontSize: 23,
              color: accent,
              opacity: badge,
            }}
          >
            {c.badge}
          </div>
        </div>

        <Panel enterDelay={16} style={{ flex: 1.1, padding: "34px 30px", background: "#12151d", color: C.white }}>
          {c.rows.map((r, i) => (
            <Row key={r.name} name={r.name} color={r.color} voice={r.voice} active={active === i} delay={26 + i * 10} seed={i * 2} />
          ))}
        </Panel>
      </AbsoluteFill>
    </Backdrop>
  );
};

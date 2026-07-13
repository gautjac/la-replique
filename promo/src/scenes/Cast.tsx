import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Kicker, Panel, useEnter } from "../ui";
import { grotesk } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

const Dot: React.FC<{ on: boolean; color: string; delay: number }> = ({ on, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        background: on ? color : C.rule,
        transform: `scale(${on ? s : 1})`,
        opacity: on ? 1 : 0.5,
        margin: "0 auto",
      }}
    />
  );
};

const RoleChip: React.FC<{ name: string; color: string; delay: number }> = ({ name, color, delay }) => {
  const e = useEnter(delay);
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 22px",
        borderRadius: 999,
        background: C.deskLight,
        border: `1px solid ${C.rule}`,
        opacity: e,
        transform: `translateY(${(1 - e) * 14}px)`,
      }}
    >
      <span style={{ width: 16, height: 16, borderRadius: 999, background: color }} />
      <span style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 24, color: C.white, letterSpacing: 2 }}>{name}</span>
    </span>
  );
};

export const Cast: React.FC<{ c: Copy["cast"]; accent: string }> = ({ c, accent }) => {
  const title = useEnter(4);
  const cols = c.roles[0]?.present.length ?? 4;
  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ padding: "90px 120px", flexDirection: "row", gap: 80, alignItems: "center" }}>
        <div style={{ flex: 1, opacity: title }}>
          <Kicker color={accent}>{c.kicker}</Kicker>
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: 66,
              lineHeight: 1.05,
              color: C.white,
              marginTop: 16,
              whiteSpace: "pre-line",
            }}
          >
            {c.title}
          </div>
          <div style={{ fontSize: 30, color: C.inkFaint, marginTop: 22, lineHeight: 1.45 }}>{c.body}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 34, flexWrap: "wrap" }}>
            {c.roles.map((r, i) => (
              <RoleChip key={r.name} name={r.name} color={r.color} delay={24 + i * 8} />
            ))}
          </div>
        </div>

        {/* Presence grid */}
        <Panel enterDelay={14} style={{ flex: 0.9, padding: "44px 48px", background: C.deskLight, color: C.white }}>
          <div style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 24, color: C.inkFaint, marginBottom: 26, letterSpacing: 1 }}>
            {c.gridTitle}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `150px repeat(${cols}, 1fr)`, alignItems: "center", rowGap: 22 }}>
            <div />
            {Array.from({ length: cols }, (_, i) => (
              <div key={i} style={{ textAlign: "center", color: C.inkFaint, fontSize: 22, fontFamily: grotesk }}>
                {i + 1}
              </div>
            ))}
            {c.roles.map((r, ri) => (
              <React.Fragment key={r.name}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: r.color }} />
                  <span style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 22, color: C.white, letterSpacing: 1 }}>
                    {r.name}
                  </span>
                </div>
                {r.present.map((p, ci) => (
                  <Dot key={ci} on={p === 1} color={r.color} delay={30 + ri * 6 + ci * 5} />
                ))}
              </React.Fragment>
            ))}
          </div>
        </Panel>
      </AbsoluteFill>
    </Backdrop>
  );
};

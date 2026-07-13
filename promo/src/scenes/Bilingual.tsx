import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Backdrop, Kicker, Panel, useEnter } from "../ui";
import { grotesk } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

export const Bilingual: React.FC<{ c: Copy["bilingual"]; accent: string }> = ({ c, accent }) => {
  const title = useEnter(4);
  const arrow = useEnter(20);
  const surtitle = useEnter(64);

  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 110 }}>
        <div style={{ opacity: title, textAlign: "center", marginBottom: 46 }}>
          <Kicker color={accent}>{c.kicker}</Kicker>
          <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 70, color: C.white, marginTop: 14 }}>{c.title}</div>
        </div>

        {/* FR ⇄ EN badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 44, opacity: arrow }}>
          <span style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 40, color: C.white }}>{c.from}</span>
          <svg width="70" height="34" viewBox="0 0 70 34" fill="none" stroke={accent} strokeWidth="3">
            <path d="M6 12h55M55 4l12 8-12 8M64 22H9M15 30l-12-8 12-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 40, color: accent }}>{c.to}</span>
        </div>

        {/* Bilingual cue */}
        <Panel enterDelay={30} style={{ width: 1180, padding: "44px 56px" }}>
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: c.color,
            }}
          >
            {c.name}
          </div>
          <div style={{ fontSize: 38, lineHeight: 1.35, color: C.ink, marginTop: 8 }}>{c.line}</div>
          <div
            style={{
              marginTop: 18,
              paddingLeft: 20,
              borderLeft: `3px solid ${accent}`,
              fontSize: 30,
              color: C.inkSoft,
              opacity: surtitle,
              transform: `translateY(${interpolate(surtitle, [0, 1], [10, 0])}px)`,
            }}
          >
            {c.surtitle}
          </div>
        </Panel>

        <div style={{ marginTop: 34, fontSize: 28, color: C.inkFaint, opacity: surtitle }}>{c.footer}</div>
      </AbsoluteFill>
    </Backdrop>
  );
};

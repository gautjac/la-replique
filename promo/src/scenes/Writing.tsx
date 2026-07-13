import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop, CueLine, Kbd, Kicker, Panel, useEnter } from "../ui";
import { grotesk } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

const KbdRow: React.FC<{ keys: string[]; label: string; delay: number }> = ({ keys, label, delay }) => {
  const e = useEnter(delay);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: e, transform: `translateX(${(1 - e) * 20}px)` }}>
      <div style={{ display: "flex", gap: 8 }}>
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </div>
      <div style={{ fontSize: 26, color: C.inkFaint }}>{label}</div>
    </div>
  );
};

export const Writing: React.FC<{ c: Copy["writing"]; accent: string }> = ({ c, accent }) => {
  const title = useEnter(4);
  const dida = useEnter(20);
  const subtitle = useEnter(16);
  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ padding: "90px 110px", flexDirection: "row", gap: 70, alignItems: "center" }}>
        {/* Left — the script page */}
        <Panel enterDelay={8} style={{ flex: 1.35, padding: "56px 64px", alignSelf: "stretch" }}>
          <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 26, letterSpacing: 6, color: C.ink, marginBottom: 6 }}>
            {c.sceneLabel}
          </div>
          <div style={{ fontSize: 24, color: C.inkFaint, marginBottom: 34 }}>{c.setting}</div>

          <div style={{ borderLeft: `3px solid ${accent}88`, paddingLeft: 20, marginBottom: 26, opacity: dida }}>
            <div style={{ fontSize: 26, color: C.inkSoft }}>{c.didascalie}</div>
          </div>

          {c.cues.map((cue, i) => (
            <CueLine key={i} name={cue.name} color={cue.color} paren={cue.paren} line={cue.line} delay={34 + i * 22} />
          ))}
        </Panel>

        {/* Right — the flow */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ opacity: title }}>
            <Kicker color={accent}>{c.kicker}</Kicker>
            <div
              style={{
                fontFamily: grotesk,
                fontWeight: 700,
                fontSize: 60,
                lineHeight: 1.05,
                color: C.white,
                marginTop: 14,
                whiteSpace: "pre-line",
              }}
            >
              {c.title}
            </div>
          </div>
          <div style={{ fontSize: 28, color: C.inkFaint, lineHeight: 1.4, opacity: subtitle }}>{c.subtitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
            {c.keys.map((k, i) => (
              <KbdRow key={i} keys={k.keys} label={k.label} delay={44 + i * 20} />
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

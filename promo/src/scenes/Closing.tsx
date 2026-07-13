import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Backdrop, Mark, useEnter } from "../ui";
import { grotesk, plex } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

const Word: React.FC<{ children: React.ReactNode; delay: number; color: string }> = ({ children, delay, color }) => {
  const e = useEnter(delay);
  return (
    <span
      style={{
        fontFamily: grotesk,
        fontWeight: 700,
        fontSize: 58,
        color,
        opacity: e,
        transform: `translateY(${(1 - e) * 18}px)`,
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
};

export const Closing: React.FC<{ c: Copy["closing"]; accent: string; accent2: string }> = ({ c, accent, accent2 }) => {
  const logo = useEnter(2);
  const name = useEnter(14);
  const url = useEnter(70);
  const foot = useEnter(84);

  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{ opacity: logo, transform: `scale(${interpolate(logo, [0, 1], [0.85, 1])})` }}>
            <Mark size={130} c1={accent} c2={accent2} />
          </div>
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: 84,
              letterSpacing: -1.5,
              color: C.white,
              opacity: name,
            }}
          >
            {c.name}
          </div>

          <div style={{ display: "flex", gap: 22, alignItems: "center", marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {c.words.map((w, i) => (
              <Word key={i} delay={30 + i * 12} color={w.color}>
                {w.text}
              </Word>
            ))}
          </div>

          <div
            style={{
              marginTop: 30,
              padding: "16px 34px",
              borderRadius: 999,
              background: accent,
              boxShadow: `0 16px 44px -12px ${accent}`,
              fontFamily: grotesk,
              fontWeight: 600,
              fontSize: 34,
              color: "#fff",
              opacity: url,
              transform: `translateY(${(1 - url) * 14}px)`,
            }}
          >
            {c.url}
          </div>

          <div style={{ fontFamily: plex, fontSize: 24, color: C.inkFaint, opacity: foot, marginTop: 10 }}>{c.footer}</div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

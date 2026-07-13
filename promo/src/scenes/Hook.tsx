import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Kicker, useEnter } from "../ui";
import { grotesk } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

export const Hook: React.FC<{ c: Copy["hook"]; accent: string }> = ({ c, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kicker = useEnter(6);

  // typewriter
  const start = 18;
  const cps = 26; // chars per second
  const shown = Math.max(0, Math.floor(((frame - start) / fps) * cps));
  const text = c.line.slice(0, shown);
  const caretOn = Math.floor((frame / fps) * 2) % 2 === 0;
  const done = shown >= c.line.length;

  const subtitle = useEnter(90);
  const subY = interpolate(subtitle, [0, 1], [16, 0]);

  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>
        <div style={{ maxWidth: 1300, textAlign: "center" }}>
          <div style={{ opacity: kicker, marginBottom: 34 }}>
            <Kicker color={accent}>{c.kicker}</Kicker>
          </div>
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: 82,
              lineHeight: 1.1,
              letterSpacing: -1,
              color: C.white,
            }}
          >
            {text}
            <span style={{ opacity: !done && caretOn ? 1 : 0, color: accent }}>▍</span>
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 34,
              color: C.inkFaint,
              opacity: subtitle,
              transform: `translateY(${subY}px)`,
            }}
          >
            {c.subtitle}
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

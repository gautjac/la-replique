import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Backdrop, Mark, useEnter } from "../ui";
import { grotesk } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

export const Logo: React.FC<{ c: Copy["logo"]; accent: string; accent2: string }> = ({ c, accent, accent2 }) => {
  const title = useEnter(20);
  const sub = useEnter(34);
  const titleY = interpolate(title, [0, 1], [24, 0]);

  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          <Mark size={190} reveal delay={2} c1={accent} c2={accent2} />
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: 116,
              letterSpacing: -2,
              color: C.white,
              opacity: title,
              transform: `translateY(${titleY}px)`,
            }}
          >
            {c.title}
          </div>
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 500,
              fontSize: 30,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: C.gelBright,
              opacity: sub,
            }}
          >
            {c.tagline}
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Kicker, Panel, Pill, useEnter } from "../ui";
import { grotesk } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

const ToolChip: React.FC<{ label: string; delay: number; active?: boolean; accent: string }> = ({ label, delay, active, accent }) => {
  const e = useEnter(delay);
  return (
    <span
      style={{
        fontFamily: grotesk,
        fontWeight: 600,
        fontSize: 24,
        padding: "12px 24px",
        borderRadius: 999,
        color: active ? "#fff" : accent,
        background: active ? accent : `${accent}1c`,
        border: `1px solid ${accent}44`,
        boxShadow: active ? `0 10px 30px -8px ${accent}` : "none",
        opacity: e,
        transform: `translateY(${(1 - e) * 14}px)`,
      }}
    >
      {label}
    </span>
  );
};

export const Atelier: React.FC<{ c: Copy["atelier"]; accent: string }> = ({ c, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = useEnter(4);

  const start = 74;
  const shown = Math.max(0, Math.floor(((frame - start) / fps) * 24));
  const text = c.proposalLine.slice(0, shown);

  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ padding: "84px 120px", flexDirection: "row", gap: 80, alignItems: "center" }}>
        <div style={{ flex: 1, opacity: title }}>
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
          <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
            {c.tools.map((t, i) => (
              <ToolChip key={t} label={t} delay={26 + i * 7} active={i === 0} accent={accent} />
            ))}
          </div>
        </div>

        {/* Proposal card */}
        <Panel enterDelay={44} style={{ flex: 0.95, padding: "38px 42px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <span style={{ width: 12, height: 12, borderRadius: 999, background: accent }} />
            <span
              style={{
                fontFamily: grotesk,
                fontWeight: 600,
                fontSize: 20,
                color: accent,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {c.badge}
            </span>
          </div>
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: c.proposalColor,
            }}
          >
            {c.proposalName}
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.4, color: C.ink, marginTop: 8, minHeight: 96 }}>
            {text}
            <span style={{ color: accent }}>{shown < c.proposalLine.length ? "▍" : ""}</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <Pill filled color={accent} style={{ fontSize: 20, padding: "10px 20px" }}>
              {c.insert}
            </Pill>
            <Pill color={C.inkFaint} style={{ fontSize: 20, padding: "10px 20px", background: C.paperShade, border: "none" }}>
              {c.another}
            </Pill>
          </div>
        </Panel>
      </AbsoluteFill>
    </Backdrop>
  );
};

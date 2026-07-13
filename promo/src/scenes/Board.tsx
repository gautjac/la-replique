import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Kicker, useEnter } from "../ui";
import { grotesk } from "../fonts";
import { C } from "../theme";
import type { Copy } from "../copy";

type CardT = Copy["board"]["cards"][number];

const BeatCard: React.FC<{ card: CardT; delay: number; lift: number }> = ({ card, delay, lift }) => {
  const e = useEnter(delay);
  return (
    <div
      style={{
        background: C.deskLight,
        borderRadius: 20,
        padding: "26px 30px",
        boxShadow: `inset 4px 0 0 0 ${card.beatColor}`,
        border: `1px solid ${C.rule}`,
        opacity: e,
        transform: `translateY(${(1 - e) * 26 + lift}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 26, color: C.white, letterSpacing: 2 }}>
          {card.scene}
        </span>
        <span style={{ fontSize: 22, color: C.inkFaint }}>{card.setting}</span>
      </div>
      <div style={{ fontSize: 26, color: C.white, marginTop: 12, opacity: 0.92 }}>{card.synopsis}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
        <span
          style={{
            fontFamily: grotesk,
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: card.beatColor,
            background: `${card.beatColor}22`,
            padding: "6px 14px",
            borderRadius: 999,
          }}
        >
          {card.beat}
        </span>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {card.dots.map((d, i) => (
            <span key={i} style={{ width: 14, height: 14, borderRadius: 999, background: d }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const Board: React.FC<{ c: Copy["board"]; accent: string }> = ({ c, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = useEnter(4);

  const dragT = spring({ frame: frame - 100, fps, config: { damping: 14 } });
  const lift = interpolate(dragT, [0, 0.5, 1], [0, -18, 0]);

  return (
    <Backdrop glow={accent}>
      <AbsoluteFill style={{ padding: "84px 120px", flexDirection: "row", gap: 80, alignItems: "center" }}>
        <div style={{ flex: 0.85, opacity: title }}>
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
        </div>
        <div style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: 20 }}>
          {c.cards.map((card, i) => (
            <BeatCard key={i} card={card} delay={16 + i * 18} lift={i === c.cards.length - 1 ? lift : 0} />
          ))}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

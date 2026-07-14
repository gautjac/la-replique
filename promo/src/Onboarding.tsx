import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { C } from "./theme";
import { grotesk, plex } from "./fonts";
import { Backdrop, Kbd, Mark, useEnter } from "./ui";

// ---------------------------------------------------------------------------
// Editable copy — tweak captions here (kept inline so it's easy to find).
// ---------------------------------------------------------------------------
const COPY = {
  intro: { mark: "La Réplique", tagline: "Écrire pour la scène — le clavier fait tout." },
  ret: { title: "Entrée démarre la réplique suivante", note: "Dans un duo, l'autre personnage prend la parole." },
  auto: { title: "Quelques lettres, puis Entrée", note: "La distribution se complète toute seule — choisis qui parle." },
  tab: { title: "Tab change le type de bloc", note: "Réplique · didascalie · scène — sans lever les mains." },
  atelier: { title: "L'Atelier, quand tu veux", note: "Une relance, une lecture dramaturgique, une traduction. Ta clé, ton texte." },
  read: { title: "Écoute la pièce", note: "Lecture à voix — chaque personnage, une voix distincte." },
  outro: { title: "Prêt·e à écrire.", platforms: "iPhone · iPad · Mac", url: "la-replique.netlify.app" },
};

const CAST = { alice: C.gel, bruno: C.plum, carol: C.jade };
const FPS_LOCAL = 30;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
/** Characters revealed of `text` by local `frame`, starting at `start` (cps chars/sec). */
function typed(text: string, frame: number, start: number, cps = 26): string {
  const n = Math.floor(((frame - start) * cps) / FPS_LOCAL);
  return text.slice(0, Math.max(0, Math.min(text.length, n)));
}
function doneTyping(text: string, frame: number, start: number, cps = 26): boolean {
  return frame - start >= (text.length / cps) * FPS_LOCAL;
}
/** A 0→1→0 pulse over ~18 frames starting at `at`. */
function pulse(frame: number, at: number, len = 18): number {
  const t = frame - at;
  if (t < 0 || t > len) return 0;
  return Math.sin((t / len) * Math.PI);
}

const Caret: React.FC<{ color?: string; on?: boolean }> = ({ color = C.ink, on = true }) => {
  const frame = useCurrentFrame();
  const blink = frame % 26 < 14 ? 1 : 0.15;
  return (
    <span
      style={{
        display: "inline-block",
        width: 3,
        height: "1.05em",
        marginLeft: 2,
        transform: "translateY(3px)",
        background: color,
        opacity: on ? blink : 0,
        borderRadius: 2,
      }}
    />
  );
};

/** A pressed key-cap that flashes at a moment. */
const KeyFlash: React.FC<{ label: string; frame: number; at: number }> = ({ label, frame, at }) => {
  const p = pulse(frame, at, 20);
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 56,
        bottom: 56,
        transform: `scale(${0.9 + p * 0.25})`,
        opacity: p,
      }}
    >
      <div style={{ transform: `translateY(${(1 - p) * 10}px)` }}>
        <Kbd>{label}</Kbd>
      </div>
    </div>
  );
};

// The speaker chip: "↵ NAME"
const Chip: React.FC<{ name: string; opacity: number }> = ({ name, opacity }) => (
  <span
    style={{
      fontFamily: grotesk,
      fontWeight: 600,
      fontSize: 22,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 12px",
      borderRadius: 999,
      color: C.gelBright,
      background: `${C.gel}28`,
      opacity,
      transform: `translateY(${(1 - opacity) * 4}px)`,
    }}
  >
    <span style={{ fontSize: 18 }}>↵</span>
    {name.toUpperCase()}
  </span>
);

// ---------------------------------------------------------------------------
// Editor blocks
// ---------------------------------------------------------------------------
type Block =
  | { kind: "scene"; label: string; setting?: string }
  | { kind: "stage"; text: string; enter?: number }
  | { kind: "cue"; name: string; color: string; paren?: string; text: string; caret?: boolean; chip?: { name: string; opacity: number } };

const CueBlock: React.FC<{ b: Extract<Block, { kind: "cue" }> }> = ({ b }) => (
  <div style={{ marginBottom: 26 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{ fontFamily: grotesk, fontWeight: 700, letterSpacing: 3, fontSize: 26, textTransform: "uppercase", color: b.color }}>
        {b.name}
      </span>
      {b.paren ? <span style={{ fontSize: 22, color: C.inkFaint }}>{b.paren}</span> : null}
      {b.chip ? <Chip name={b.chip.name} opacity={b.chip.opacity} /> : null}
    </div>
    <div style={{ fontSize: 36, lineHeight: 1.34, color: C.ink, marginTop: 4 }}>
      {b.text}
      {b.caret ? <Caret /> : null}
    </div>
  </div>
);

const Blocks: React.FC<{ blocks: Block[] }> = ({ blocks }) => (
  <>
    {blocks.map((b, i) => {
      if (b.kind === "scene")
        return (
          <div key={i} style={{ marginBottom: 26 }}>
            <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 26, letterSpacing: 5, color: C.ink }}>{b.label}</div>
            {b.setting ? <div style={{ fontSize: 24, color: C.inkFaint, marginTop: 4 }}>{b.setting}</div> : null}
          </div>
        );
      if (b.kind === "stage")
        return (
          <div
            key={i}
            style={{
              borderLeft: `2px solid ${C.gel}8c`, // matches the app's didascalie rule
              paddingLeft: 20,
              marginBottom: 26,
              fontSize: 30,
              color: C.inkSoft,
              opacity: b.enter ?? 1,
            }}
          >
            {b.text}
          </div>
        );
      return <CueBlock key={i} b={b} />;
    })}
  </>
);

/** The lifted white script page. */
const Page: React.FC<{ children: React.ReactNode; enterDelay?: number }> = ({ children, enterDelay = 6 }) => {
  const e = useEnter(enterDelay);
  return (
    <div
      style={{
        width: 1180,
        minHeight: 560,
        background: C.paper,
        borderRadius: 26,
        boxShadow: "0 44px 130px -34px rgba(0,0,0,0.62)",
        padding: "58px 70px",
        transform: `translateY(${(1 - e) * 34}px)`,
        opacity: e,
      }}
    >
      {children}
    </div>
  );
};

/** Bottom caption band — title + note. */
const Caption: React.FC<{ title: string; note: string; delay?: number }> = ({ title, note, delay = 4 }) => {
  const e = useEnter(delay);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 72, textAlign: "center", opacity: e, transform: `translateY(${(1 - e) * 12}px)` }}>
      <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 48, color: C.white, letterSpacing: -0.5 }}>{title}</div>
      <div style={{ fontFamily: plex, fontSize: 27, color: C.inkFaint, marginTop: 10 }}>{note}</div>
    </div>
  );
};

const Stage: React.FC<{ children: React.ReactNode; glow?: string }> = ({ children, glow }) => (
  <Backdrop glow={glow}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 96 }}>{children}</AbsoluteFill>
  </Backdrop>
);

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useEnter(20);
  const wordmark = useEnter(26);
  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
        <Mark size={168} reveal delay={4} />
        <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 88, color: C.white, opacity: wordmark, letterSpacing: -1 }}>
          {COPY.intro.mark}
        </div>
        <div
          style={{
            fontFamily: plex,
            fontSize: 32,
            color: C.inkFaint,
            opacity: t,
            transform: `translateY(${(1 - t) * 10}px)`,
          }}
        >
          {typed(COPY.intro.tagline, frame, 30, 30)}
          <Caret color={C.gelBright} on={!doneTyping(COPY.intro.tagline, frame, 30, 30)} />
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

// Return → next réplique
const ReturnBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const aliceLine = "La lumière est toujours allumée.";
  const showAlice = frame >= 34;
  const blocks: Block[] = [
    { kind: "scene", label: "SCÈNE 1", setting: "Une cuisine. Fin de soirée." },
    { kind: "cue", name: "Bruno", color: CAST.bruno, paren: "derrière la porte", text: "Je sais que t'es là." },
  ];
  if (showAlice) {
    const line = typed(aliceLine, frame, 44, 30);
    blocks.push({ kind: "cue", name: "Alice", color: CAST.alice, text: line, caret: true });
  } else {
    blocks[1] = { ...(blocks[1] as any), caret: true };
  }
  return (
    <Stage>
      <Page>
        <Blocks blocks={blocks} />
      </Page>
      <KeyFlash label="⏎  Entrée" frame={frame} at={26} />
      <Caption title={COPY.ret.title} note={COPY.ret.note} />
    </Stage>
  );
};

// Type a few letters → pick the speaker
const AutocompleteBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const carolLine = "Vous avez fini, tous les deux ?";
  // phases: type "car" (0-26) → chip appears (24) → Enter (54) → assign + type line (62+)
  const assigned = frame >= 56;
  const chipOpacity = interpolate(frame, [22, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const blocks: Block[] = [
    { kind: "cue", name: "Alice", color: CAST.alice, text: "Ça veut rien dire." },
    { kind: "cue", name: "Bruno", color: CAST.bruno, text: "Dix ans, Alice. Ouvre." },
  ];
  if (!assigned) {
    // an empty cue whose LINE is being typed with the prefix, chip showing CAROL
    blocks.push({
      kind: "cue",
      name: "?",
      color: C.inkFaint,
      text: typed("car", frame, 4, 16),
      caret: true,
      chip: frame >= 22 ? { name: "Carol", opacity: chipOpacity } : undefined,
    });
  } else {
    blocks.push({ kind: "cue", name: "Carol", color: CAST.carol, text: typed(carolLine, frame, 64, 30), caret: true });
  }
  return (
    <Stage glow={C.jade}>
      <Page>
        <Blocks blocks={blocks} />
      </Page>
      <KeyFlash label="⏎  choisir" frame={frame} at={48} />
      <Caption title={COPY.auto.title} note={COPY.auto.note} />
    </Stage>
  );
};

// Tab → change block type
const TabBeat: React.FC = () => {
  const frame = useCurrentFrame();
  // start as a cue, morph to didascalie (~34), then scene label (~74)
  const phase = frame < 34 ? 0 : frame < 78 ? 1 : 2;
  const line = "Elle pose l'assiette. Un temps.";
  let block: Block;
  if (phase === 0) block = { kind: "cue", name: "Alice", color: CAST.alice, text: line, caret: true };
  else if (phase === 1) block = { kind: "stage", text: line };
  else block = { kind: "scene", label: "SCÈNE 2", setting: "Plus tard. La même cuisine." };

  const morph = phase === 0 ? pulse(frame, 20, 24) : phase === 1 ? pulse(frame, 60, 24) : 0;
  return (
    <Stage glow={C.rose}>
      <Page>
        <div style={{ transform: `translateX(${morph * 6}px)` }}>
          <Blocks
            blocks={[
              { kind: "cue", name: "Bruno", color: CAST.bruno, text: "Ouvre la porte, Alice." },
              block,
            ]}
          />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, opacity: 0.9 }}>
          {["réplique", "didascalie", "scène"].map((t, i) => (
            <span
              key={t}
              style={{
                fontFamily: grotesk,
                fontWeight: 600,
                fontSize: 20,
                padding: "6px 14px",
                borderRadius: 999,
                color: i === phase ? "#fff" : C.inkFaint,
                background: i === phase ? C.rose : `${C.inkFaint}18`,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </Page>
      <KeyFlash label="⇥  Tab" frame={frame} at={16} />
      <KeyFlash label="⇥  Tab" frame={frame} at={56} />
      <Caption title={COPY.tab.title} note={COPY.tab.note} />
    </Stage>
  );
};

// The Atelier (AI)
const AtelierBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const suggestion = "Et si tu ne répondais pas ? Laisse le silence répondre.";
  const card = useEnter(20);
  return (
    <Stage glow={C.gel}>
      <Page>
        <Blocks
          blocks={[
            { kind: "cue", name: "Alice", color: CAST.alice, text: "Qu'est-ce que tu veux, à la fin ?" },
            { kind: "cue", name: "Bruno", color: CAST.bruno, text: "Je veux…", caret: true },
          ]}
        />
        <div
          style={{
            marginTop: 14,
            background: `${C.gel}0e`,
            border: `1px solid ${C.gel}44`,
            borderRadius: 18,
            padding: "20px 24px",
            opacity: card,
            transform: `translateY(${(1 - card) * 16}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>✳</span>
            <span style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 20, letterSpacing: 2, color: C.gelDeep, textTransform: "uppercase" }}>
              L'Atelier
            </span>
            <span style={{ fontFamily: grotesk, fontSize: 17, color: C.inkFaint }}>· ébauche · à toi de décider</span>
          </div>
          <div style={{ fontSize: 30, color: C.ink, lineHeight: 1.35 }}>
            {typed(suggestion, frame, 34, 30)}
            <Caret on={!doneTyping(suggestion, frame, 34, 30)} />
          </div>
        </div>
      </Page>
      <Caption title={COPY.atelier.title} note={COPY.atelier.note} />
    </Stage>
  );
};

// Table read — cues light up in sequence
const ReadBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const cues = [
    { name: "Alice", color: CAST.alice, text: "Tu entends ça ?" },
    { name: "Bruno", color: CAST.bruno, text: "…le vent, rien d'autre." },
    { name: "Carol", color: CAST.carol, text: "Non. Quelqu'un chante." },
  ];
  const active = Math.min(cues.length - 1, Math.floor((frame - 14) / 34));
  return (
    <Stage glow={C.jade}>
      <Page>
        {cues.map((c, i) => {
          const on = i === active;
          return (
            <div
              key={i}
              style={{
                marginBottom: 22,
                padding: "12px 18px",
                borderRadius: 14,
                background: on ? `${c.color}14` : "transparent",
                transform: on ? "scale(1.012)" : "scale(1)",
                transition: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: grotesk, fontWeight: 700, letterSpacing: 3, fontSize: 24, textTransform: "uppercase", color: c.color }}>
                  {c.name}
                </span>
                {on ? <WaveIcon color={c.color} /> : null}
              </div>
              <div style={{ fontSize: 34, lineHeight: 1.3, color: on ? C.ink : C.inkFaint, marginTop: 4 }}>{c.text}</div>
            </div>
          );
        })}
      </Page>
      <Caption title={COPY.read.title} note={COPY.read.note} />
    </Stage>
  );
};

const WaveIcon: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 26 }}>
      {[0, 1, 2, 3].map((i) => {
        const h = 8 + (Math.sin((frame / 4) + i) * 0.5 + 0.5) * 18;
        return <span key={i} style={{ width: 4, height: h, borderRadius: 3, background: color }} />;
      })}
    </span>
  );
};

const Outro: React.FC = () => {
  const title = useEnter(8);
  const meta = useEnter(20);
  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
        <Mark size={128} reveal delay={2} />
        <div
          style={{
            fontFamily: grotesk,
            fontWeight: 700,
            fontSize: 84,
            color: C.white,
            opacity: title,
            transform: `translateY(${(1 - title) * 14}px)`,
            letterSpacing: -1,
          }}
        >
          {COPY.outro.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: meta }}>
          <div style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 26, letterSpacing: 3, color: C.gelBright }}>
            {COPY.outro.platforms}
          </div>
          <div style={{ fontFamily: plex, fontSize: 24, color: C.inkFaint }}>{COPY.outro.url}</div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------
export const ONB = {
  intro: 82,
  ret: 150,
  auto: 170,
  tab: 150,
  atelier: 160,
  read: 140,
  outro: 96,
  transition: 15,
};

export function onboardingTotal(): number {
  const scenes = [ONB.intro, ONB.ret, ONB.auto, ONB.tab, ONB.atelier, ONB.read, ONB.outro];
  return scenes.reduce((a, b) => a + b, 0) - ONB.transition * (scenes.length - 1);
}

export const Onboarding: React.FC = () => {
  const t = () => linearTiming({ durationInFrames: ONB.transition });
  return (
    <AbsoluteFill style={{ backgroundColor: C.desk }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={ONB.intro} premountFor={30}>
          <Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t()} />
        <TransitionSeries.Sequence durationInFrames={ONB.ret} premountFor={30}>
          <ReturnBeat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t()} />
        <TransitionSeries.Sequence durationInFrames={ONB.auto} premountFor={30}>
          <AutocompleteBeat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t()} />
        <TransitionSeries.Sequence durationInFrames={ONB.tab} premountFor={30}>
          <TabBeat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t()} />
        <TransitionSeries.Sequence durationInFrames={ONB.atelier} premountFor={30}>
          <AtelierBeat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t()} />
        <TransitionSeries.Sequence durationInFrames={ONB.read} premountFor={30}>
          <ReadBeat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t()} />
        <TransitionSeries.Sequence durationInFrames={ONB.outro} premountFor={30}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

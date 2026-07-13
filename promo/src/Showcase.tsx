import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Logo } from "./scenes/Logo";
import { Hook } from "./scenes/Hook";
import { Writing } from "./scenes/Writing";
import { Cast } from "./scenes/Cast";
import { Board } from "./scenes/Board";
import { Atelier } from "./scenes/Atelier";
import { Bilingual } from "./scenes/Bilingual";
import { Read } from "./scenes/Read";
import { Closing } from "./scenes/Closing";
import { C } from "./theme";
import type { ShowcaseProps } from "./copy";

export const Showcase: React.FC<ShowcaseProps> = ({ copy, timing, palette }) => {
  const slideT = () => linearTiming({ durationInFrames: timing.transition });

  return (
    <AbsoluteFill style={{ backgroundColor: C.desk }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={timing.logo} premountFor={30}>
          <Logo c={copy.logo} accent={palette.gel} accent2={palette.cyan} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={timing.hook} premountFor={30}>
          <Hook c={copy.hook} accent={palette.gel} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={timing.writing} premountFor={30}>
          <Writing c={copy.writing} accent={palette.gel} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={timing.cast} premountFor={30}>
          <Cast c={copy.cast} accent={palette.plum} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={timing.board} premountFor={30}>
          <Board c={copy.board} accent={palette.rose} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={timing.atelier} premountFor={30}>
          <Atelier c={copy.atelier} accent={palette.gel} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={timing.bilingual} premountFor={30}>
          <Bilingual c={copy.bilingual} accent={palette.cyan} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={timing.read} premountFor={30}>
          <Read c={copy.read} accent={palette.jade} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={timing.closing} premountFor={30}>
          <Closing c={copy.closing} accent={palette.gel} accent2={palette.cyan} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

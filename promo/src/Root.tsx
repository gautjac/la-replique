import React from "react";
import { Composition } from "remotion";
import { Showcase } from "./Showcase";
import { Onboarding, onboardingTotal } from "./Onboarding";
import { FPS } from "./theme";
import { defaultProps, showcaseSchema, totalFrames, type ShowcaseProps } from "./copy";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Showcase"
        component={Showcase}
        fps={FPS}
        width={1920}
        height={1080}
        schema={showcaseSchema}
        defaultProps={defaultProps}
        // Total length is derived from the (editable) per-scene timing, so tuning a
        // scene in the props panel re-fits the whole video automatically.
        calculateMetadata={({ props }: { props: ShowcaseProps }) => ({
          durationInFrames: totalFrames(props.timing),
        })}
      />
      {/* Guided walkthrough of the essential keyboard flow. */}
      <Composition
        id="Onboarding"
        component={Onboarding}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={onboardingTotal()}
      />
    </>
  );
};

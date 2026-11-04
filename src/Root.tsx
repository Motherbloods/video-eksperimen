import React from "react";
import { Composition } from "remotion";
import {
  RaceCondition,
  calculateMetadata,
  defaultRaceProps,
} from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RaceCondition"
      component={RaceCondition}
      durationInFrames={1170}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultRaceProps}
      calculateMetadata={calculateMetadata}
    />
  );
};

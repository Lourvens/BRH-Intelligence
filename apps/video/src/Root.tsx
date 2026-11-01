import { Composition } from "remotion";

import { BrhPresentation } from "./Video";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="BrhPresentation"
    component={BrhPresentation}
    durationInFrames={900}
    fps={30}
    width={1920}
    height={1080}
  />
);

import type { KartState } from "@racer-game/shared";

import { KartLabel } from "./KartLabel";
import { KartModel } from "./KartModel";

type KartViewProps = {
  isLocalPlayer: boolean;
  kart: KartState;
};

export const KartView = ({ isLocalPlayer, kart }: KartViewProps) => {
  const bodyColor = isLocalPlayer ? "#fb7185" : "#38bdf8";
  const wobble = kart.spinTicks > 0 ? Math.sin(kart.spinTicks) * 0.4 : 0;

  return (
    <group position={[kart.position.x, 0, kart.position.z]} rotation={[0, kart.heading + wobble, 0]}>
      <KartModel bodyColor={bodyColor} />
      <KartLabel isLocalPlayer={isLocalPlayer} playerName={kart.playerName} />
    </group>
  );
};

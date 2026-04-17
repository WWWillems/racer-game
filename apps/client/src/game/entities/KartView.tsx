import type { KartState } from "@racer-game/shared";

import { KartLabel } from "./KartLabel";

type KartViewProps = {
  isLocalPlayer: boolean;
  kart: KartState;
};

export const KartView = ({ isLocalPlayer, kart }: KartViewProps) => {
  const bodyColor = isLocalPlayer ? "#fb7185" : "#38bdf8";
  const wobble = kart.spinTicks > 0 ? Math.sin(kart.spinTicks) * 0.4 : 0;

  return (
    <group position={[kart.position.x, 0.75, kart.position.z]} rotation={[0, -kart.heading + wobble, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.8, 2.8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh position={[0, 0.2, 1.3]}>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      <KartLabel isLocalPlayer={isLocalPlayer} playerName={kart.playerName} />
    </group>
  );
};

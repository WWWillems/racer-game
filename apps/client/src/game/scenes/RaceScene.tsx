import { OrbitControls } from "@react-three/drei";

import { usePlayerInput } from "../../input/usePlayerInput";
import { useGameStore } from "../../state/useGameStore";
import { selectLocalKart } from "../../state/selectors";
import { IsometricCamera } from "../camera/IsometricCamera";
import { KartView } from "../entities/KartView";
import { TestTrack } from "../track/TestTrack";

export const RaceScene = () => {
  const snapshot = useGameStore((state) => state.snapshot);
  const localPlayerId = useGameStore((state) => state.localPlayerId);

  usePlayerInput();

  const localKart = selectLocalKart(snapshot, localPlayerId);

  return (
    <>
      <color attach="background" args={["#0f172a"]} />
      <fog attach="fog" args={["#0f172a", 28, 92]} />
      <ambientLight intensity={1.8} />
      <directionalLight castShadow intensity={2.4} position={[18, 28, 14]} />
      <TestTrack snapshot={snapshot} />
      {snapshot?.players.map((kart) => {
        return <KartView key={kart.playerId} isLocalPlayer={kart.playerId === localPlayerId} kart={kart} />;
      })}
      <IsometricCamera localKart={localKart} />
      <OrbitControls enablePan={false} enableRotate={false} enableZoom={false} />
    </>
  );
};

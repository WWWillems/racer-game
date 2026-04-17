import { Canvas } from "@react-three/fiber";

import { RaceScene } from "./scenes/RaceScene";

export const GameCanvas = () => {
  return (
    <div className="canvas-shell">
      <Canvas camera={{ fov: 42, near: 0.1, far: 200, position: [20, 28, 20] }} shadows>
        <RaceScene />
      </Canvas>
    </div>
  );
};

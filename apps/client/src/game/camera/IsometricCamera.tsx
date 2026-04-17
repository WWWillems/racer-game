import { useFrame, useThree } from "@react-three/fiber";
import type { KartState } from "@racer-game/shared";

type IsometricCameraProps = {
  localKart: KartState | null;
};

export const IsometricCamera = ({ localKart }: IsometricCameraProps) => {
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    const focusX = localKart?.position.x ?? 0;
    const focusZ = localKart?.position.z ?? 0;

    camera.position.set(focusX + 20, 28, focusZ + 20);
    camera.lookAt(focusX, 0, focusZ);
  });

  return null;
};

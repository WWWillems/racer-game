import { TRACK_INNER_RADIUS, TRACK_OUTER_RADIUS } from "@racer-game/shared";
import type { RoomSnapshot } from "@racer-game/shared";

import { Curbs } from "./Curbs";
import { VoxelGround } from "./VoxelGround";

type TestTrackProps = {
  snapshot: RoomSnapshot | null;
};

export const TestTrack = ({ snapshot }: TestTrackProps) => {
  const banana = snapshot?.banana ?? { position: { x: 0, z: -(TRACK_INNER_RADIUS + 3) } };

  return (
    <group>
      <VoxelGround />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[TRACK_INNER_RADIUS, TRACK_OUTER_RADIUS, 96]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.95} metalness={0} />
      </mesh>
      <Curbs />
      <mesh position={[TRACK_OUTER_RADIUS - 2, 0.08, 0]} receiveShadow>
        <boxGeometry args={[0.8, 0.08, 8]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[TRACK_OUTER_RADIUS - 2, 0.16, 0]}>
        <sphereGeometry args={[0.75, 14, 14]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh position={[banana.position.x, 0.3, banana.position.z]}>
        <sphereGeometry args={[0.6, 18, 18]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
    </group>
  );
};

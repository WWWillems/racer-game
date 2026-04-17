import { TRACK_INNER_RADIUS, TRACK_OUTER_RADIUS } from "@racer-game/shared";
import type { RoomSnapshot } from "@racer-game/shared";

type TestTrackProps = {
  snapshot: RoomSnapshot | null;
};

export const TestTrack = ({ snapshot }: TestTrackProps) => {
  const banana = snapshot?.banana ?? { position: { x: 0, z: -(TRACK_INNER_RADIUS + 3) } };

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[TRACK_OUTER_RADIUS + 18, 64]} />
        <meshStandardMaterial color="#164e63" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[TRACK_INNER_RADIUS, TRACK_OUTER_RADIUS, 64]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[TRACK_OUTER_RADIUS - 2, 0.04, 0]} receiveShadow>
        <boxGeometry args={[0.8, 0.08, 8]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[TRACK_OUTER_RADIUS - 2, 0.12, 0]}>
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

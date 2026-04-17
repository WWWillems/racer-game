import { TRACK_INNER_RADIUS, TRACK_OUTER_RADIUS } from "@racer-game/shared";

const SEGMENTS_PER_RING = 24;
const CURB_WIDTH = 0.4;
const CURB_HEIGHT = 0.1;
const CURB_Y = 0.05;
const CURB_RED = "#ef4444";
const CURB_WHITE = "#f8fafc";

type CurbRingProps = {
  radius: number;
};

const CurbRing = ({ radius }: CurbRingProps) => {
  const segmentLength = (2 * Math.PI * radius) / SEGMENTS_PER_RING;

  return (
    <group>
      {Array.from({ length: SEGMENTS_PER_RING }).map((_, index) => {
        const theta = (index / SEGMENTS_PER_RING) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        const color = index % 2 === 0 ? CURB_RED : CURB_WHITE;

        return (
          <mesh key={`curb-${radius}-${index}`} position={[x, CURB_Y, z]} rotation={[0, -theta, 0]} receiveShadow>
            <boxGeometry args={[CURB_WIDTH, CURB_HEIGHT, segmentLength]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Curbs = () => {
  return (
    <group>
      <CurbRing radius={TRACK_INNER_RADIUS} />
      <CurbRing radius={TRACK_OUTER_RADIUS} />
    </group>
  );
};

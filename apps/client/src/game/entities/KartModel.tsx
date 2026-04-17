type Vec3 = [number, number, number];

type KartModelProps = {
  bodyColor: string;
};

const WHEEL_POSITIONS: Vec3[] = [
  [-0.75, 0.25, 0.85],
  [0.75, 0.25, 0.85],
  [-0.75, 0.25, -0.85],
  [0.75, 0.25, -0.85]
];

const HEADLIGHT_POSITIONS: Vec3[] = [
  [-0.5, 0.55, 1.22],
  [0.5, 0.55, 1.22]
];

const TAILLIGHT_POSITIONS: Vec3[] = [
  [-0.55, 0.6, -1.22],
  [0.55, 0.6, -1.22]
];

export const KartModel = ({ bodyColor }: KartModelProps) => {
  return (
    <group>
      {WHEEL_POSITIONS.map((position, index) => {
        return (
          <mesh castShadow key={`wheel-${index}`} position={position}>
            <boxGeometry args={[0.3, 0.5, 0.55]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        );
      })}

      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.6, 0.5, 2.4]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      <mesh castShadow position={[0, 0.85, 0.6]}>
        <boxGeometry args={[1.3, 0.1, 1.0]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      <mesh castShadow position={[0, 1.0, -0.3]}>
        <boxGeometry args={[1.4, 0.5, 1.2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      <mesh position={[0, 1.0, 0.3]}>
        <boxGeometry args={[1.2, 0.4, 0.06]} />
        <meshStandardMaterial color="#38bdf8" emissive="#1e40af" emissiveIntensity={0.15} />
      </mesh>

      {HEADLIGHT_POSITIONS.map((position, index) => {
        return (
          <mesh key={`headlight-${index}`} position={position}>
            <boxGeometry args={[0.3, 0.2, 0.08]} />
            <meshStandardMaterial color="#fef3c7" emissive="#fde047" emissiveIntensity={1.2} />
          </mesh>
        );
      })}

      <mesh position={[0, 0.35, 1.22]}>
        <boxGeometry args={[0.9, 0.15, 0.06]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      {TAILLIGHT_POSITIONS.map((position, index) => {
        return (
          <mesh key={`taillight-${index}`} position={position}>
            <boxGeometry args={[0.25, 0.15, 0.08]} />
            <meshStandardMaterial color="#991b1b" emissive="#ef4444" emissiveIntensity={0.9} />
          </mesh>
        );
      })}

      <mesh position={[0, 0.4, -1.22]}>
        <boxGeometry args={[1.2, 0.1, 0.06]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  );
};

import { Text } from "@react-three/drei";

type KartLabelProps = {
  isLocalPlayer: boolean;
  playerName: string;
};

export const KartLabel = ({ isLocalPlayer, playerName }: KartLabelProps) => {
  return (
    <Text
      color={isLocalPlayer ? "#fef08a" : "#e2e8f0"}
      fontSize={0.9}
      outlineColor="#020617"
      outlineWidth={0.08}
      position={[0, 1.8, 0]}
    >
      {playerName}
    </Text>
  );
};

import type { ServerKartState } from "@racer-game/shared";

const getCheckpointFromAngle = (angle: number) => {
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    return 0;
  }

  if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    return 1;
  }

  if (angle >= (3 * Math.PI) / 4 || angle < (-3 * Math.PI) / 4) {
    return 2;
  }

  return 3;
};

export const updateLapProgress = (kart: ServerKartState): ServerKartState => {
  const angle = Math.atan2(kart.position.z, kart.position.x);
  const checkpoint = getCheckpointFromAngle(angle);
  const expectedCheckpoint = (kart.checkpointIndex + 1) % 4;

  if (checkpoint !== expectedCheckpoint) {
    return kart;
  }

  const nextLap = checkpoint === 0 ? kart.lap + 1 : kart.lap;

  return {
    ...kart,
    checkpointIndex: checkpoint,
    lap: nextLap
  };
};

export const getProgressScore = (kart: ServerKartState): number => {
  return kart.lap * 100 + kart.checkpointIndex * 10 + kart.speed;
};

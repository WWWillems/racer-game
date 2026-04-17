import { BANANA_COLLISION_RADIUS, TRACK_INNER_RADIUS, TRACK_OUTER_RADIUS } from "@racer-game/shared";
import type { BananaState, ServerKartState } from "@racer-game/shared";

const BANANA_SPAWN_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

const getTrackMidRadius = () => {
  return (TRACK_INNER_RADIUS + TRACK_OUTER_RADIUS) / 2;
};

export const getBananaSpawn = (seedTick: number): BananaState => {
  const radius = getTrackMidRadius();
  const angle = BANANA_SPAWN_ANGLES[Math.floor(seedTick / 40) % BANANA_SPAWN_ANGLES.length];

  return {
    id: `banana-${seedTick}`,
    position: {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius
    }
  };
};

export const applyBananaEffects = (
  karts: ServerKartState[],
  banana: BananaState,
  currentTick: number,
  spinTicks: number
): { banana: BananaState; karts: ServerKartState[] } => {
  let nextBanana = banana;

  const nextKarts = karts.map((kart) => {
    const deltaX = kart.position.x - nextBanana.position.x;
    const deltaZ = kart.position.z - nextBanana.position.z;
    const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

    if (distance > BANANA_COLLISION_RADIUS) {
      return kart;
    }

    nextBanana = getBananaSpawn(currentTick + 25);

    const dampenedVelocity = {
      x: kart.velocity.x * 0.3,
      z: kart.velocity.z * 0.3
    };

    return {
      ...kart,
      speed: kart.speed * 0.3,
      velocity: dampenedVelocity,
      spinTicks
    };
  });

  return { banana: nextBanana, karts: nextKarts };
};

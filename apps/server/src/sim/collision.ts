import { KART_RADIUS, TRACK_INNER_RADIUS, TRACK_OUTER_RADIUS } from "@racer-game/shared";
import type { ServerKartState } from "@racer-game/shared";

const getLength = (x: number, z: number) => {
  return Math.sqrt(x * x + z * z);
};

export const clampKartToTrack = (kart: ServerKartState): ServerKartState => {
  const radius = getLength(kart.position.x, kart.position.z);

  if (radius === 0) {
    return {
      ...kart,
      position: {
        x: TRACK_INNER_RADIUS + 2,
        z: 0
      }
    };
  }

  const minRadius = TRACK_INNER_RADIUS + KART_RADIUS;
  const maxRadius = TRACK_OUTER_RADIUS - KART_RADIUS;
  const clampedRadius = Math.min(Math.max(radius, minRadius), maxRadius);
  const scale = clampedRadius / radius;

  return {
    ...kart,
    position: {
      x: kart.position.x * scale,
      z: kart.position.z * scale
    }
  };
};

export const resolveKartCollisions = (karts: ServerKartState[]): ServerKartState[] => {
  const nextKarts = karts.map((kart) => {
    return {
      ...kart,
      position: { ...kart.position },
      velocity: { ...kart.velocity }
    };
  });

  for (let leftIndex = 0; leftIndex < nextKarts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nextKarts.length; rightIndex += 1) {
      const left = nextKarts[leftIndex];
      const right = nextKarts[rightIndex];
      const deltaX = right.position.x - left.position.x;
      const deltaZ = right.position.z - left.position.z;
      const distance = getLength(deltaX, deltaZ);
      const minimumDistance = KART_RADIUS * 2;

      if (distance === 0 || distance >= minimumDistance) {
        continue;
      }

      const overlap = (minimumDistance - distance) / 2;
      const normalX = deltaX / distance;
      const normalZ = deltaZ / distance;

      left.position.x -= normalX * overlap;
      left.position.z -= normalZ * overlap;
      right.position.x += normalX * overlap;
      right.position.z += normalZ * overlap;

      left.velocity.x *= 0.85;
      left.velocity.z *= 0.85;
      right.velocity.x *= 0.85;
      right.velocity.z *= 0.85;

      left.speed = left.velocity.x * Math.sin(left.heading) + left.velocity.z * Math.cos(left.heading);
      right.speed = right.velocity.x * Math.sin(right.heading) + right.velocity.z * Math.cos(right.heading);
    }
  }

  return nextKarts.map(clampKartToTrack);
};

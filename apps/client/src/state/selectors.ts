import type { KartState, RoomSnapshot } from "@racer-game/shared";

export const selectLocalKart = (
  snapshot: RoomSnapshot | null,
  localPlayerId: string | null
): KartState | null => {
  if (!snapshot || !localPlayerId) {
    return null;
  }

  return snapshot.players.find((player) => player.playerId === localPlayerId) ?? null;
};

export const selectSortedPlayers = (snapshot: RoomSnapshot | null): KartState[] => {
  if (!snapshot) {
    return [];
  }

  return [...snapshot.players].sort((left, right) => {
    if (left.place !== right.place) {
      return left.place - right.place;
    }

    if (left.lap !== right.lap) {
      return right.lap - left.lap;
    }

    return right.checkpointIndex - left.checkpointIndex;
  });
};

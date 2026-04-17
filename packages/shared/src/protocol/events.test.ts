import { describe, expect, it } from "vitest";

import { createRoomPayloadSchema, joinRoomPayloadSchema, roomSnapshotPayloadSchema } from "./events";

describe("socket payload schemas", () => {
  it("accepts valid room creation payloads", () => {
    const result = createRoomPayloadSchema.safeParse({
      playerName: "Banana Baron"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid join payloads", () => {
    const result = joinRoomPayloadSchema.safeParse({
      playerName: "A",
      roomId: "1"
    });

    expect(result.success).toBe(false);
  });

  it("accepts room snapshots shaped for the client", () => {
    const result = roomSnapshotPayloadSchema.safeParse({
      banana: {
        id: "banana-1",
        position: { x: 0, z: 10 }
      },
      countdownTicksRemaining: 20,
      currentTick: 1,
      lapsToWin: 3,
      localPlayerId: "player-1",
      phase: "countdown",
      players: [],
      roomId: "ROOM42",
      winnerId: null
    });

    expect(result.success).toBe(true);
  });
});

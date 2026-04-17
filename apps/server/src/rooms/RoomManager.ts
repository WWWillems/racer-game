import { randomUUID } from "node:crypto";

import type { PlayerInput, RoomSummary } from "@racer-game/shared";

import { RaceRoom } from "./RaceRoom";

const buildRoomId = () => {
  return randomUUID().slice(0, 6).toUpperCase();
};

export class RoomManager {
  private readonly rooms = new Map<string, RaceRoom>();

  public createRoom(socketId: string, playerName: string): { playerId: string; room: RaceRoom } {
    this.removeSocket(socketId);

    let roomId = buildRoomId();

    while (this.rooms.has(roomId)) {
      roomId = buildRoomId();
    }

    const room = new RaceRoom(roomId);
    const playerId = room.addPlayer(socketId, playerName);

    this.rooms.set(roomId, room);

    return { playerId, room };
  }

  public createTestRoom(socketId: string, playerName: string): { playerId: string; room: RaceRoom } {
    this.removeSocket(socketId);

    let roomId = buildRoomId();

    while (this.rooms.has(roomId)) {
      roomId = buildRoomId();
    }

    const room = new RaceRoom(roomId, true);
    const playerId = room.addPlayer(socketId, playerName);
    room.addTestBot();

    this.rooms.set(roomId, room);

    return { playerId, room };
  }

  public getRoomBySocket(socketId: string): RaceRoom | null {
    for (const room of this.rooms.values()) {
      if (room.hasSocket(socketId)) {
        return room;
      }
    }

    return null;
  }

  public joinRoom(socketId: string, roomId: string, playerName: string): { playerId: string; room: RaceRoom } {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("That room vanished into the void.");
    }

    this.removeSocket(socketId);

    const playerId = room.addPlayer(socketId, playerName);

    return { playerId, room };
  }

  public listRooms(): RoomSummary[] {
    return [...this.rooms.values()]
      .filter((room) => !room.isTestRoom)
      .map((room) => room.getSummary());
  }

  public removeSocket(socketId: string): void {
    const room = this.getRoomBySocket(socketId);

    if (!room) {
      return;
    }

    room.removePlayer(socketId);

    if (room.isTestRoom && room.getHumanPlayerCount() === 0) {
      this.rooms.delete(room.roomId);
      return;
    }

    if (room.getSummary().playerCount === 0) {
      this.rooms.delete(room.roomId);
    }
  }

  public requestRestart(socketId: string): RaceRoom | null {
    const room = this.getRoomBySocket(socketId);

    if (!room) {
      return null;
    }

    room.requestRestart();

    return room;
  }

  public tickRooms(): RaceRoom[] {
    const rooms = [...this.rooms.values()];

    for (const room of rooms) {
      room.tick();
    }

    return rooms;
  }

  public updateInput(socketId: string, input: PlayerInput): RaceRoom | null {
    const room = this.getRoomBySocket(socketId);

    if (!room) {
      return null;
    }

    room.updateInput(socketId, input);

    return room;
  }
}

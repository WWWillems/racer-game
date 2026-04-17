import { ServerEvent } from "@racer-game/shared";
import type { Server } from "socket.io";

import type { RoomManager } from "../rooms/RoomManager";
import type { RaceRoom } from "../rooms/RaceRoom";

export const broadcastRoomListing = (io: Server, roomManager: RoomManager) => {
  io.emit(ServerEvent.ROOM_LISTING, {
    rooms: roomManager.listRooms()
  });
};

export const broadcastRoomSnapshot = (io: Server, room: RaceRoom) => {
  for (const player of room.getPlayerSockets()) {
    io.to(player.socketId).emit(ServerEvent.ROOM_SNAPSHOT, room.getSnapshotFor(player.playerId));
  }
};

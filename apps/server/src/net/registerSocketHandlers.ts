import {
  ClientEvent,
  createRoomPayloadSchema,
  joinRoomPayloadSchema,
  playerInputPayloadSchema,
  ServerEvent
} from "@racer-game/shared";
import type { Server, Socket } from "socket.io";

import { broadcastRoomListing, broadcastRoomSnapshot } from "./broadcastRaceState";
import { RoomManager } from "../rooms/RoomManager";

const emitRoomError = (socket: Socket, message: string) => {
  socket.emit(ServerEvent.ROOM_ERROR, { message });
};

export const registerSocketHandlers = (io: Server, roomManager: RoomManager) => {
  io.on("connection", (socket) => {
    socket.emit(ServerEvent.ROOM_LISTING, {
      rooms: roomManager.listRooms()
    });

    socket.on(ClientEvent.CREATE_ROOM, (payload: unknown) => {
      const parsed = createRoomPayloadSchema.safeParse(payload);

      if (!parsed.success) {
        emitRoomError(socket, "Pick a driver name between 2 and 24 characters.");
        return;
      }

      try {
        const result = roomManager.createRoom(socket.id, parsed.data.playerName);
        socket.join(result.room.roomId);
        socket.emit(ServerEvent.SESSION_READY, {
          playerId: result.playerId,
          roomId: result.room.roomId
        });
        broadcastRoomSnapshot(io, result.room);
        broadcastRoomListing(io, roomManager);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not create the room.";
        emitRoomError(socket, message);
      }
    });

    socket.on(ClientEvent.JOIN_ROOM, (payload: unknown) => {
      const parsed = joinRoomPayloadSchema.safeParse(payload);

      if (!parsed.success) {
        emitRoomError(socket, "Join requests need a room code and a sensible driver name.");
        return;
      }

      try {
        const result = roomManager.joinRoom(socket.id, parsed.data.roomId, parsed.data.playerName);
        socket.join(result.room.roomId);
        socket.emit(ServerEvent.SESSION_READY, {
          playerId: result.playerId,
          roomId: result.room.roomId
        });
        broadcastRoomSnapshot(io, result.room);
        broadcastRoomListing(io, roomManager);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not join that room.";
        emitRoomError(socket, message);
      }
    });

    socket.on(ClientEvent.PLAYER_INPUT, (payload: unknown) => {
      const parsed = playerInputPayloadSchema.safeParse(payload);

      if (!parsed.success) {
        return;
      }

      roomManager.updateInput(socket.id, parsed.data);
    });

    socket.on(ClientEvent.REQUEST_RESTART, () => {
      const room = roomManager.requestRestart(socket.id);

      if (!room) {
        return;
      }

      broadcastRoomSnapshot(io, room);
      broadcastRoomListing(io, roomManager);
    });

    socket.on("disconnect", () => {
      const room = roomManager.getRoomBySocket(socket.id);
      roomManager.removeSocket(socket.id);

      if (room) {
        broadcastRoomSnapshot(io, room);
      }

      broadcastRoomListing(io, roomManager);
    });
  });
};

import { z } from "zod";

import { roomSnapshotSchema, roomSummarySchema } from "../model/game";
import { playerInputSchema } from "../model/input";

export enum ClientEvent {
  CREATE_ROOM = "create_room",
  JOIN_ROOM = "join_room",
  PLAYER_INPUT = "player_input",
  REQUEST_RESTART = "request_restart"
}

export enum ServerEvent {
  SESSION_READY = "session_ready",
  ROOM_SNAPSHOT = "room_snapshot",
  ROOM_ERROR = "room_error",
  ROOM_LISTING = "room_listing"
}

export const createRoomPayloadSchema = z.object({
  playerName: z.string().trim().min(2).max(24)
});

export type CreateRoomPayload = z.infer<typeof createRoomPayloadSchema>;

export const joinRoomPayloadSchema = z.object({
  playerName: z.string().trim().min(2).max(24),
  roomId: z.string().trim().min(4).max(12)
});

export type JoinRoomPayload = z.infer<typeof joinRoomPayloadSchema>;

export const roomErrorPayloadSchema = z.object({
  message: z.string()
});

export type RoomErrorPayload = z.infer<typeof roomErrorPayloadSchema>;

export const sessionReadyPayloadSchema = z.object({
  playerId: z.string(),
  roomId: z.string()
});

export type SessionReadyPayload = z.infer<typeof sessionReadyPayloadSchema>;

export const roomListingPayloadSchema = z.object({
  rooms: z.array(roomSummarySchema)
});

export type RoomListingPayload = z.infer<typeof roomListingPayloadSchema>;

export const roomSnapshotPayloadSchema = roomSnapshotSchema;
export type RoomSnapshotPayload = z.infer<typeof roomSnapshotPayloadSchema>;

export const playerInputPayloadSchema = playerInputSchema;
export type PlayerInputPayload = z.infer<typeof playerInputPayloadSchema>;

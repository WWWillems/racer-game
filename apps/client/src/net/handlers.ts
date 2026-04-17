import {
  roomListingPayloadSchema,
  roomSnapshotPayloadSchema,
  ServerEvent,
  sessionReadyPayloadSchema
} from "@racer-game/shared";
import type { Socket } from "socket.io-client";

import { useGameStore } from "../state/useGameStore";

export const registerSocketHandlers = (socket: Socket): (() => void) => {
  const handleConnect = () => {
    useGameStore.getState().setConnectionStatus("connected");
    useGameStore.getState().setErrorMessage(null);
  };

  const handleDisconnect = () => {
    useGameStore.getState().setConnectionStatus("disconnected");
  };

  const handleSessionReady = (payload: unknown) => {
    const parsed = sessionReadyPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return;
    }

    useGameStore.getState().setLocalPlayerId(parsed.data.playerId);
    useGameStore.getState().setRoomIdDraft(parsed.data.roomId);
  };

  const handleRoomSnapshot = (payload: unknown) => {
    const parsed = roomSnapshotPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return;
    }

    useGameStore.getState().setSnapshot(parsed.data);
    useGameStore.getState().setErrorMessage(null);
  };

  const handleRoomListing = (payload: unknown) => {
    const parsed = roomListingPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return;
    }

    useGameStore.getState().setAvailableRooms(parsed.data.rooms);
  };

  const handleRoomError = (payload: unknown) => {
    if (typeof payload !== "object" || payload === null || !("message" in payload)) {
      return;
    }

    const message = payload.message;

    if (typeof message !== "string") {
      return;
    }

    useGameStore.getState().setErrorMessage(message);
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on(ServerEvent.SESSION_READY, handleSessionReady);
  socket.on(ServerEvent.ROOM_SNAPSHOT, handleRoomSnapshot);
  socket.on(ServerEvent.ROOM_LISTING, handleRoomListing);
  socket.on(ServerEvent.ROOM_ERROR, handleRoomError);

  return () => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off(ServerEvent.SESSION_READY, handleSessionReady);
    socket.off(ServerEvent.ROOM_SNAPSHOT, handleRoomSnapshot);
    socket.off(ServerEvent.ROOM_LISTING, handleRoomListing);
    socket.off(ServerEvent.ROOM_ERROR, handleRoomError);
  };
};

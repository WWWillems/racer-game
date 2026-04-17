import { create } from "zustand";

import type { RoomSnapshot, RoomSummary } from "@racer-game/shared";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

type GameStore = {
  availableRooms: RoomSummary[];
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  localPlayerId: string | null;
  playerName: string;
  roomIdDraft: string;
  snapshot: RoomSnapshot | null;
  setAvailableRooms: (rooms: RoomSummary[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setErrorMessage: (message: string | null) => void;
  setLocalPlayerId: (playerId: string | null) => void;
  setPlayerName: (name: string) => void;
  setRoomIdDraft: (roomId: string) => void;
  setSnapshot: (snapshot: RoomSnapshot | null) => void;
};

export const useGameStore = create<GameStore>((set) => {
  return {
    availableRooms: [],
    connectionStatus: "connecting",
    errorMessage: null,
    localPlayerId: null,
    playerName: "Goofy Goose",
    roomIdDraft: "",
    snapshot: null,
    setAvailableRooms: (rooms) => set({ availableRooms: rooms }),
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setErrorMessage: (message) => set({ errorMessage: message }),
    setLocalPlayerId: (playerId) => set({ localPlayerId: playerId }),
    setPlayerName: (playerName) => set({ playerName }),
    setRoomIdDraft: (roomIdDraft) => set({ roomIdDraft }),
    setSnapshot: (snapshot) => set({ snapshot })
  };
});

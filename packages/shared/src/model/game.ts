import { z } from "zod";

import { LAPS_TO_WIN } from "../constants";
import { playerInputSchema } from "./input";

export const vectorSchema = z.object({
  x: z.number(),
  z: z.number()
});

export type Vector = z.infer<typeof vectorSchema>;

export const racePhaseSchema = z.enum(["lobby", "countdown", "racing", "finished"]);
export type RacePhase = z.infer<typeof racePhaseSchema>;

export const bananaStateSchema = z.object({
  id: z.string(),
  position: vectorSchema
});

export type BananaState = z.infer<typeof bananaStateSchema>;

export const kartStateSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  position: vectorSchema,
  velocity: vectorSchema,
  heading: z.number(),
  speed: z.number(),
  lap: z.number().int().min(0),
  checkpointIndex: z.number().int().min(0),
  spinTicks: z.number().int().min(0),
  place: z.number().int().min(1),
  finishedAtTick: z.number().int().nullable()
});

export type KartState = z.infer<typeof kartStateSchema>;

export const roomSnapshotSchema = z.object({
  roomId: z.string(),
  phase: racePhaseSchema,
  currentTick: z.number().int().min(0),
  countdownTicksRemaining: z.number().int().min(0),
  lapsToWin: z.number().int().min(1),
  winnerId: z.string().nullable(),
  localPlayerId: z.string().nullable(),
  banana: bananaStateSchema,
  players: z.array(kartStateSchema)
});

export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>;

export const roomSummarySchema = z.object({
  roomId: z.string(),
  phase: racePhaseSchema,
  playerCount: z.number().int().min(0)
});

export type RoomSummary = z.infer<typeof roomSummarySchema>;

export const playerSessionSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  roomId: z.string()
});

export type PlayerSession = z.infer<typeof playerSessionSchema>;

export const serverKartStateSchema = kartStateSchema.extend({
  input: playerInputSchema,
  brakeHeldToStop: z.boolean()
});

export type ServerKartState = z.infer<typeof serverKartStateSchema>;

export const createInitialRoomSnapshot = (roomId: string): RoomSnapshot => {
  return {
    roomId,
    phase: "lobby",
    currentTick: 0,
    countdownTicksRemaining: 0,
    lapsToWin: LAPS_TO_WIN,
    winnerId: null,
    localPlayerId: null,
    banana: {
      id: "banana-1",
      position: { x: 0, z: -(LAPS_TO_WIN + 12) }
    },
    players: []
  };
};

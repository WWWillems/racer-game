import { randomUUID } from "node:crypto";

import { EMPTY_PLAYER_INPUT, LAPS_TO_WIN, MAX_PLAYERS_PER_ROOM } from "@racer-game/shared";
import type { PlayerInput, RoomSnapshot, RoomSummary, ServerKartState } from "@racer-game/shared";

import { getBananaSpawn } from "../sim/funnyItems";
import { createCountdownState, type SimulationState, stepSimulation } from "../sim/stepSimulation";

type RoomPlayer = {
  isBot: boolean;
  playerId: string;
  socketId: string;
  state: ServerKartState;
};

const BOT_SOCKET_PREFIX = "bot:";
const TEST_BOT_NAME = "Practice Dummy";

export const isBotSocketId = (socketId: string): boolean => {
  return socketId.startsWith(BOT_SOCKET_PREFIX);
};

export class RaceRoom {
  private readonly playersBySocketId = new Map<string, RoomPlayer>();

  private simulationState: SimulationState;

  public constructor(
    public readonly roomId: string,
    public readonly isTestRoom: boolean = false
  ) {
    this.simulationState = {
      banana: getBananaSpawn(0),
      countdownTicksRemaining: 0,
      currentTick: 0,
      lapsToWin: LAPS_TO_WIN,
      phase: "lobby",
      players: [],
      winnerId: null
    };
  }

  public addPlayer(socketId: string, playerName: string): string {
    return this.addRoomPlayer(socketId, playerName, false);
  }

  public addTestBot(): string {
    const botSocketId = `${BOT_SOCKET_PREFIX}${randomUUID()}`;
    return this.addRoomPlayer(botSocketId, TEST_BOT_NAME, true);
  }

  public getHumanPlayerCount(): number {
    let count = 0;

    for (const player of this.playersBySocketId.values()) {
      if (!player.isBot) {
        count += 1;
      }
    }

    return count;
  }

  private addRoomPlayer(socketId: string, playerName: string, isBot: boolean): string {
    if (this.playersBySocketId.size >= MAX_PLAYERS_PER_ROOM) {
      throw new Error("This room is already full of chaos.");
    }

    const playerId = randomUUID();
    const rosterIndex = this.playersBySocketId.size;
    const spawnAngle = (rosterIndex / Math.max(MAX_PLAYERS_PER_ROOM, 1)) * Math.PI * 2;
    const radius = 22;
    const player: RoomPlayer = {
      isBot,
      playerId,
      socketId,
      state: {
        brakeHeldToStop: false,
        checkpointIndex: 3,
        finishedAtTick: null,
        heading: -spawnAngle + Math.PI / 2,
        input: { ...EMPTY_PLAYER_INPUT },
        lap: 0,
        place: rosterIndex + 1,
        playerId,
        playerName,
        position: {
          x: Math.cos(spawnAngle) * radius,
          z: Math.sin(spawnAngle) * radius
        },
        speed: 0,
        spinTicks: 0,
        velocity: {
          x: 0,
          z: 0
        }
      }
    };

    this.playersBySocketId.set(socketId, player);
    this.syncSimulationPlayers();
    this.syncPhaseFromRoster();

    return playerId;
  }

  public getPlayerId(socketId: string): string | null {
    return this.playersBySocketId.get(socketId)?.playerId ?? null;
  }

  public getPlayerSockets(): Array<{ isBot: boolean; playerId: string; socketId: string }> {
    return [...this.playersBySocketId.values()].map((player) => {
      return {
        isBot: player.isBot,
        playerId: player.playerId,
        socketId: player.socketId
      };
    });
  }

  public getSnapshotFor(playerId: string | null): RoomSnapshot {
    return {
      banana: this.simulationState.banana,
      countdownTicksRemaining: this.simulationState.countdownTicksRemaining,
      currentTick: this.simulationState.currentTick,
      lapsToWin: this.simulationState.lapsToWin,
      localPlayerId: playerId,
      phase: this.simulationState.phase,
      players: this.simulationState.players.map((player) => {
        return {
          checkpointIndex: player.checkpointIndex,
          finishedAtTick: player.finishedAtTick,
          heading: player.heading,
          lap: player.lap,
          place: player.place,
          playerId: player.playerId,
          playerName: player.playerName,
          position: { ...player.position },
          speed: player.speed,
          spinTicks: player.spinTicks,
          velocity: { ...player.velocity }
        };
      }),
      roomId: this.roomId,
      winnerId: this.simulationState.winnerId
    };
  }

  public getSummary(): RoomSummary {
    return {
      phase: this.simulationState.phase,
      playerCount: this.playersBySocketId.size,
      roomId: this.roomId
    };
  }

  public hasSocket(socketId: string): boolean {
    return this.playersBySocketId.has(socketId);
  }

  public removePlayer(socketId: string): void {
    this.playersBySocketId.delete(socketId);
    this.syncSimulationPlayers();
    this.syncPhaseFromRoster();
  }

  public requestRestart(): void {
    if (this.playersBySocketId.size < 2) {
      this.resetToLobby();
      return;
    }

    this.simulationState = createCountdownState({
      ...this.simulationState,
      banana: getBananaSpawn(this.simulationState.currentTick),
      players: this.simulationState.players.map((player) => {
        return {
          ...player,
          input: { ...EMPTY_PLAYER_INPUT }
        };
      })
    });
    this.persistSimulationPlayers();
  }

  public tick(): void {
    this.simulationState = stepSimulation(this.simulationState);
    this.persistSimulationPlayers();
  }

  public updateInput(socketId: string, input: PlayerInput): void {
    const player = this.playersBySocketId.get(socketId);

    if (!player) {
      return;
    }

    player.state = {
      ...player.state,
      input: { ...input }
    };
    this.syncSimulationPlayers();
  }

  private persistSimulationPlayers(): void {
    const playersById = new Map<string, ServerKartState>();

    for (const player of this.simulationState.players) {
      playersById.set(player.playerId, player);
    }

    for (const [socketId, roomPlayer] of this.playersBySocketId.entries()) {
      const nextState = playersById.get(roomPlayer.playerId);

      if (!nextState) {
        continue;
      }

      this.playersBySocketId.set(socketId, {
        ...roomPlayer,
        state: nextState
      });
    }
  }

  private resetToLobby(): void {
    this.simulationState = {
      banana: getBananaSpawn(this.simulationState.currentTick),
      countdownTicksRemaining: 0,
      currentTick: 0,
      lapsToWin: LAPS_TO_WIN,
      phase: "lobby",
      players: [...this.playersBySocketId.values()].map((player, index) => {
        const angle = (index / Math.max(this.playersBySocketId.size, 1)) * Math.PI * 2;
        const radius = 22;

        return {
          ...player.state,
          brakeHeldToStop: false,
          checkpointIndex: 3,
          finishedAtTick: null,
          heading: -angle + Math.PI / 2,
          input: { ...EMPTY_PLAYER_INPUT },
          lap: 0,
          place: index + 1,
          position: {
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius
          },
          speed: 0,
          spinTicks: 0,
          velocity: {
            x: 0,
            z: 0
          }
        };
      }),
      winnerId: null
    };
    this.persistSimulationPlayers();
  }

  private syncPhaseFromRoster(): void {
    if (this.playersBySocketId.size < 2) {
      this.resetToLobby();
      return;
    }

    if (this.simulationState.phase === "lobby" || this.simulationState.phase === "finished") {
      this.requestRestart();
    }
  }

  private syncSimulationPlayers(): void {
    this.simulationState = {
      ...this.simulationState,
      players: [...this.playersBySocketId.values()].map((player) => {
        return player.state;
      })
    };
  }
}

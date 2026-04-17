import { useEffect } from "react";

import { ClientEvent } from "@racer-game/shared";

import { GameCanvas } from "./game/GameCanvas";
import { registerSocketHandlers } from "./net/handlers";
import { gameSocket } from "./net/socket";
import { useGameStore } from "./state/useGameStore";
import { selectSortedPlayers } from "./state/selectors";

const formatPhase = (phase: string | null) => {
  if (!phase) {
    return "Waiting for a room";
  }

  return phase[0].toUpperCase() + phase.slice(1);
};

export default function App() {
  const availableRooms = useGameStore((state) => state.availableRooms);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const errorMessage = useGameStore((state) => state.errorMessage);
  const playerName = useGameStore((state) => state.playerName);
  const roomIdDraft = useGameStore((state) => state.roomIdDraft);
  const snapshot = useGameStore((state) => state.snapshot);
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const setPlayerName = useGameStore((state) => state.setPlayerName);
  const setRoomIdDraft = useGameStore((state) => state.setRoomIdDraft);
  const sortedPlayers = selectSortedPlayers(snapshot);

  useEffect(() => {
    const cleanup = registerSocketHandlers(gameSocket);

    setConnectionStatus("connecting");
    gameSocket.connect();

    return () => {
      cleanup();
      gameSocket.disconnect();
    };
  }, [setConnectionStatus]);

  const createRoom = () => {
    gameSocket.emit(ClientEvent.CREATE_ROOM, { playerName });
  };

  const joinRoom = (nextRoomId?: string) => {
    const roomId = nextRoomId ?? roomIdDraft;

    gameSocket.emit(ClientEvent.JOIN_ROOM, {
      playerName,
      roomId
    });
  };

  const requestRestart = () => {
    gameSocket.emit(ClientEvent.REQUEST_RESTART);
  };

  return (
    <div className="app-shell">
      <GameCanvas />
      <aside className="ui-panel stack">
        <div className="stack">
          <h1>Funny Isometric Racer</h1>
          <p className="tiny-text">A tiny multiplayer prototype where banana peels are considered track furniture.</p>
          <div className="status-pill">Socket: {connectionStatus}</div>
        </div>

        <div className="field">
          <label htmlFor="player-name">Driver name</label>
          <input
            id="player-name"
            maxLength={24}
            onChange={(event) => setPlayerName(event.target.value)}
            value={playerName}
          />
        </div>

        <div className="button-row">
          <button onClick={createRoom} type="button">
            Create room
          </button>
          <button className="secondary" onClick={() => joinRoom()} type="button">
            Join room
          </button>
        </div>

        <div className="field">
          <label htmlFor="room-id">Room code</label>
          <input
            id="room-id"
            onChange={(event) => setRoomIdDraft(event.target.value.toUpperCase())}
            placeholder="ABCD12"
            value={roomIdDraft}
          />
        </div>

        {Boolean(errorMessage) ? <p>{errorMessage}</p> : null}

        <div className="stack">
          <h2>Open rooms</h2>
          <div className="room-list">
            {availableRooms.length === 0 ? <p className="tiny-text">No rooms yet. Start the nonsense.</p> : null}
            {availableRooms.map((room) => {
              return (
                <button
                  className="secondary solo-button"
                  key={room.roomId}
                  onClick={() => joinRoom(room.roomId)}
                  type="button"
                >
                  {room.roomId} · {room.playerCount} racers · {formatPhase(room.phase)}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <aside className="hud">
        <div className="stack">
          <h2>{snapshot ? `Room ${snapshot.roomId}` : "No room joined"}</h2>
          <p className="tiny-text">
            {snapshot
              ? `${formatPhase(snapshot.phase)} · ${Math.ceil(snapshot.countdownTicksRemaining / 20)}s countdown`
              : "Create a room, open another tab, and race yourself into shame."}
          </p>
          {snapshot?.phase === "finished" ? (
            <button className="solo-button" onClick={requestRestart} type="button">
              Restart race
            </button>
          ) : null}
        </div>

        <div className="leaderboard">
          {sortedPlayers.map((player) => {
            return (
              <div className="leaderboard-row" key={player.playerId}>
                <span>
                  #{player.place} {player.playerName}
                </span>
                <span>
                  Lap {player.lap + 1} · CP {player.checkpointIndex + 1}
                </span>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

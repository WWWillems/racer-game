import { useEffect } from "react";

import { ClientEvent } from "@racer-game/shared";

import { GameCanvas } from "../game/GameCanvas";
import { gameSocket } from "../net/socket";
import { useGameStore } from "../state/useGameStore";
import { selectSortedPlayers } from "../state/selectors";

import { navigate } from "./Router";

const formatPhase = (phase: string | null) => {
  if (!phase) {
    return "Booting test grounds";
  }

  return phase[0].toUpperCase() + phase.slice(1);
};

export const TestGrounds = () => {
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const errorMessage = useGameStore((state) => state.errorMessage);
  const playerName = useGameStore((state) => state.playerName);
  const snapshot = useGameStore((state) => state.snapshot);
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const setLocalPlayerId = useGameStore((state) => state.setLocalPlayerId);
  const sortedPlayers = selectSortedPlayers(snapshot);

  useEffect(() => {
    const emitCreateTestRoom = () => {
      gameSocket.emit(ClientEvent.CREATE_TEST_ROOM, { playerName });
    };

    if (gameSocket.connected) {
      emitCreateTestRoom();
      return;
    }

    gameSocket.once("connect", emitCreateTestRoom);

    return () => {
      gameSocket.off("connect", emitCreateTestRoom);
    };
  }, [playerName]);

  const requestRestart = () => {
    gameSocket.emit(ClientEvent.REQUEST_RESTART);
  };

  const backToMenu = () => {
    setSnapshot(null);
    setLocalPlayerId(null);
    gameSocket.disconnect();
    gameSocket.connect();
    navigate("/");
  };

  return (
    <div className="app-shell">
      <GameCanvas />
      <aside className="ui-panel stack">
        <div className="stack">
          <button className="back-to-menu" onClick={backToMenu} type="button">
            ← Back to menu
          </button>
          <h1>Test Grounds</h1>
          <p className="tiny-text">Solo practice with a stationary dummy. Hot reload safe.</p>
          <div className="status-pill">Socket: {connectionStatus}</div>
        </div>

        {Boolean(errorMessage) ? <p>{errorMessage}</p> : null}
      </aside>

      <aside className="hud">
        <div className="stack">
          <h2>{snapshot ? `Room ${snapshot.roomId}` : "Spawning test room…"}</h2>
          <p className="tiny-text">
            {snapshot
              ? `${formatPhase(snapshot.phase)} · ${Math.ceil(snapshot.countdownTicksRemaining / 20)}s countdown`
              : "Connecting to the server."}
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
};

import { useEffect, useState } from "react";

import { ClientEvent, EMPTY_PLAYER_INPUT } from "@racer-game/shared";

import { gameSocket } from "../net/socket";
import { useGameStore } from "../state/useGameStore";

const buildInput = (keys: Set<string>) => {
  return {
    throttle: keys.has("arrowup") || keys.has("w") ? 1 : keys.has("arrowdown") || keys.has("s") ? -1 : 0,
    steer: keys.has("arrowleft") || keys.has("a") ? -1 : keys.has("arrowright") || keys.has("d") ? 1 : 0,
    drift: keys.has("shift"),
    useItem: keys.has(" ")
  };
};

export const usePlayerInput = () => {
  const snapshot = useGameStore((state) => state.snapshot);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const nextKey = event.key.toLowerCase();

      setPressedKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys);
        nextKeys.add(nextKey);
        return nextKeys;
      });
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const nextKey = event.key.toLowerCase();

      setPressedKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys);
        nextKeys.delete(nextKey);
        return nextKeys;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const input = buildInput(pressedKeys);

  useEffect(() => {
    if (!snapshot || snapshot.phase === "finished") {
      gameSocket.emit(ClientEvent.PLAYER_INPUT, EMPTY_PLAYER_INPUT);
      return;
    }

    gameSocket.emit(ClientEvent.PLAYER_INPUT, input);
  }, [input, snapshot]);

  return input;
};

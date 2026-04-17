import { useEffect } from "react";

import { registerSocketHandlers } from "./net/handlers";
import { gameSocket } from "./net/socket";
import { Router } from "./routes/Router";
import { useGameStore } from "./state/useGameStore";

export default function App() {
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);

  useEffect(() => {
    const cleanup = registerSocketHandlers(gameSocket);

    setConnectionStatus("connecting");
    gameSocket.connect();

    return () => {
      cleanup();
      gameSocket.disconnect();
    };
  }, [setConnectionStatus]);

  return <Router />;
}

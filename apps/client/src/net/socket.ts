import { io } from "socket.io-client";

const getSocketUrl = (): string => {
  const explicitUrl = import.meta.env.VITE_SOCKET_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  return "http://localhost:3001";
};

export const gameSocket = io(getSocketUrl(), {
  autoConnect: false
});

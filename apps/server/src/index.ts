import { createServer } from "node:http";

import { SERVER_TICK_MS } from "@racer-game/shared";
import { Server } from "socket.io";

import { broadcastRoomSnapshot } from "./net/broadcastRaceState";
import { registerSocketHandlers } from "./net/registerSocketHandlers";
import { RoomManager } from "./rooms/RoomManager";

const port = Number(process.env.PORT ?? 3001);
const roomManager = new RoomManager();
const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  response.writeHead(404);
  response.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

registerSocketHandlers(io, roomManager);

setInterval(() => {
  const rooms = roomManager.tickRooms();

  for (const room of rooms) {
    broadcastRoomSnapshot(io, room);
  }
}, SERVER_TICK_MS);

httpServer.listen(port, () => {
  console.log(`racer-server listening on http://localhost:${port}`);
});

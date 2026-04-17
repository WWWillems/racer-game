# Racer Game

An isometric top-down multiplayer racing game scaffold built with TypeScript.

The current setup is optimized for a small but complete playable loop:
- Vite + React + React Three Fiber client
- Node + Socket.IO authoritative multiplayer server
- Shared protocol and game model package
- SRP-oriented package and file boundaries

## Stack

- `TypeScript`
- `pnpm` workspaces
- `Vite`
- `React`
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `zustand`
- `Socket.IO`
- `Vitest`

## Workspace Layout

```text
apps/
  client/   Browser game client
  server/   Realtime multiplayer server
packages/
  shared/   Shared types, constants, and socket contracts
```

## Requirements

- `Node` `v22.22.0`
- `pnpm`
- `nvm` recommended

This repo uses `.nvmrc`, so load the correct Node version before running Node-based commands:

```sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use
```

## Install

```sh
pnpm install
```

## Development

Run the server:

```sh
pnpm dev:server
```

Run the client in another terminal:

```sh
pnpm dev:client
```

Then open the client, create a room, and join from another browser tab to test the multiplayer loop.

## Scripts

From the repo root:

```sh
pnpm dev:client
pnpm dev:server
pnpm test
pnpm typecheck
pnpm build
```

## Current Gameplay Scaffold

The prototype currently includes:
- room creation and joining
- authoritative server tick loop
- fixed isometric camera
- placeholder karts and track
- lap/checkpoint progression
- race countdown and finish state
- one funny interaction via banana peel spinouts

## Notes

- Shared socket contracts live in `packages/shared/src/protocol/events.ts`.
- The server is the authority for race state, laps, collisions, and winners.
- Project-specific Cursor guidance lives in `.cursor/rules/`.

import { describe, expect, it } from "vitest";

import { DEFAULT_KART_HANDLING } from "@racer-game/shared";
import type { PlayerInput, ServerKartState } from "@racer-game/shared";

import type { SimulationState } from "./stepSimulation";
import { createCountdownState, stepSimulation } from "./stepSimulation";

const createState = (): SimulationState => {
  return {
    banana: {
      id: "banana-1",
      position: { x: 0, z: 22 }
    },
    countdownTicksRemaining: 0,
    currentTick: 0,
    lapsToWin: 1,
    phase: "lobby",
    players: [
      {
        brakeHeldToStop: false,
        checkpointIndex: 3,
        finishedAtTick: null,
        heading: 0,
        input: {
          drift: false,
          steer: 0,
          throttle: 1,
          useItem: false
        },
        lap: 0,
        place: 1,
        playerId: "player-1",
        playerName: "Goose",
        position: { x: 22, z: -0.1 },
        speed: 14,
        spinTicks: 0,
        velocity: { x: 0, z: 14 }
      },
      {
        brakeHeldToStop: false,
        checkpointIndex: 3,
        finishedAtTick: null,
        heading: Math.PI,
        input: {
          drift: false,
          steer: 0,
          throttle: 0,
          useItem: false
        },
        lap: 0,
        place: 2,
        playerId: "player-2",
        playerName: "Mole",
        position: { x: -22, z: 0 },
        speed: 0,
        spinTicks: 0,
        velocity: { x: 0, z: 0 }
      }
    ],
    winnerId: null
  };
};

const createSoloRacingState = (player: ServerKartState): SimulationState => {
  return {
    banana: { id: "banana-test", position: { x: 0, z: 999 } },
    countdownTicksRemaining: 0,
    currentTick: 0,
    lapsToWin: 999,
    phase: "racing",
    players: [player],
    winnerId: null
  };
};

const createTestPlayer = (overrides: Partial<ServerKartState> = {}): ServerKartState => {
  const input: PlayerInput = {
    drift: false,
    steer: 0,
    throttle: 0,
    useItem: false,
    ...overrides.input
  };

  return {
    brakeHeldToStop: false,
    checkpointIndex: 3,
    finishedAtTick: null,
    heading: 0,
    lap: 0,
    place: 1,
    playerId: "player-test",
    playerName: "Test",
    position: { x: 22, z: 0 },
    speed: 0,
    spinTicks: 0,
    velocity: { x: 0, z: 0 },
    ...overrides,
    input
  };
};

const runTicks = (initialState: SimulationState, ticks: number): SimulationState => {
  let state = initialState;
  for (let tick = 0; tick < ticks; tick += 1) {
    state = stepSimulation(state);
  }
  return state;
};

describe("stepSimulation", () => {
  it("counts down before racing begins", () => {
    const countdownState = createCountdownState(createState());
    const nextState = stepSimulation(countdownState);

    expect(nextState.phase).toBe("countdown");
    expect(nextState.countdownTicksRemaining).toBeLessThan(countdownState.countdownTicksRemaining);
  });

  it("declares a winner after a lap is completed", () => {
    const racingState: SimulationState = {
      ...createState(),
      phase: "racing"
    };

    const nextState = stepSimulation(racingState);

    expect(nextState.phase).toBe("finished");
    expect(nextState.winnerId).toBe("player-1");
  });
});

describe("kart handling", () => {
  it("reaches near top speed under full throttle within 2 seconds", () => {
    const player = createTestPlayer({
      input: { drift: false, steer: 0, throttle: 1, useItem: false }
    });
    const state = createSoloRacingState(player);

    const finalState = runTicks(state, 40);
    const finalPlayer = finalState.players[0];

    expect(finalPlayer.speed).toBeGreaterThan(DEFAULT_KART_HANDLING.maxForwardSpeed * 0.95);
    expect(finalPlayer.speed).toBeLessThanOrEqual(DEFAULT_KART_HANDLING.maxForwardSpeed + 0.01);
  });

  it("does not rotate the kart while stationary when steering is held", () => {
    const player = createTestPlayer({
      input: { drift: false, steer: 1, throttle: 0, useItem: false }
    });
    const state = createSoloRacingState(player);

    const finalState = runTicks(state, 20);
    const finalPlayer = finalState.players[0];

    expect(finalPlayer.heading).toBe(0);
    expect(finalPlayer.speed).toBe(0);
  });

  it("brakes a forward-moving kart to a stop without reversing into negative speed", () => {
    const player = createTestPlayer({
      speed: 20,
      velocity: { x: 0, z: 20 },
      input: { drift: false, steer: 0, throttle: -1, useItem: false }
    });
    const state = createSoloRacingState(player);

    const finalState = runTicks(state, 20);
    const finalPlayer = finalState.players[0];

    expect(finalPlayer.speed).toBe(0);
    expect(finalPlayer.velocity.z).toBeCloseTo(0, 5);
  });

  it("bleeds lateral velocity to under 10 percent within 0.2 seconds of normal grip", () => {
    const initialLateral = 5;
    const player = createTestPlayer({
      heading: 0,
      velocity: { x: initialLateral, z: 10 },
      speed: 10,
      input: { drift: false, steer: 0, throttle: 0, useItem: false }
    });
    const state = createSoloRacingState(player);

    const finalState = runTicks(state, 4);
    const finalPlayer = finalState.players[0];
    const lateralAfter = finalPlayer.velocity.x * Math.cos(finalPlayer.heading) - finalPlayer.velocity.z * Math.sin(finalPlayer.heading);

    expect(Math.abs(lateralAfter)).toBeLessThan(initialLateral * 0.1);
  });

  it("retains lateral velocity much longer while drifting", () => {
    const initialLateral = 5;
    const player = createTestPlayer({
      heading: 0,
      velocity: { x: initialLateral, z: 10 },
      speed: 10,
      input: { drift: true, steer: 0, throttle: 0, useItem: false }
    });
    const state = createSoloRacingState(player);

    const finalState = runTicks(state, 4);
    const finalPlayer = finalState.players[0];
    const lateralAfter = finalPlayer.velocity.x * Math.cos(finalPlayer.heading) - finalPlayer.velocity.z * Math.sin(finalPlayer.heading);

    expect(Math.abs(lateralAfter)).toBeGreaterThan(initialLateral * 0.5);
  });
});

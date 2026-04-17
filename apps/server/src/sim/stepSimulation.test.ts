import { describe, expect, it } from "vitest";

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

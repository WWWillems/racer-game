import {
  COUNTDOWN_TICKS,
  DEFAULT_KART_HANDLING,
  LAPS_TO_WIN,
  SERVER_TICK_RATE,
  SPIN_TICKS_ON_BANANA
} from "@racer-game/shared";
import type { BananaState, KartHandlingProfile, RacePhase, ServerKartState } from "@racer-game/shared";

import { clampKartToTrack, resolveKartCollisions } from "./collision";
import { applyBananaEffects } from "./funnyItems";
import { getProgressScore, updateLapProgress } from "./lapProgress";

export type SimulationState = {
  banana: BananaState;
  countdownTicksRemaining: number;
  currentTick: number;
  lapsToWin: number;
  phase: RacePhase;
  players: ServerKartState[];
  winnerId: string | null;
};

const STEP_SECONDS = 1 / SERVER_TICK_RATE;
const SPIN_YAW_RATE = 9;
const SPIN_VELOCITY_DRAG_COEFF = 3;

const stepKart = (kart: ServerKartState, handling: KartHandlingProfile): ServerKartState => {
  if (kart.spinTicks > 0) {
    const spunHeading = kart.heading + SPIN_YAW_RATE * STEP_SECONDS;
    const decay = Math.exp(-SPIN_VELOCITY_DRAG_COEFF * STEP_SECONDS);
    const decayedVelocity = {
      x: kart.velocity.x * decay,
      z: kart.velocity.z * decay
    };
    const forwardSpeed =
      decayedVelocity.x * Math.sin(spunHeading) + decayedVelocity.z * Math.cos(spunHeading);

    return clampKartToTrack({
      ...kart,
      heading: spunHeading,
      speed: forwardSpeed,
      velocity: decayedVelocity,
      position: {
        x: kart.position.x + decayedVelocity.x * STEP_SECONDS,
        z: kart.position.z + decayedVelocity.z * STEP_SECONDS
      },
      spinTicks: kart.spinTicks - 1
    });
  }

  const sinHeading = Math.sin(kart.heading);
  const cosHeading = Math.cos(kart.heading);
  let forward = kart.velocity.x * sinHeading + kart.velocity.z * cosHeading;
  let lateral = kart.velocity.x * cosHeading - kart.velocity.z * sinHeading;

  const { throttle } = kart.input;
  let brakeHeldToStop = kart.brakeHeldToStop;

  if (throttle >= 0) {
    brakeHeldToStop = false;
  }

  if (throttle > 0) {
    if (forward < 0) {
      forward = Math.min(0, forward + handling.brake * STEP_SECONDS);
    } else {
      forward = Math.min(handling.maxForwardSpeed, forward + handling.acceleration * STEP_SECONDS);
    }
  } else if (throttle < 0) {
    if (forward > 0) {
      forward = Math.max(0, forward - handling.brake * STEP_SECONDS);
      brakeHeldToStop = true;
    } else if (brakeHeldToStop) {
      forward = 0;
    } else {
      forward = Math.max(
        handling.maxReverseSpeed,
        forward - handling.reverseAcceleration * STEP_SECONDS
      );
    }
  }

  forward *= Math.exp(-handling.longitudinalDragCoeff * STEP_SECONDS);
  const gripCoeff = kart.input.drift ? handling.driftLateralGripCoeff : handling.lateralGripCoeff;
  lateral *= Math.exp(-gripCoeff * STEP_SECONDS);

  const velocity = {
    x: forward * sinHeading + lateral * cosHeading,
    z: forward * cosHeading - lateral * sinHeading
  };

  const turnFactor = Math.min(Math.abs(forward) / handling.turnRefSpeed, 1);
  const heading = kart.heading - kart.input.steer * handling.turnSpeed * turnFactor * STEP_SECONDS;

  return clampKartToTrack({
    ...kart,
    brakeHeldToStop,
    heading,
    speed: forward,
    velocity,
    position: {
      x: kart.position.x + velocity.x * STEP_SECONDS,
      z: kart.position.z + velocity.z * STEP_SECONDS
    }
  });
};

const rankPlayers = (players: ServerKartState[]): ServerKartState[] => {
  const rankedPlayers = [...players].sort((left, right) => {
    return getProgressScore(right) - getProgressScore(left);
  });

  return rankedPlayers.map((player, index) => {
    return {
      ...player,
      place: index + 1
    };
  });
};

export const stepSimulation = (state: SimulationState): SimulationState => {
  const nextTick = state.currentTick + 1;

  if (state.phase === "lobby") {
    return {
      ...state,
      currentTick: nextTick
    };
  }

  if (state.phase === "countdown") {
    const remaining = Math.max(state.countdownTicksRemaining - 1, 0);

    return {
      ...state,
      currentTick: nextTick,
      countdownTicksRemaining: remaining,
      phase: remaining === 0 ? "racing" : "countdown"
    };
  }

  if (state.phase === "finished") {
    return {
      ...state,
      currentTick: nextTick
    };
  }

  const movedPlayers = state.players.map((player) => {
    return stepKart(player, DEFAULT_KART_HANDLING);
  });
  const collidedPlayers = resolveKartCollisions(movedPlayers);
  const progressedPlayers = collidedPlayers.map(updateLapProgress);
  const bananaResult = applyBananaEffects(progressedPlayers, state.banana, nextTick, SPIN_TICKS_ON_BANANA);
  const rankedPlayers = rankPlayers(bananaResult.karts);
  const winner = rankedPlayers.find((player) => player.lap >= state.lapsToWin) ?? null;

  return {
    banana: bananaResult.banana,
    countdownTicksRemaining: 0,
    currentTick: nextTick,
    lapsToWin: state.lapsToWin,
    phase: winner ? "finished" : "racing",
    players: rankedPlayers.map((player) => {
      if (!winner || player.playerId !== winner.playerId) {
        return player;
      }

      return {
        ...player,
        finishedAtTick: nextTick
      };
    }),
    winnerId: winner?.playerId ?? state.winnerId
  };
};

export const createCountdownState = (state: SimulationState): SimulationState => {
  return {
    ...state,
    countdownTicksRemaining: COUNTDOWN_TICKS,
    currentTick: 0,
    lapsToWin: LAPS_TO_WIN,
    phase: "countdown",
    players: state.players.map((player, index) => {
      const angle = (index / Math.max(state.players.length, 1)) * Math.PI * 2;
      const radius = 22;

      return {
        ...player,
        brakeHeldToStop: false,
        checkpointIndex: 3,
        finishedAtTick: null,
        heading: -angle + Math.PI / 2,
        input: { ...player.input },
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
};

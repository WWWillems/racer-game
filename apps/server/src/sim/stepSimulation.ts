import {
  COUNTDOWN_TICKS,
  KART_ACCELERATION,
  KART_BRAKE,
  KART_DRAG,
  KART_MAX_FORWARD_SPEED,
  KART_MAX_REVERSE_SPEED,
  KART_TURN_SPEED,
  LAPS_TO_WIN,
  SERVER_TICK_RATE,
  SPIN_TICKS_ON_BANANA
} from "@racer-game/shared";
import type { BananaState, RacePhase, ServerKartState } from "@racer-game/shared";

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

const stepKart = (kart: ServerKartState): ServerKartState => {
  if (kart.spinTicks > 0) {
    return clampKartToTrack({
      ...kart,
      heading: kart.heading + 0.45,
      speed: kart.speed * 0.82,
      spinTicks: kart.spinTicks - 1
    });
  }

  const acceleration = kart.input.throttle > 0 ? KART_ACCELERATION : kart.input.throttle < 0 ? KART_BRAKE : 0;
  const signedAcceleration = acceleration * kart.input.throttle;
  const unclampedSpeed = kart.speed + signedAcceleration * STEP_SECONDS;
  const draggedSpeed = unclampedSpeed * KART_DRAG;
  const speed = Math.min(Math.max(draggedSpeed, KART_MAX_REVERSE_SPEED), KART_MAX_FORWARD_SPEED);
  const heading = kart.heading - kart.input.steer * KART_TURN_SPEED * STEP_SECONDS * (0.4 + Math.abs(speed) * 0.08);
  const nextVelocity = {
    x: Math.sin(heading) * speed,
    z: Math.cos(heading) * speed
  };

  return clampKartToTrack({
    ...kart,
    heading,
    speed,
    velocity: nextVelocity,
    position: {
      x: kart.position.x + nextVelocity.x * STEP_SECONDS,
      z: kart.position.z + nextVelocity.z * STEP_SECONDS
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

  const movedPlayers = state.players.map(stepKart);
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

import { DEFAULT_KART_HANDLING } from "./model/handling";

export const SERVER_TICK_RATE = 20;
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE;
export const MAX_PLAYERS_PER_ROOM = 6;
export const LAPS_TO_WIN = 3;
export const COUNTDOWN_TICKS = SERVER_TICK_RATE * 3;
export const TRACK_INNER_RADIUS = 16;
export const TRACK_OUTER_RADIUS = 28;
export const KART_RADIUS = 1.2;
export const KART_ACCELERATION = DEFAULT_KART_HANDLING.acceleration;
export const KART_BRAKE = DEFAULT_KART_HANDLING.brake;
export const KART_MAX_FORWARD_SPEED = DEFAULT_KART_HANDLING.maxForwardSpeed;
export const KART_MAX_REVERSE_SPEED = DEFAULT_KART_HANDLING.maxReverseSpeed;
export const KART_TURN_SPEED = DEFAULT_KART_HANDLING.turnSpeed;
export const SPIN_TICKS_ON_BANANA = Math.floor(SERVER_TICK_RATE * 1.2);
export const BANANA_COLLISION_RADIUS = 1.8;

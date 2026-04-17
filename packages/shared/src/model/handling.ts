export type KartHandlingProfile = {
  acceleration: number;
  brake: number;
  reverseAcceleration: number;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  longitudinalDragCoeff: number;
  lateralGripCoeff: number;
  driftLateralGripCoeff: number;
  turnSpeed: number;
  turnRefSpeed: number;
};

export const DEFAULT_KART_HANDLING: KartHandlingProfile = {
  acceleration: 20,
  brake: 40,
  reverseAcceleration: 12,
  maxForwardSpeed: 32,
  maxReverseSpeed: -10,
  longitudinalDragCoeff: 0.25,
  lateralGripCoeff: 15,
  driftLateralGripCoeff: 2,
  turnSpeed: 2.8,
  turnRefSpeed: 4
};

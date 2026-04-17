import { z } from "zod";

export const playerInputSchema = z.object({
  throttle: z.number().min(-1).max(1),
  steer: z.number().min(-1).max(1),
  drift: z.boolean(),
  useItem: z.boolean()
});

export type PlayerInput = z.infer<typeof playerInputSchema>;

export const EMPTY_PLAYER_INPUT: PlayerInput = {
  throttle: 0,
  steer: 0,
  drift: false,
  useItem: false
};

"use client";

/* The stage: film-only knobs the instrument reads through context.
   Default is the product as shipped (speed 1, no board readout). The film
   route provides a faster typewriter and a place for the board to report
   where its nodes sit on screen, so a scripted cursor can find them. */

import { createContext, useContext, type MutableRefObject } from "react";

export interface Stage {
  /* multiplier on every typewriter (TypeLine, AgentFeed) */
  typeSpeed: number;
  /* the board fills this with each node's viewport position, every frame */
  boardScreen?: MutableRefObject<Map<string, { x: number; y: number }>>;
}

export const StageContext = createContext<Stage>({ typeSpeed: 1 });

export function useStage(): Stage {
  return useContext(StageContext);
}

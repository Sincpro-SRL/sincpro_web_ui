"use client";

import { useEffect, useRef } from "react";

/* ==================================================================== *
 *  IDLE — nobody has touched it for a while.
 *
 *  Context: a kiosk is left half-way — two coffees in the order and the person gone — and the
 *  next one finds someone else's order. After `seconds` without a touch, a key or a scroll,
 *  `onIdle` runs once; the next touch starts the count again. Off while `active` is false (on
 *  the attract screen there is nothing to abandon).
 * ==================================================================== */

const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function useIdle(seconds: number, onIdle: () => void, active = true): void {
  /* The latest callback, without restarting the count when the screen re-renders. */
  const callback = useRef(onIdle);
  useEffect(() => {
    callback.current = onIdle;
  });
  useEffect(() => {
    if (!active || seconds <= 0) return;
    let timer = setTimeout(() => callback.current(), seconds * 1000);
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), seconds * 1000);
    };
    for (const name of EVENTS) window.addEventListener(name, restart, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const name of EVENTS) window.removeEventListener(name, restart);
    };
  }, [seconds, active]);
}

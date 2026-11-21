"use client";

import { useCallback, useSyncExternalStore } from "react";

/* ==================================================================== *
 *  THE CLOCK — «now», for what has to be read live: a ticket waiting in the kitchen, a case
 *  under an SLA, «hace 3 min».
 *
 *  Context: forty tickets with forty `setInterval`s re-render forty times a second, out of
 *  step with each other. ONE ticking source per interval is shared by everyone reading it, so
 *  a board re-renders once a second and every timer turns at the same instant.
 *
 *  On the server and during hydration there is no «now» the two sides agree on: it answers
 *  `null`, the piece draws nothing in its place, and the time appears on the first tick —
 *  the same rule as anything only a browser can draw (`RecordGantt`).
 * ==================================================================== */

type Ticker = {
  now: number;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setInterval>;
};

const tickers = new Map<number, Ticker>();

function tickerOf(every: number): Ticker {
  let ticker = tickers.get(every);
  if (ticker === undefined) {
    ticker = { now: Date.now(), listeners: new Set() };
    tickers.set(every, ticker);
  }
  return ticker;
}

function subscribe(every: number, listener: () => void): () => void {
  const ticker = tickerOf(every);
  ticker.listeners.add(listener);
  if (ticker.timer === undefined) {
    /* «now» moves only on a tick: changing it while subscribing would change the snapshot
       React just read, and it would render, resubscribe and change it again, forever. */
    ticker.timer = setInterval(() => {
      ticker.now = Date.now();
      for (const one of ticker.listeners) one();
    }, every);
  }
  return () => {
    ticker.listeners.delete(listener);
    if (ticker.listeners.size === 0 && ticker.timer !== undefined) {
      clearInterval(ticker.timer);
      ticker.timer = undefined;
    }
  };
}

/** The time now, in epoch milliseconds, refreshed every `every` ms (a second by default) — or
 *  `null` on the server and while hydrating. */
export function useNow(every = 1000): number | null {
  /* Stable per interval: a new `subscribe` on every render makes React unsubscribe and
     subscribe again on each one. */
  const listen = useCallback((listener: () => void) => subscribe(every, listener), [every]);
  const read = useCallback(() => tickerOf(every).now, [every]);
  return useSyncExternalStore(listen, read, serverNow);
}

const serverNow = (): null => null;

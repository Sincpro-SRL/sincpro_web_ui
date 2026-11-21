/**
 * THE POINTER — what the person presses with, when the application knows better than the
 * device.
 *
 * Context: the stylesheet sizes every control for a finger under `pointer: coarse`, and that
 * is the browser's answer for the PRIMARY pointer. A till is a touch monitor with a mouse
 * plugged in, a kiosk a touch screen the browser may report as a mouse: there the cashier gets
 * 30 px targets. The application says it instead — `data-pointer` on `<html>` (or on a zone):
 *
 *     touch  sized for a finger, whatever the device reports
 *     fine   sized for a mouse, even on a tablet (a back office driven with a trackpad)
 *     auto   the device decides — the same as writing nothing
 *
 * Pure and without `"use client"`: a server layout writes `<html data-pointer>` itself, so the
 * first paint already has the right sizes.
 */

export type Pointer = "auto" | "touch" | "fine";

export const POINTERS: readonly Pointer[] = ["auto", "touch", "fine"];

/** The attribute the stylesheet reads. */
export const POINTER_ATTRIBUTE = "data-pointer";

/** True for one of the three values — what comes from a setting or a URL is a string. */
export function isPointer(value: unknown): value is Pointer {
  return value === "auto" || value === "touch" || value === "fine";
}

/** The attributes to spread on an element (`<html {...pointerAttributes("touch")}>`): `auto`
 *  writes none, so the device decides. */
export function pointerAttributes(pointer: Pointer): Record<string, string> {
  return pointer === "auto" ? {} : { [POINTER_ATTRIBUTE]: pointer };
}

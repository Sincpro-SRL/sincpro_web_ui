"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { ReactNode } from "react";
import { I18nProvider } from "react-aria-components";

/**
 * The locale React Aria formats with — month names, the order of day/month/year in a date
 * field, the first day of the week — taken from the copy table, the one locale the whole
 * system speaks.
 *
 * Context: React Aria reads the browser's language when nobody tells it. An app installed
 * in Spanish on a browser in English would show a Spanish form with a date field in
 * month/day/year — the one place in the screen that reads in another language, and the
 * one where a wrong order changes the data.
 */
export function AriaLocale({ children }: { children: ReactNode }) {
  const copy = useUiCopy();
  return <I18nProvider locale={copy.locale}>{children}</I18nProvider>;
}

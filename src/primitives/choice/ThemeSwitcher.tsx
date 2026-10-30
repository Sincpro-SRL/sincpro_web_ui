"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { isTheme, useTheme } from "@sincpro/web-ui/foundations/theme";
import { SegmentedControl } from "@sincpro/web-ui/primitives/choice/SegmentedControl";
import { Monitor, Moon, Sun } from "lucide-react";

/**
 * Context: the app's way to let a person pick the palette — a `SegmentedControl` over
 * `useTheme()` and nothing more. System / Light / Dark are always all three: "system" is the
 * default and the only way back from a forced choice, so it is never left out. It writes through
 * the nearest `ThemeProvider` (or straight to `<html>` without one); where the choice is
 * remembered is the app's, via the provider's `onChange`.
 */
export function ThemeSwitcher({ size = "sm" }: { size?: "sm" | "md" }) {
  const copy = useUiCopy().theme;
  const { theme, setTheme } = useTheme();
  return (
    <SegmentedControl
      aria-label={copy.label}
      size={size}
      value={theme}
      onChange={(next) => {
        if (isTheme(next)) setTheme(next);
      }}
      options={[
        { value: "system", label: copy.system, icon: Monitor },
        { value: "light", label: copy.light, icon: Sun },
        { value: "dark", label: copy.dark, icon: Moon },
      ]}
    />
  );
}

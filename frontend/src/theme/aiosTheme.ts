/**
 * AIOS custom theme — Deep Cobalt palette, flat shadows (no claymorphism).
 * Overrides @ledgr/ui lightTheme / darkTheme color + shadow tokens.
 */
import { darkTheme, lightTheme } from "@ledgr/ui";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTheme = any;

/** Override shadow tokens — flat/clean, no clay inset */
const flatShadow = {
  none: "none",
  xs: "0 1px 2px rgba(14,23,38,0.05)",
  sm: "0 2px 6px rgba(14,23,38,0.07), 0 1px 2px rgba(14,23,38,0.04)",
  md: "0 4px 12px rgba(14,23,38,0.09), 0 2px 4px rgba(14,23,38,0.05)",
  lg: "0 12px 24px rgba(14,23,38,0.11), 0 4px 8px rgba(14,23,38,0.06)",
  xl: "0 20px 40px rgba(14,23,38,0.14), 0 8px 16px rgba(14,23,38,0.08)",
  ring: "0 0 0 3px rgba(30,80,208,0.18)",
  // Map clay → flat so no component edits needed
  clay: "0 2px 8px rgba(14,23,38,0.08), 0 1px 3px rgba(14,23,38,0.05)",
  clayActive: "0 1px 4px rgba(14,23,38,0.06)",
  claySunken:
    "inset 0 1px 3px rgba(14,23,38,0.08), inset 0 1px 1px rgba(14,23,38,0.04)",
} as const;

export const aiosLightTheme: AnyTheme = {
  ...lightTheme,
  shadow: flatShadow,
  radii: {
    xs: "6px",
    sm: "8px",
    md: "10px",
    lg: "10px",
    xl: "10px",
    "2xl": "10px",
    full: "9999px",
  },
  typography: {
    ...lightTheme.typography,
    fontFamily: {
      sans: '"DM Sans", sans-serif',
      serif: '"Playfair Display", serif',
      mono: '"DM Sans", monospace',
    },
  },
  color: {
    /* Surfaces — Premium Stone/Off-white from Option 5 */
    background: "#FAFAF9",
    foreground: "#0C0A09",
    card: "#FFFFFF",
    cardForeground: "#0C0A09",
    popover: "#FFFFFF",
    popoverForeground: "#0C0A09",
    muted: "#F5F5F4",
    mutedForeground: "#57534E",

    /* Brand — Premium Black + Gold Accent */
    primary: "#1C1917",
    primaryForeground: "#FAFAF9",
    primaryHover: "#292524",
    accent: "#CA8A04",
    accentForeground: "#FFFFFF",

    /* States */
    destructive: "#DC2626",
    destructiveForeground: "#FFFFFF",
    success: "#16A34A",
    successForeground: "#FFFFFF",
    warning: "#D97706",
    warningForeground: "#0C0A09",
    info: "#0284C7",
    infoForeground: "#FFFFFF",

    /* Lines + focus */
    border: "#E7E5E4",
    input: "#E7E5E4",
    ring: "#CA8A04",
    overlay: "rgba(12, 10, 9, 0.45)",
  },
};

export const aiosDarkTheme: AnyTheme = {
  ...darkTheme,
  shadow: {
    ...flatShadow,
    xs: "0 1px 2px rgba(0,0,0,0.35)",
    sm: "0 2px 6px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.35)",
    md: "0 4px 12px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.40)",
    lg: "0 12px 24px rgba(0,0,0,0.60), 0 4px 8px rgba(0,0,0,0.45)",
    xl: "0 20px 40px rgba(0,0,0,0.65), 0 8px 16px rgba(0,0,0,0.50)",
    ring: "0 0 0 3px rgba(77,130,255,0.25)",
    clay: "0 2px 8px rgba(0,0,0,0.50), 0 1px 3px rgba(0,0,0,0.40)",
    clayActive: "0 1px 4px rgba(0,0,0,0.40)",
    claySunken: "inset 0 1px 3px rgba(0,0,0,0.45)",
  },
  radii: {
    xs: "6px",
    sm: "8px",
    md: "10px",
    lg: "10px",
    xl: "10px",
    "2xl": "10px",
    full: "9999px",
  },
  typography: {
    ...darkTheme.typography,
    fontFamily: {
      sans: '"DM Sans", sans-serif',
      serif: '"Playfair Display", serif',
      mono: '"DM Sans", monospace',
    },
  },
  color: {
    /* Dark complement — rich stone darks with gold preserved */
    background: "#0C0A09",
    foreground: "#FAFAF9",
    card: "#1C1917",
    cardForeground: "#FAFAF9",
    popover: "#1C1917",
    popoverForeground: "#FAFAF9",
    muted: "#292524",
    mutedForeground: "#A8A29E",

    primary: "#FAFAF9",
    primaryForeground: "#0C0A09",
    primaryHover: "#E7E5E4",
    accent: "#CA8A04",
    accentForeground: "#0C0A09",

    destructive: "#F87171",
    destructiveForeground: "#FFFFFF",
    success: "#4ADE80",
    successForeground: "#0C0A09",
    warning: "#FCD34D",
    warningForeground: "#0C0A09",
    info: "#38BDF8",
    infoForeground: "#FFFFFF",

    border: "#44403C",
    input: "#44403C",
    ring: "#CA8A04",
    overlay: "rgba(0, 0, 0, 0.70)",
  },
};

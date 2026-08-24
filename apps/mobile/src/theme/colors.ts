/** Matches `src/app/styles/theme.css` light / dark tokens. */

export type ColorPalette = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  focusRing: string;
  border: string;
  cardBorder: string;
  hoverBg: string;
  danger: string;
  dangerMuted: string;
  success: string;
  successMuted: string;
};

export const lightColors: ColorPalette = {
  background: "#f7f8fa",
  surface: "#ffffff",
  text: "#212529",
  textMuted: "#6b7280",
  primary: "#1fb8cd",
  primaryHover: "#1a92a5",
  primaryMuted: "rgba(31, 184, 205, 0.12)",
  focusRing: "rgba(31, 184, 205, 0.4)",
  border: "rgba(16, 24, 40, 0.1)",
  cardBorder: "rgba(16, 24, 40, 0.04)",
  hoverBg: "#f0f2f4",
  danger: "#dc2626",
  dangerMuted: "#fee2e2",
  success: "#047857",
  successMuted: "#d1fae5",
};

export const darkColors: ColorPalette = {
  background: "#121212",
  surface: "#1e1e1e",
  text: "#ffffff",
  textMuted: "#a0a0a0",
  primary: "#3de0f7",
  primaryHover: "#1fb8cd",
  primaryMuted: "rgba(61, 224, 247, 0.15)",
  focusRing: "rgba(61, 224, 247, 0.4)",
  border: "rgba(255, 255, 255, 0.12)",
  cardBorder: "rgba(255, 255, 255, 0.06)",
  hoverBg: "#2a2a2a",
  danger: "#f87171",
  dangerMuted: "#7f1d1d",
  success: "#34d399",
  successMuted: "#064e3b",
};

/** Default light palette for StyleSheets evaluated at module load. Prefer `useTheme().colors` in UI. */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  lg: 12,
} as const;

/** Matches web Inter usage (`layout.tsx` + `theme.css`). */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const type = {
  logo: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: -0.56, // -0.02em at 28px
    color: "#1fb8cd",
  },
  tagline: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#6b7280",
  },
  hero: {
    fontFamily: fonts.bold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySemi: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
} as const;

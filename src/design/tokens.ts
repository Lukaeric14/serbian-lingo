// Design tokens — Duolingo-clone visual language. See docs/ui-reference.md for the
// screenshots these are lifted from. Every primitive/screen must read from here —
// never inline-duplicate a color, radius, or spacing value (SPEC.md §6).

export const colors = {
  green: "#58CC02",
  greenDark: "#45A302", // 3D-press bottom edge for green buttons
  blue: "#1CB0F6",
  blueDark: "#0091D3",
  orange: "#FF9600", // streak flame
  orangeDark: "#D97F00",
  gold: "#FFC800", // XP
  goldDark: "#E6B200",
  red: "#FF4B4B", // wrong/hard-exercise
  redDark: "#D63333",
  purple: "#CE82FF",
  purpleDark: "#A568CC",

  textDark: "#4B4B4B",
  textMedium: "#777777",
  border: "#E5E5E5",
  borderDark: "#CCCCCC",
  background: "#FFFFFF",
  backgroundGray: "#F7F7F7",

  disabledFill: "#E5E5E5",
  disabledText: "#AFAFAF",

  feedbackCorrectBg: "#D7FFB8",
  feedbackCorrectText: "#58A700",
  feedbackWrongBg: "#FFDFE0",
  feedbackWrongText: "#EA2B2B",
} as const;

export const radii = {
  sm: 8,
  md: 12, // tiles
  lg: 16, // buttons
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Font family names as registered via expo-font (loaded in _layout.tsx).
// Nunito is the closest free match to Duolingo's rounded "Feather Bold" face.
export const fonts = {
  extraBold: "Nunito_800ExtraBold",
  bold: "Nunito_700Bold",
  semiBold: "Nunito_600SemiBold",
  regular: "Nunito_400Regular",
} as const;

export const type = {
  heading: { fontFamily: fonts.extraBold, fontSize: 22 },
  title: { fontFamily: fonts.extraBold, fontSize: 18 },
  button: { fontFamily: fonts.extraBold, fontSize: 15, letterSpacing: 0.5 }, // ALL CAPS in components
  body: { fontFamily: fonts.semiBold, fontSize: 16 },
  caption: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.5 }, // pill labels, ALL CAPS
} as const;

// The "3D press" button treatment: a solid-fill button with a darker bottom
// edge that collapses (translateY + edge height shrink) when pressed.
export const pressDepth = {
  edgeHeight: 4,
  pressedTranslateY: 4,
} as const;

// Single source of truth for screen-level spacing — every screen (src/app/*)
// must wrap its content in these (or the ScreenContainer primitive that reads
// them) rather than inventing its own padding per screen.
export const layout = {
  screenPaddingH: spacing.lg, // 16 — horizontal margin from the device edge
  screenPaddingTop: spacing.lg, // 16 — below the safe area inset, not instead of it
  screenPaddingBottom: spacing.xl, // 24 — extra room above home indicator / bottom bars
  sectionGap: spacing.xl, // 24 — vertical gap between major blocks on a screen
} as const;

// Soft radial-glow presets (native shadow, not a CSS blur) for celebratory/active
// elements — path nodes, badges, streak milestones. iOS renders shadowRadius as
// a genuine soft blur; Android needs elevation as a fallback (flatter, but present).
export const glow = {
  gold: {
    shadowColor: colors.gold,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  green: {
    shadowColor: colors.green,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
} as const;

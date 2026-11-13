// Spacing scale (4px base) + radii + shadows.
// Use these instead of magic numbers in stylesheets.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Shape lock: actions are pills, cards are 16, icon tiles / inputs are 12,
// small chips are 8, sheets are 24. Pair every radius with continuous corners.
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

// One elevation system: cards barely lift, sheets and the splash mark float.
export const shadows = {
  card: {
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.04)",
  },
  elevated: {
    boxShadow: "0px 12px 32px rgba(0, 0, 0, 0.16)",
  },
  primary: {
    boxShadow: "0px 4px 12px rgba(0, 122, 255, 0.24)",
  },
} as const;

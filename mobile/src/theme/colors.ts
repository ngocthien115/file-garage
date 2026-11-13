// Centralized color palette for File Garage.
// Keep all hard-coded colors here so screens/components stay consistent.
//
// Design rules (keep these locked):
// - One accent: iOS system blue. Spend it only on the primary action,
//   active/progress states and links.
// - One grey family: iOS system greys (cool). No warm greys anywhere.
// - Semantic red/green are for outcomes only (error, success), never decoration.

export const colors = {
  // Surfaces (iOS grouped background + elevated cells)
  background: "#F2F2F7",
  card: "#FFFFFF",
  cardShadow: "rgba(0, 0, 0, 0.06)",
  surfaceMuted: "#EFEFF4",
  overlay: "rgba(0, 0, 0, 0.4)",

  // Text (label / secondaryLabel / tertiaryLabel resolved on white)
  text: "#000000",
  textSecondary: "#3C3C43",
  textMuted: "#8A8A8E",
  textSubtle: "#C4C4C6",
  textInverse: "#FFFFFF",

  // Brand — the single accent
  primary: "#007AFF",
  primaryPressed: "#0062CC",
  primaryTint: "#E5F1FF",
  primarySoft: "#B8D9FF",

  // Semantic
  success: "#34C759",
  successTint: "#E3F8E8",
  error: "#FF3B30",
  errorTint: "#FFECEB",
  errorBorder: "#FFC9C5",
  warning: "#FF9500",
  warningTint: "#FFF2E0",

  // Lines / dividers
  border: "#E5E5EA",
  borderStrong: "#C6C6C8",

  // Skeleton shimmer
  skeletonBase: "#E5E5EA",
  skeletonHighlight: "#F2F2F7",
} as const;

export type ColorKey = keyof typeof colors;

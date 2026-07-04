// Centralized color palette for File Garage.
// Keep all hard-coded colors here so screens/components stay consistent.

export const colors = {
  // Surfaces
  background: "#F2F4F7",
  card: "#FFFFFF",
  cardShadow: "rgba(15, 23, 42, 0.06)",

  // Text
  text: "#0F172A",
  textMuted: "#64748B",
  textInverse: "#FFFFFF",

  // Brand
  primary: "#2563EB",
  primaryPressed: "#1D4ED8",
  primaryTint: "#DBEAFE",

  // Semantic
  success: "#16A34A",
  successTint: "#DCFCE7",
  error: "#DC2626",
  errorTint: "#FEE2E2",
  warning: "#D97706",
  warningTint: "#FEF3C7",

  // Lines / dividers
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",

  // Skeleton shimmer
  skeletonBase: "#E5E7EB",
  skeletonHighlight: "#F8FAFC",
} as const;

export type ColorKey = keyof typeof colors;

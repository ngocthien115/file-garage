import React from "react";
import { StyleSheet, View } from "react-native";
import SkeletonCard from "./SkeletonCard";
import { colors, spacing } from "../theme";

const ROWS = [0, 1, 2, 3, 4, 5];

// Placeholder rows shaped like FileListItem so the list does not jump on load.
export default function LoadingScreen() {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel="Loading files"
      accessibilityState={{ busy: true }}
    >
      {ROWS.map((row) => (
        <SkeletonCard key={row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.md,
    gap: spacing.sm + 2,
  },
});

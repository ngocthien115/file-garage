import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

export default function LoadingScreen() {
  return (
    <View style={styles.container} accessibilityState={{ busy: true }}>
      <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading files" />
      <Text style={styles.label}>Loading files…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

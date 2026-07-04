import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { colors, spacing, radii } from "../theme";

// A single shimmering placeholder row matching FileListItem layout.
export default function SkeletonCard() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    // Sweep opacity 0 -> 1 -> 0 forever.
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [shimmer]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + shimmer.value * 0.5,
  }));
  const line1Style = useAnimatedStyle(() => ({
    opacity: 0.4 + shimmer.value * 0.5,
  }));
  const line2Style = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.4,
  }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.iconBlock, iconStyle]} />
      <View style={styles.lines}>
        <Animated.View style={[styles.line, styles.lineWide, line1Style]} />
        <Animated.View style={[styles.line, styles.lineNarrow, line2Style]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
  },
  iconBlock: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.skeletonBase,
  },
  lines: {
    flex: 1,
    gap: spacing.sm,
  },
  line: {
    height: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.skeletonBase,
  },
  lineWide: { width: "70%" },
  lineNarrow: { width: "40%" },
});

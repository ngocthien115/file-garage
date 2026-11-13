import React, { useCallback, useEffect } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { colors, spacing, radii, shadows } from "../theme";

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  const pressed = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 18, stiffness: 120 });
  }, [opacity, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  }, [pressed]);

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry();
  }, [onRetry]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.04 }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.ringOuter}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-offline" size={40} color={colors.error} />
        </View>
      </View>
      <Text style={styles.title}>Can't reach the server</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <AnimatedPressable
        style={[styles.retry, buttonStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleRetry}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={18} color={colors.textInverse} />
        <Text style={styles.retryText}>Try again</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
  },
  ringOuter: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderCurve: "continuous",
    backgroundColor: colors.errorTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderCurve: "continuous",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  retry: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    minHeight: 50,
    borderRadius: radii.pill,
    borderCurve: "continuous",
  },
  retryText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "700",
  },
});

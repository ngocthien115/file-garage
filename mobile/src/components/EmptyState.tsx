import React, { useEffect } from "react";
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

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({
  icon = "cloud-offline-outline",
  title,
  subtitle,
  ctaLabel,
  onCta,
}: EmptyStateProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
  }, [opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleCta = () => {
    if (!onCta) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCta();
  };

  return (
    <Animated.View style={[styles.container, style]}>
      <View style={styles.ringOuter}>
        <View style={styles.ringInner}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={40} color={colors.primary} />
          </View>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onCta ? (
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={handleCta}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
  },
  ringOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderCurve: "continuous",
    backgroundColor: colors.primaryTint,
    opacity: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  ringInner: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderCurve: "continuous",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderCurve: "continuous",
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  cta: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xl,
    minHeight: 50,
    borderRadius: radii.pill,
    borderCurve: "continuous",
  },
  ctaPressed: {
    backgroundColor: colors.primaryPressed,
  },
  ctaText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "700",
  },
});

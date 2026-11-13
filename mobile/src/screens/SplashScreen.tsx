import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { colors, spacing } from "../theme";

void SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_DURATION_MS = 1000;
const FADE_DURATION_MS = 250;

interface SplashScreenComponentProps {
  onFinish: () => void;
}

export default function SplashScreenComponent({
  onFinish,
}: SplashScreenComponentProps) {
  const logoScale = useSharedValue(0.92);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleOffset = useSharedValue(8);
  const rootOpacity = useSharedValue(1);

  useEffect(() => {
    // Entrance: pop the logo in, then fade the title.
    logoScale.value = withSpring(1, { damping: 20, stiffness: 220 });
    logoOpacity.value = withTiming(1, { duration: 300 });
    titleOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));
    titleOffset.value = withDelay(150, withSpring(0, { damping: 16, stiffness: 140 }));

    // Splash timing is independent of the list request running underneath it.
    const fadeTimer = setTimeout(() => {
      rootOpacity.value = withTiming(0, {
        duration: FADE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      });
    }, SPLASH_DURATION_MS - FADE_DURATION_MS);
    const finishTimer = setTimeout(onFinish, SPLASH_DURATION_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(titleOpacity);
      cancelAnimation(titleOffset);
      cancelAnimation(rootOpacity);
    };
  }, [logoScale, logoOpacity, titleOpacity, titleOffset, rootOpacity, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleOffset.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, rootStyle]}
      onLayout={() => { void SplashScreen.hideAsync().catch(() => {}); }}
    >
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Ionicons name="cloud" size={56} color={colors.textInverse} />
      </Animated.View>
      <Animated.Text style={[styles.title, titleStyle]}>
        File Garage
      </Animated.Text>
      <Animated.Text style={[styles.tagline, titleStyle]}>
        Your files, parked safely
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: {
    width: 108,
    height: 108,
    borderRadius: 32,
    borderCurve: "continuous",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    boxShadow: "0px 12px 32px rgba(0, 0, 0, 0.16)",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.36,
  },
  tagline: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

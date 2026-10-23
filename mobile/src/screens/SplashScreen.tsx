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
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const rootOpacity = useSharedValue(1);

  useEffect(() => {
    // Entrance: pop the logo in, then fade the title.
    logoScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    logoOpacity.value = withTiming(1, { duration: 300 });
    titleOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));

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
      cancelAnimation(rootOpacity);
    };
  }, [logoScale, logoOpacity, titleOpacity, rootOpacity, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));

  return (
    <Animated.View
      style={[styles.container, rootStyle]}
      onLayout={() => { void SplashScreen.hideAsync().catch(() => {}); }}
    >
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Ionicons name="cloud" size={64} color={colors.primary} />
      </Animated.View>
      <Animated.Text style={[styles.title, titleStyle]}>
        File Garage
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
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.5,
  },
});

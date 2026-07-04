import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { colors, spacing } from "../theme";
import { getListFiles } from "../api/fileApi";

SplashScreen.preventAutoHideAsync();

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

    async function prepare() {
      try {
        await getListFiles();
      } catch {
        // ignore errors during splash — list screen will surface them.
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 900));
        await SplashScreen.hideAsync();
        // Exit: fade the whole splash out, then notify parent.
        rootOpacity.value = withTiming(
          0,
          { duration: 350, easing: Easing.inOut(Easing.ease) },
          (finished) => {
            if (finished) runOnJS(onFinish)();
          },
        );
      }
    }
    prepare();
  }, [logoScale, logoOpacity, titleOpacity, rootOpacity, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));

  return (
    <Animated.View style={[styles.container, rootStyle]}>
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

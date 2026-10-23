import React, { useState, useCallback } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import SplashScreenComponent from "./src/screens/SplashScreen";
import FileListScreen from "./src/screens/FileListScreen";
import { colors } from "./src/theme";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Load the list in parallel; the splash finishes on its own timer. */}
      <FileListScreen />
      {showSplash ? (
        <SplashScreenComponent onFinish={handleSplashFinish} />
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

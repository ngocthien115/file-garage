import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import SplashScreenComponent from './src/screens/SplashScreen';
import FileListScreen from './src/screens/FileListScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreenComponent onFinish={handleSplashFinish} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FileListScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

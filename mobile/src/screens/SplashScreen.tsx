import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { getListFiles } from '../api/fileApi';

SplashScreen.preventAutoHideAsync();

export default function SplashScreenComponent({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    async function prepare() {
      try {
        await getListFiles();
      } catch {
        // ignore errors during splash
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await SplashScreen.hideAsync();
        onFinish();
      }
    }
    prepare();
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>File Garage</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
});

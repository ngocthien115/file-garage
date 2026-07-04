import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
  Linking,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useFiles } from "../hooks/useFiles";
import { FileItem } from "../types/FileItem";
import { uploadFile } from "../api/fileApi";
import FileListItem from "../components/FileListItem";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { colors, spacing, radii, shadows } from "../theme";

const SKELETON_COUNT = 6;

export default function FileListScreen() {
  const { state, loadFiles } = useFiles();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        await uploadFile({
          uri: result.assets[0].uri,
          name: result.assets[0].name,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadFiles();
      }
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Upload failed",
        "Could not upload the selected file. Please try again.",
      );
    }
  };

  const openFile = (url: string) => {
    Linking.openURL(url);
  };

  const renderContent = () => {
    if (state.type === "loading") {
      return (
        <View style={styles.listContent}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      );
    }

    if (state.type === "error") {
      return <ErrorState message={state.message} onRetry={loadFiles} />;
    }

    const files = state.files;

    if (files.length === 0) {
      return (
        <EmptyState
          icon="cloud-upload-outline"
          title="No files yet"
          subtitle="Upload your first file to get started."
          ctaLabel="Upload a file"
          onCta={handlePickFile}
        />
      );
    }

    return (
      <FlatList
        data={files}
        keyExtractor={(item, index) => `${item.fileName}-${index}`}
        renderItem={({ item, index }: { item: FileItem; index: number }) => (
          <FileListItem
            file={item}
            onPress={() => openFile(item.url)}
            index={index}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
      <SafeAreaView style={styles.headerSafe}>
        <Header onPickFile={handlePickFile} onRefresh={loadFiles} />
      </SafeAreaView>
      <View style={styles.body}>{renderContent()}</View>
    </View>
  );
}

interface HeaderProps {
  onPickFile: () => void;
  onRefresh: () => void;
}

function Header({ onPickFile, onRefresh }: HeaderProps) {
  const refreshRotation = useSharedValue(0);
  const uploadPressed = useSharedValue(0);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refreshRotation.value = withSequence(
      withTiming(360, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      // reset to 0 instantly so next spin starts fresh
      withTiming(0, { duration: 0 }),
    );
    onRefresh();
  }, [refreshRotation, onRefresh]);

  const handleUploadPressIn = useCallback(() => {
    uploadPressed.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [uploadPressed]);

  const handleUploadPressOut = useCallback(() => {
    uploadPressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  }, [uploadPressed]);

  const handleUpload = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPickFile();
  }, [onPickFile]);

  const refreshStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  const uploadStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - uploadPressed.value * 0.1 }],
  }));

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <Ionicons name="cloud" size={20} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>File Garage</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          style={styles.iconButton}
          onPress={handleRefresh}
          hitSlop={8}
        >
          <Animated.View style={refreshStyle}>
            <Ionicons name="refresh" size={22} color={colors.text} />
          </Animated.View>
        </Pressable>
        <AnimatedPressable
          style={[styles.uploadButton, uploadStyle]}
          onPressIn={handleUploadPressIn}
          onPressOut={handleUploadPressOut}
          onPress={handleUpload}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={20}
            color={colors.textInverse}
          />
          <Text style={styles.uploadLabel}>Upload</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSafe: {
    backgroundColor: colors.card,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    ...shadows.card,
  },
  uploadLabel: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
  },
});

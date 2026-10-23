import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
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
} from "react-native-reanimated";
import { useFiles } from "../hooks/useFiles";
import { useServerSettings } from "../hooks/useServerSettings";
import ApiSettingsModal from "../components/ApiSettingsModal";
import FileListItem from "../components/FileListItem";
import LoadingScreen from "../components/LoadingScreen";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { colors, spacing, radii, shadows } from "../theme";

export default function FileListScreen() {
  const settings = useServerSettings();
  const { state, loadFiles, startUpload, retryUpload } = useFiles(settings.ready ? settings.baseURL : undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const pickerOpen = useRef(false);
  const showListLoading = state.loading && !refreshing && (state.files.length === 0 || reloading);

  useEffect(() => {
    setRefreshing(false);
    setReloading(false);
  }, [settings.baseURL]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFiles();
    } finally {
      setRefreshing(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      await loadFiles();
    } finally {
      setReloading(false);
    }
  };

  const handlePickFile = async () => {
    if (!settings.ready || pickerOpen.current) return;
    pickerOpen.current = true;
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        // Android grants access to the original content URI. In Expo Go,
        // the picker's shared cache can be outside FileSystem's app sandbox.
        copyToCacheDirectory: Platform.OS !== "android",
      });
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Could not select file",
        "Please try selecting the file again.",
      );
      return;
    } finally {
      pickerOpen.current = false;
    }
    if (!result.canceled) {
      // Show the new upload row immediately, even if a list request is pending.
      setReloading(false);
      const success = await startUpload(result.assets[0]);
      Haptics.notificationAsync(
        success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    }
  };

  const handleRetry = async (id: string) => {
    const success = await retryUpload(id);
    if (success === undefined) return;
    Haptics.notificationAsync(
      success
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  };

  const openFile = (url: string) => {
    Linking.openURL(url);
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  const renderContent = () => {
    const files = state.files;
    if (files.length === 0 && state.loading && !refreshing) {
      return null;
    }

    if (files.length === 0) {
      return (
        <ScrollView
          contentContainerStyle={styles.emptyListContent}
          refreshControl={refreshControl}
          alwaysBounceVertical
        >
          {state.error ? (
            <ErrorState message={state.error} onRetry={handleReload} />
          ) : (
            <EmptyState
              icon="cloud-upload-outline"
              title="No files yet"
              subtitle="Upload your first file to get started."
              ctaLabel="Upload a file"
              onCta={handlePickFile}
            />
          )}
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FileListItem
            file={item}
            onPress={() => {
              if (item.status === "ready" && item.url) openFile(item.url);
            }}
            onRetry={() => {
              void handleRetry(item.id);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          state.error ? (
            <Pressable
              onPress={handleReload}
              style={styles.refreshError}
              accessibilityRole="button"
            >
              <Text style={styles.refreshErrorText}>
                Could not refresh files. Tap to retry.
              </Text>
            </Pressable>
          ) : undefined
        }
        refreshControl={refreshControl}
        alwaysBounceVertical
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.headerSafe}>
        <Header onPickFile={handlePickFile} uploadDisabled={!settings.ready} />
        <Pressable
          style={styles.serverButton}
          onPress={() => setSettingsVisible(true)}
          disabled={!settings.ready}
          accessibilityRole="button"
          accessibilityLabel={`API server settings. Current server: ${settings.baseURL}`}
        >
          <Ionicons name="server-outline" size={16} color={colors.textMuted} />
          <Text style={styles.serverURL} numberOfLines={1} ellipsizeMode="middle">
            {settings.ready ? settings.baseURL : "Loading server settings…"}
          </Text>
          <Ionicons name="options-outline" size={18} color={colors.primary} />
        </Pressable>
      </SafeAreaView>
      <View style={styles.body}>
        <View
          style={styles.body}
          pointerEvents={showListLoading ? "none" : "auto"}
          accessibilityElementsHidden={showListLoading}
          importantForAccessibility={showListLoading ? "no-hide-descendants" : "auto"}
        >
          {renderContent()}
        </View>
        {showListLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingScreen />
          </View>
        )}
      </View>
      {settingsVisible && (
        <ApiSettingsModal
          baseURL={settings.baseURL}
          recentURLs={settings.recentURLs}
          uploading={state.files.some((file) => file.status === "uploading" || file.status === "saving")}
          onClose={() => setSettingsVisible(false)}
        />
      )}
    </View>
  );
}

interface HeaderProps {
  onPickFile: () => void;
  uploadDisabled: boolean;
}

function Header({ onPickFile, uploadDisabled }: HeaderProps) {
  const uploadPressed = useSharedValue(0);

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
        <AnimatedPressable
          style={[styles.uploadButton, uploadStyle]}
          disabled={uploadDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: uploadDisabled }}
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
  serverButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  serverURL: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  refreshError: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.errorTint,
  },
  refreshErrorText: {
    color: colors.error,
    fontSize: 13,
  },
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});

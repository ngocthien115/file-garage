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
              subtitle="Files you upload are listed here. Tap a file to open it."
              ctaLabel="Upload"
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
              style={({ pressed }) => [styles.refreshError, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="cloud-offline-outline" size={18} color={colors.error} />
              <Text style={styles.refreshErrorText}>
                Could not refresh files.
              </Text>
              <Text style={styles.refreshErrorAction}>Retry</Text>
            </Pressable>
          ) : undefined
        }
        refreshControl={refreshControl}
        alwaysBounceVertical
      />
    );
  };

  const readyCount = state.files.filter((file) => file.status === "ready").length;
  const activeCount = state.files.filter(
    (file) => file.status === "uploading" || file.status === "saving",
  ).length;
  const host = settings.baseURL.replace(/^[a-z]+:\/\//i, "").replace(/\/$/, "");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.headerSafe}>
        <Header
          onPickFile={handlePickFile}
          uploadDisabled={!settings.ready}
          fileCount={readyCount}
          activeCount={activeCount}
          loading={state.loading && state.files.length === 0}
        />
        <Pressable
          style={({ pressed }) => [styles.serverButton, pressed && styles.pressed]}
          onPress={() => setSettingsVisible(true)}
          disabled={!settings.ready}
          accessibilityRole="button"
          accessibilityLabel={`API server settings. Current server: ${settings.baseURL}`}
        >
          <View
            style={[
              styles.serverDot,
              { backgroundColor: !settings.ready || state.loading ? colors.warning : state.error ? colors.error : colors.success },
            ]}
          />
          <Text style={styles.serverLabel}>Server</Text>
          <Text style={styles.serverURL} numberOfLines={1} ellipsizeMode="middle">
            {settings.ready ? host : "Loading…"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
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
  fileCount: number;
  activeCount: number;
  loading: boolean;
}

function Header({ onPickFile, uploadDisabled, fileCount, activeCount, loading }: HeaderProps) {
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
    transform: [{ scale: 1 - uploadPressed.value * 0.06 }],
  }));

  const subtitle = loading
    ? "Fetching your files…"
    : activeCount > 0
      ? `${fileCount} ${fileCount === 1 ? "file" : "files"} · ${activeCount} uploading`
      : `${fileCount} ${fileCount === 1 ? "file" : "files"} stored`;

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <Ionicons name="cloud" size={17} color={colors.textInverse} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.headerTitle} numberOfLines={1}>File Garage</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
      <AnimatedPressable
        style={[styles.uploadButton, uploadDisabled && styles.disabled, uploadStyle]}
        disabled={uploadDisabled}
        accessibilityRole="button"
        accessibilityLabel="Upload a file"
        accessibilityState={{ disabled: uploadDisabled }}
        onPressIn={handleUploadPressIn}
        onPressOut={handleUploadPressOut}
        onPress={handleUpload}
        hitSlop={6}
      >
        <Ionicons name="add" size={18} color={colors.textInverse} />
        <Text style={styles.uploadLabel}>Upload</Text>
      </AnimatedPressable>
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
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
  },
  brand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm + 2,
    borderCurve: "continuous",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.38,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
    backgroundColor: colors.primary,
    minHeight: 36,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.md + 2,
    borderRadius: radii.pill,
    borderCurve: "continuous",
  },
  uploadLabel: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  serverButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    marginHorizontal: spacing.lg + 4,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.md,
    borderCurve: "continuous",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderCurve: "continuous",
  },
  serverLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  serverURL: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  refreshError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    minHeight: 48,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    borderCurve: "continuous",
    backgroundColor: colors.errorTint,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  refreshErrorText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: "500",
  },
  refreshErrorAction: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "700",
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
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});

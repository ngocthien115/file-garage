import React, { useCallback, useRef } from "react";
import { ActivityIndicator, StyleSheet, Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, spacing, radii, shadows } from "../theme";
import type { FileListEntry } from "../types/FileItem";

type FileKind =
  | "pdf"
  | "image"
  | "archive"
  | "doc"
  | "video"
  | "audio"
  | "default";

interface KindConfig {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tint: string;
  fg: string;
}

const KIND_CONFIG: Record<FileKind, KindConfig> = {
  pdf: { icon: "document-text-outline", tint: "#FEE2E2", fg: "#DC2626" },
  image: { icon: "image-outline", tint: "#DCFCE7", fg: "#16A34A" },
  archive: { icon: "archive-outline", tint: "#FEF3C7", fg: "#D97706" },
  doc: { icon: "document-outline", tint: "#DBEAFE", fg: "#2563EB" },
  video: { icon: "film-outline", tint: "#FCE7F3", fg: "#DB2777" },
  audio: { icon: "musical-notes-outline", tint: "#EDE9FE", fg: "#7C3AED" },
  default: { icon: "document-outline", tint: "#E2E8F0", fg: "#64748B" },
};

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "heic"];
const ARCHIVE_EXT = ["zip", "rar", "7z", "tar", "gz", "bz2"];
const VIDEO_EXT = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];
const AUDIO_EXT = ["mp3", "wav", "flac", "aac", "ogg", "m4a"];
const DOC_EXT = [
  "doc",
  "docx",
  "txt",
  "md",
  "rtf",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
];

function inferKind(fileName: string): FileKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXT.includes(ext)) return "image";
  if (ARCHIVE_EXT.includes(ext)) return "archive";
  if (VIDEO_EXT.includes(ext)) return "video";
  if (AUDIO_EXT.includes(ext)) return "audio";
  if (DOC_EXT.includes(ext)) return "doc";
  return "default";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FileListItemProps {
  file: FileListEntry;
  onPress: () => void;
  onRetry: () => void;
}

export default function FileListItem({
  file,
  onPress,
  onRetry,
}: FileListItemProps) {
  const kind = inferKind(file.fileName);
  const cfg = KIND_CONFIG[kind];
  const busy = file.status === "uploading" || file.status === "saving";
  const canOpen = file.status === "ready" && !!file.url;
  const animateEntrance = useRef(file.local && file.status === "uploading").current;

  const pressed = useSharedValue(0);
  const entered = useSharedValue(animateEntrance ? 0 : 1);

  // Fetched rows appear immediately; new upload rows keep their entrance motion.
  React.useEffect(() => {
    if (animateEntrance) entered.value = withTiming(1, { duration: 280 });
  }, [animateEntrance, entered]);

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (!canOpen) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [canOpen, onPress]);

  const pressStyle = useAnimatedStyle(() => {
    const scale = 1 - pressed.value * 0.03;
    return { transform: [{ scale }] };
  });

  const enterStyle = useAnimatedStyle(() => {
    const opacity = entered.value;
    const translateY = (1 - entered.value) * 12;
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View style={[enterStyle, { marginBottom: spacing.sm }]}>
      <AnimatedPressable
        style={[styles.card, pressStyle]}
        disabled={!canOpen}
        accessibilityRole="button"
        accessibilityLabel={file.fileName}
        accessibilityState={{ disabled: !canOpen, busy }}
        onPressIn={canOpen ? handlePressIn : undefined}
        onPressOut={canOpen ? handlePressOut : undefined}
        onPress={handlePress}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.tint }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.fg} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {file.fileName}
          </Text>
          {file.status !== "ready" && (
            <Text
              style={[styles.status, file.status === "error" && styles.error]}
              numberOfLines={2}
              accessibilityLiveRegion="polite"
            >
              {file.status === "error"
                ? `Upload failed. ${file.error ?? "Please try again."}`
                : file.status === "saving" ? "Finishing upload…" : "Uploading…"}
            </Text>
          )}
        </View>
        {file.status !== "error" && (
          <View style={styles.indicator}>
            {busy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </View>
        )}
      </AnimatedPressable>
      {file.status === "error" && (
        <Pressable
          onPress={onRetry}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel={`Retry uploading ${file.fileName}`}
        >
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
    ...shadows.card,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  indicator: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  status: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.error,
  },
  retry: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    minHeight: 44,
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
});

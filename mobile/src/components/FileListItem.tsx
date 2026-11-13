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
  pdf: { icon: "document-text", tint: "#FFE4E6", fg: "#E11D48" },
  image: { icon: "image", tint: "#D1FAE5", fg: "#059669" },
  archive: { icon: "archive", tint: "#FEF3C7", fg: "#D97706" },
  doc: { icon: "document", tint: "#DBEAFE", fg: "#2563EB" },
  video: { icon: "film", tint: "#FCE7F3", fg: "#DB2777" },
  audio: { icon: "musical-notes", tint: "#EDE9FE", fg: "#7C3AED" },
  default: { icon: "document", tint: "#EEF0F6", fg: "#6B7280" },
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

function extension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function inferKind(fileName: string): FileKind {
  const ext = extension(fileName);
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
    const scale = 1 - pressed.value * 0.03; // 0.97 on press
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

  const ext = extension(file.fileName);
  const host = file.url?.match(/^[a-z]+:\/\/([^/?#]+)/i)?.[1];
  const meta =
    file.status === "error"
      ? `Upload failed · ${file.error ?? "Please try again."}`
      : file.status === "saving"
        ? "Finishing upload…"
        : file.status === "uploading"
          ? "Uploading…"
          : [ext ? ext.toUpperCase() : "FILE", host].filter(Boolean).join(" · ");

  return (
    <Animated.View style={[styles.wrapper, enterStyle]}>
      <AnimatedPressable
        style={[
          styles.card,
          busy && styles.cardBusy,
          file.status === "error" && styles.cardError,
          pressStyle,
        ]}
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
          <Text
            style={[
              styles.meta,
              busy && styles.metaBusy,
              file.status === "error" && styles.metaError,
            ]}
            numberOfLines={file.status === "error" ? 2 : 1}
            accessibilityLiveRegion={file.status === "ready" ? undefined : "polite"}
          >
            {meta}
          </Text>
        </View>
        {file.status !== "error" && (
          <View style={styles.indicator}>
            {busy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
            )}
          </View>
        )}
      </AnimatedPressable>
      {file.status === "error" && (
        <View style={styles.retrySlot} pointerEvents="box-none">
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Retry uploading ${file.fileName}`}
          >
            <Ionicons name="refresh" size={14} color={colors.error} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm + 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  cardBusy: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryTint,
  },
  cardError: {
    borderColor: colors.errorBorder,
    // Leave room for the Retry pill that sits over the right edge.
    paddingRight: 96,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.1,
  },
  meta: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  metaBusy: {
    color: colors.primary,
  },
  metaError: {
    color: colors.error,
    letterSpacing: 0,
  },
  indicator: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  retrySlot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: spacing.md,
    justifyContent: "center",
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 34,
    borderRadius: radii.pill,
    borderCurve: "continuous",
    backgroundColor: colors.errorTint,
  },
  retryPressed: {
    opacity: 0.7,
  },
  retryText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "700",
  },
});

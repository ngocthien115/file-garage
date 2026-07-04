import React, { useCallback } from "react";
import { StyleSheet, Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, spacing, radii, shadows } from "../theme";
import type { FileItem } from "../types/FileItem";

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
  file: FileItem;
  onPress: () => void;
  /** Index in the list, used for staggered entrance animation. */
  index?: number;
}

export default function FileListItem({
  file,
  onPress,
  index = 0,
}: FileListItemProps) {
  const kind = inferKind(file.fileName);
  const cfg = KIND_CONFIG[kind];

  const pressed = useSharedValue(0);
  const entered = useSharedValue(0);

  // Entrance: start at 0, animate to 1 on mount.
  React.useEffect(() => {
    entered.value = withTiming(1, { duration: 280 });
  }, [entered]);

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  }, [pressed]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.tint }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.fg} />
        </View>
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
          {file.fileName}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </AnimatedPressable>
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
});

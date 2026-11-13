import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { saveServerBaseURL } from "../api/serverSettings";
import { colors, radii, spacing } from "../theme";

interface Props {
  baseURL: string;
  recentURLs: string[];
  uploading: boolean;
  onClose: () => void;
}

export default function ApiSettingsModal({ baseURL, recentURLs, uploading, onClose }: Props) {
  const [draft, setDraft] = useState(baseURL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const savingRef = useRef(false);

  const save = async () => {
    if (uploading || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    try {
      await saveServerBaseURL(draft);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the server URL. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const close = () => { if (!savingRef.current) onClose(); };

  const busy = saving || uploading;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === "android" ? "height" : undefined}
      >
        <View style={styles.navBar} accessibilityViewIsModal>
          <Pressable
            onPress={close}
            disabled={saving}
            hitSlop={8}
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.navTitle} accessibilityRole="header">Server</Text>
          <Pressable
            onPress={() => { void save(); }}
            disabled={busy}
            hitSlop={8}
            style={({ pressed }) => [styles.navButton, styles.navButtonEnd, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Save server URL"
            accessibilityState={{ disabled: busy, busy: saving }}
          >
            {saving ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={[styles.saveText, uploading && styles.disabledText]}>Save</Text>
            )}
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
        >
          <Text style={styles.sectionLabel}>Base URL</Text>
          <View style={[styles.group, error ? styles.groupError : undefined]}>
            <View style={styles.inputRow}>
              <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
              <TextInput
                value={draft}
                onChangeText={(value) => { setDraft(value); setError(undefined); }}
                style={styles.input}
                placeholder="https://example.com/"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                clearButtonMode="while-editing"
                onSubmitEditing={() => { void save(); }}
                editable={!saving}
                accessibilityLabel="API base URL"
              />
            </View>
          </View>
          {error ? (
            <View style={styles.footerRow}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.footer, styles.errorText]} accessibilityRole="alert">{error}</Text>
            </View>
          ) : uploading ? (
            <View style={styles.footerRow}>
              <Ionicons name="time-outline" size={14} color={colors.warning} />
              <Text style={styles.footer}>Finish the current uploads before changing server.</Text>
            </View>
          ) : (
            <Text style={[styles.footer, styles.footerPlain]}>
              Files are listed from and saved to this server.
            </Text>
          )}

          {recentURLs.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Recent servers</Text>
              <View style={styles.group}>
                {recentURLs.map((url, index) => {
                  const selected = draft === url;
                  return (
                    <Pressable
                      key={url}
                      style={({ pressed }) => [styles.serverRow, pressed && styles.rowPressed]}
                      onPress={() => { setDraft(url); setError(undefined); }}
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${url}`}
                      accessibilityState={{ selected, disabled: saving }}
                    >
                      <View style={[styles.serverRowInner, index > 0 && styles.separator]}>
                        <View style={styles.serverText}>
                          <Text style={styles.serverURL} numberOfLines={1} ellipsizeMode="middle">
                            {url.replace(/^[a-z]+:\/\//i, "").replace(/\/$/, "")}
                          </Text>
                          <Text style={styles.serverMeta} numberOfLines={1}>
                            {url.startsWith("https://") ? "Secure" : "Not secure"}
                            {url === baseURL ? " · Current" : ""}
                          </Text>
                        </View>
                        {selected ? (
                          <Ionicons name="checkmark" size={20} color={colors.primary} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  navButton: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: "center",
  },
  navButtonEnd: {
    alignItems: "flex-end",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  cancelText: {
    fontSize: 17,
    color: colors.primary,
  },
  saveText: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.primary,
  },
  disabledText: {
    color: colors.textSubtle,
  },
  pressed: {
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  group: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  groupError: {
    borderColor: colors.error,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontSize: 17,
    color: colors.text,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  footer: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  footerPlain: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.error,
  },
  serverRow: {
    paddingLeft: spacing.lg,
    backgroundColor: colors.card,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  serverRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingRight: spacing.lg,
    paddingVertical: spacing.sm,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  serverText: {
    flex: 1,
    minWidth: 0,
  },
  serverURL: {
    fontSize: 17,
    color: colors.text,
  },
  serverMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});

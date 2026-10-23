import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { saveServerBaseURL } from "../api/serverSettings";
import { colors, radii, shadows, spacing } from "../theme";

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

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close server settings" />
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.title}>API server</Text>
            <Text style={styles.description}>Choose the server used to load and save your files.</Text>
            <Text style={styles.label}>Base URL</Text>
            <TextInput
              value={draft}
              onChangeText={(value) => { setDraft(value); setError(undefined); }}
              style={[styles.input, error ? styles.inputError : undefined]}
              placeholder="https://example.com/"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={() => { void save(); }}
              editable={!saving}
              accessibilityLabel="API base URL"
            />
            {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
            {uploading && <Text style={styles.description}>Finish the current uploads before changing server.</Text>}
            <Text style={styles.label}>Quick switch</Text>
            {recentURLs.map((url) => (
              <Pressable
                key={url}
                style={[styles.server, draft === url && styles.selectedServer]}
                onPress={() => { setDraft(url); setError(undefined); }}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={`Use ${url}`}
                accessibilityState={{ selected: draft === url, disabled: saving }}
              >
                <Text style={styles.serverURL} numberOfLines={1} ellipsizeMode="middle">{url}</Text>
                {url === baseURL && <Text style={styles.current}>Current</Text>}
              </Pressable>
            ))}
            <View style={styles.actions}>
              <Pressable onPress={close} disabled={saving} style={styles.cancel} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { void save(); }}
                disabled={saving || uploading}
                style={[styles.save, (saving || uploading) && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Save server URL"
                accessibilityState={{ disabled: saving || uploading, busy: saving }}
              >
                {saving ? <ActivityIndicator color={colors.textInverse} size="small" /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  backdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(15, 23, 42, 0.4)" },
  card: { width: "100%", maxWidth: 480, maxHeight: "90%", borderRadius: radii.lg, backgroundColor: colors.card, overflow: "hidden", ...shadows.elevated },
  content: { padding: spacing.xl },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  description: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  input: { minHeight: 48, padding: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, fontSize: 14, color: colors.text },
  inputError: { borderColor: colors.error },
  error: { fontSize: 12, lineHeight: 18, color: colors.error, marginTop: spacing.sm },
  server: { flexDirection: "row", alignItems: "center", minHeight: 44, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, marginBottom: spacing.sm, gap: spacing.sm },
  selectedServer: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  serverURL: { flex: 1, fontSize: 13, color: colors.text },
  current: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.lg },
  cancel: { minHeight: 44, paddingHorizontal: spacing.lg, justifyContent: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  save: { minWidth: 88, minHeight: 44, paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderRadius: radii.sm },
  saveText: { fontSize: 14, fontWeight: "600", color: colors.textInverse },
  disabled: { opacity: 0.5 },
});

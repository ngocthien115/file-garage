import type { DocumentPickerAsset } from "expo-document-picker";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { Platform } from "react-native";

export type UploadFile = Pick<
  DocumentPickerAsset,
  "name" | "uri" | "mimeType" | "file"
>;

export async function uploadToStorage(file: UploadFile): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    if (!file.file) {
      throw new Error("The selected file could not be read. Please select it again.");
    }
    formData.append("file", file.file);
  } else {
    const nativeFile = new File(file.uri);
    const nativePart = {
      name: file.name,
      type: file.mimeType || "application/octet-stream",
      bytes: () => nativeFile.bytes(),
    };
    // Expo's encoder accepts byte-readable parts beyond the DOM Blob typings.
    // Avoid constructing a Blob from typed arrays, which React Native rejects.
    formData.append("file", nativePart as unknown as Blob);
  }

  // Keep binary uploads separate from the JSON API client.
  const response = await fetch("https://temp.sh/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Storage upload failed (HTTP ${response.status}).`);
  }

  const url = (await response.text()).trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Storage did not return a valid file link.");
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Storage did not return a valid file link.");
  }

  return url;
}

import { useState, useCallback, useEffect } from "react";
import { getListFiles } from "../api/fileApi";
import { FileItem } from "../types/FileItem";

type UiState =
  | { type: "loading" }
  | { type: "success"; files: FileItem[] }
  | { type: "error"; message: string };

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function useFiles() {
  const [state, setState] = useState<UiState>({ type: "loading" });
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");

  const loadFiles = useCallback(async () => {
    // Only show the full-screen loading state on the very first load;
    // subsequent refreshes keep the existing list visible (pull-to-refresh
    // already shows its own spinner).
    setState((prev) => (prev.type === "success" ? prev : { type: "loading" }));
    try {
      const files = await getListFiles();
      setState({ type: "success", files });
    } catch (e: any) {
      setState({ type: "error", message: e?.message || "Unknown error" });
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return { state, loadFiles, uploadStatus, setUploadStatus };
}

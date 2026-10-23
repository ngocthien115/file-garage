export interface FileItem {
  fileName: string;
  url: string;
}

export type FileStatus = "uploading" | "saving" | "ready" | "error";

export interface FileListEntry {
  id: string;
  fileName: string;
  url?: string;
  status: FileStatus;
  error?: string;
  /** Keep local entries until a successful list response includes them. */
  local: boolean;
}

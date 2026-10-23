import type { FileItem, FileListEntry } from "../types/FileItem";

export interface FileListState {
  files: FileListEntry[];
  loading: boolean;
  error?: string;
}

export const initialFileListState: FileListState = { files: [], loading: true };

type Action =
  | { type: "reset" }
  | { type: "load-start" }
  | { type: "load-success"; files: FileItem[] }
  | { type: "load-error"; error: string }
  | { type: "add"; file: FileListEntry }
  | { type: "update"; id: string; changes: Partial<FileListEntry> };

function identity(file: { fileName: string; url?: string }) {
  return JSON.stringify([file.fileName, file.url]);
}

// Match one server record per row, including when two files have the same name.
// Preserve row IDs and order so refreshes do not restart entrance animations.
function reconcile(current: FileListEntry[], incoming: FileItem[]): FileListEntry[] {
  const counts = new Map<string, number>();
  const remaining = incoming.map((file): FileListEntry => {
    const key = identity(file);
    const occurrence = counts.get(key) ?? 0;
    counts.set(key, occurrence + 1);
    return { ...file, id: `server:${key}:${occurrence}`, status: "ready", local: false };
  });
  const result: FileListEntry[] = [];
  for (const row of current) {
    let match = remaining.findIndex((file) => file.id === row.id);
    if (match < 0) match = remaining.findIndex((file) => identity(file) === identity(row));
    if (match >= 0) {
      remaining.splice(match, 1);
      // A GET can observe the insert before the POST response arrives.
      // Keep that row locked until its own upload operation confirms success.
      result.push({ ...row, local: row.status === "ready" ? false : row.local });
    } else if (row.local) {
      result.push(row);
    }
  }
  const usedIds = new Set(result.map((row) => row.id));
  for (const row of remaining) {
    const baseId = row.id;
    let suffix = 1;
    while (usedIds.has(row.id)) row.id = `${baseId}:${suffix++}`;
    usedIds.add(row.id);
  }
  return [...result, ...remaining];
}

export function fileListReducer(state: FileListState, action: Action): FileListState {
  switch (action.type) {
    case "reset":
      return initialFileListState;
    case "load-start":
      return { ...state, loading: true, error: undefined };
    case "load-success":
      return { files: reconcile(state.files, action.files), loading: false };
    case "load-error":
      return { ...state, loading: false, error: action.error };
    case "add":
      return { ...state, files: [action.file, ...state.files] };
    case "update":
      return {
        ...state,
        files: state.files.map((file) => file.id === action.id ? { ...file, ...action.changes } : file),
      };
  }
}

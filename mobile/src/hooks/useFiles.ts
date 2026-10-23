import { useReducer, useCallback, useEffect, useRef } from "react";
import { getListFiles, uploadFile } from "../api/fileApi";
import type { UploadFile } from "../api/storageApi";
import type { FileListEntry } from "../types/FileItem";
import { fileListReducer, initialFileListState } from "./fileListState";

interface UploadJob {
  file: UploadFile;
  baseURL: string;
  url?: string;
  running: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

export function useFiles(baseURL?: string) {
  const [state, dispatch] = useReducer(fileListReducer, initialFileListState);
  const jobs = useRef(new Map<string, UploadJob>());
  const nextId = useRef(0);
  const listRequest = useRef(0);
  const mounted = useRef(true);
  const currentServer = useRef(baseURL);
  currentServer.current = baseURL;

  const loadFiles = useCallback(async () => {
    if (!baseURL) return;
    const request = ++listRequest.current;
    dispatch({ type: "load-start" });
    try {
      const files = await getListFiles(baseURL);
      if (mounted.current && currentServer.current === baseURL && request === listRequest.current) {
        dispatch({ type: "load-success", files });
      }
    } catch (error) {
      if (mounted.current && currentServer.current === baseURL && request === listRequest.current) {
        dispatch({ type: "load-error", error: errorMessage(error) });
      }
    }
  }, [baseURL]);

  const runUpload = useCallback(async (id: string): Promise<boolean | undefined> => {
    const job = jobs.current.get(id);
    // Lock synchronously so double-tapping Retry cannot submit two requests.
    if (!job || job.running) return;
    job.running = true;
    const update = (changes: Partial<FileListEntry>) => {
      if (mounted.current && currentServer.current === job.baseURL && jobs.current.get(id) === job) {
        dispatch({ type: "update", id, changes });
      }
    };
    dispatch({ type: "update", id, changes: { status: job.url ? "saving" : "uploading", error: undefined } });
    try {
      const item = await uploadFile(job.file, {
        baseURL: job.baseURL,
        storedUrl: job.url,
        onStored: (url) => {
          job.url = url;
          update({ url, status: "saving" });
        },
      });
      update({ ...item, status: "ready" });
      jobs.current.delete(id);
      return true;
    } catch (error) {
      update({ status: "error", error: errorMessage(error) });
      return false;
    } finally {
      job.running = false;
    }
  }, []);

  const startUpload = useCallback((file: UploadFile) => {
    if (!baseURL) return Promise.resolve(undefined);
    const id = `upload:${++nextId.current}`;
    jobs.current.set(id, { file, baseURL, running: false });
    dispatch({ type: "add", file: { id, fileName: file.name, status: "uploading", local: true } });
    return runUpload(id);
  }, [baseURL, runUpload]);

  useEffect(() => {
    mounted.current = true;
    jobs.current.clear();
    dispatch({ type: "reset" });
    void loadFiles();
    return () => {
      mounted.current = false;
      ++listRequest.current;
    };
  }, [loadFiles]);

  return { state, loadFiles, startUpload, retryUpload: runUpload };
}

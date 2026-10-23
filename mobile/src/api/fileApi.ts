import client, { clientReady } from "./client";
import { FileItem } from "../types/FileItem";
import { uploadToStorage, type UploadFile } from "./storageApi";

export async function getListFiles(baseURL?: string): Promise<FileItem[]> {
  await clientReady;
  const response = await client.get<FileItem[]>("/api/list", { baseURL: baseURL ?? client.defaults.baseURL });
  return response.data ?? [];
}

interface UploadOptions {
  baseURL?: string;
  storedUrl?: string;
  onStored?: (url: string) => void;
}

export async function uploadFile(
  file: UploadFile,
  options: UploadOptions = {},
): Promise<FileItem> {
  await clientReady;
  // Pin both stages to the server selected when this upload started.
  const baseURL = options.baseURL ?? client.defaults.baseURL;
  const url = options.storedUrl ?? await uploadToStorage(file);
  options.onStored?.(url);
  const item = { fileName: file.name, url };

  // Only register metadata after storage has returned a valid link.
  await client.post("/api/upload", item, { baseURL });
  return item;
}

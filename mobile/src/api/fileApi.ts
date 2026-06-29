import client from "./client";
import { FileItem } from "../types/FileItem";

export async function getListFiles(): Promise<FileItem[]> {
  const response = await client.get<FileItem[]>("/api/list");
  return response.data ?? [];
}

export async function uploadFile(file: {
  name: string;
  uri: string;
}): Promise<void> {
  await client.post("/api/upload", {
    fileName: file.name,
    url: file.uri,
  });
}

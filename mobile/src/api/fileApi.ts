import client from "./client";
import { FileItem } from "../types/FileItem";

export async function getListFiles(): Promise<FileItem[]> {
  const response = await client.get<FileItem[]>("/api/list");
  return response.data ?? [];
}

export async function uploadFile(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<FileItem> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await client.post<FileItem>("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

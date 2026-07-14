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
  // Step 1: Upload file to temp.sh first
  const formData = new FormData();
  // React Native FormData can handle file:// URIs directly
  formData.append("file", {
    uri: file.uri,
    type: "application/octet-stream",
    name: file.name,
  } as any);
  
  const tempShResponse = await fetch("https://temp.sh/upload", {
    method: "POST",
    body: formData,
  });
  
  if (!tempShResponse.ok) {
    throw new Error(`Failed to upload to temp.sh: ${tempShResponse.statusText}`);
  }
  
  // Step 2: Get URL from temp.sh response (plain text, just trim whitespace)
  const tempShText = await tempShResponse.text();
  const tempUrl = tempShText.trim();
  
  // Step 3: Upload metadata with temp.sh URL to your API
  await client.post("/api/upload", {
    fileName: file.name,
    url: tempUrl,
  });
}

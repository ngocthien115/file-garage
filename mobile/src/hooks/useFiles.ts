import { useState, useCallback } from 'react';
import { getListFiles } from '../api/fileApi';
import { FileItem } from '../types/FileItem';

type UiState =
  | { type: 'loading' }
  | { type: 'success'; files: FileItem[] }
  | { type: 'error'; message: string };

export function useFiles() {
  const [state, setState] = useState<UiState>({ type: 'loading' });

  const loadFiles = useCallback(async () => {
    setState({ type: 'loading' });
    try {
      const files = await getListFiles();
      setState({ type: 'success', files });
    } catch (e: any) {
      setState({ type: 'error', message: e?.message || 'Unknown error' });
    }
  }, []);

  return { state, loadFiles };
}

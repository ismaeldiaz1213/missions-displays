// Firebase Storage helpers that need the full Storage SDK (uploads, deletes, listing).
// Public pages build download URLs with storageUrl() instead, so they don't load this SDK.
import {
  deleteObject, getDownloadURL, getMetadata, getStorage, listAll, ref, uploadBytesResumable,
} from 'firebase/storage';
import { firebaseApp } from '../firebase';

const storage = getStorage(firebaseApp);

export const uploadFile = (
  file: File,
  path: string,
  onProgress?: (fraction: number) => void,
  extraMetadata: { contentDisposition?: string; customMetadata?: Record<string, string> } = {},
): Promise<string> =>
  new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type, ...extraMetadata });
    task.on(
      'state_changed',
      (s) => onProgress?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
      reject,
      () => resolve(path),
    );
  });

export const removeFile = (path: string) => deleteObject(ref(storage, path));

export interface StoredFile {
  path: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  url: string;
  originalName: string;
}

export const listFiles = async (prefix: string): Promise<StoredFile[]> => {
  const { items } = await listAll(ref(storage, prefix));
  return Promise.all(items.map(async (item) => {
    const [meta, url] = await Promise.all([getMetadata(item), getDownloadURL(item)]);
    return {
      path: item.fullPath,
      name: item.name,
      size: meta.size,
      contentType: meta.contentType ?? '',
      uploadedAt: meta.timeCreated,
      url,
      originalName: meta.customMetadata?.originalName ?? item.name,
    };
  }));
};

/** Sub-folder names directly under a prefix (e.g. registration ids under conference-media/). */
export const listFolders = async (prefix: string): Promise<string[]> => {
  const { prefixes } = await listAll(ref(storage, prefix));
  return prefixes.map((p) => p.name);
};

export const totalBytes = async (prefixes: string[]): Promise<number> => {
  const all = await Promise.all(prefixes.map(async (p) => {
    const { items } = await listAll(ref(storage, p));
    const metas = await Promise.all(items.map((i) => getMetadata(i)));
    return metas.reduce((sum, m) => sum + m.size, 0);
  }));
  return all.reduce((a, b) => a + b, 0);
};

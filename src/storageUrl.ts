import { STORAGE_BUCKET } from './firebase';

/** True for storage paths like `images/abc.jpg` (as opposed to full URLs or bundled `/assets`). */
export const isS3Key = (path?: string): boolean =>
  !!path && !path.startsWith('http') && !path.startsWith('/') && !path.startsWith('data:');

/** Public download URL for a storage path (images/ and pdfs/ are publicly readable), or the path unchanged if it's already a URL. */
export const storageUrl = (path: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(path)}?alt=media`;

export const resolveUrl = async (path: string | undefined, fallback: string): Promise<string> => {
  if (!path) return fallback;
  return isS3Key(path) ? storageUrl(path) : path;
};

/** Missionary gallery items can be photos (images/) or videos (videos/). */
export const isVideoPath = (path: string) => path.startsWith('videos/') || /\.(mp4|m4v|mov|webm)(\?|$)/i.test(path);

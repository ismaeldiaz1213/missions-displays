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

/**
 * Browser-friendly copies made by the `transcodeVideo` Cloud Function (functions/src/index.ts).
 * Phones often record HEVC/MOV, which Chrome on Windows/Linux can't play, so every upload under
 * videos/ gets an H.264 MP4 at videos/web/<name>.mp4 and a poster frame at videos/posters/<name>.jpg.
 * Keep these paths in sync with the function.
 */
const videoBaseName = (path: string) => path.replace(/^videos\//, '').replace(/\.[^./]+$/, '');
export const webVideoPath = (path: string) => `videos/web/${videoBaseName(path)}.mp4`;
export const videoPosterPath = (path: string) => `videos/posters/${videoBaseName(path)}.jpg`;

/** Profile photo URL for a missionary, or the default silhouette. */
export const profilePhotoUrl = (m: { profileImage?: string }) =>
  !m.profileImage ? '/default-missionary.svg' : isS3Key(m.profileImage) ? storageUrl(m.profileImage) : m.profileImage;

import { getUrl } from 'aws-amplify/storage';

/** Returns true if the string looks like an Amplify S3 storage key (not a full URL or local path). */
export const isS3Key = (path?: string): boolean =>
  !!path && !path.startsWith('http') && !path.startsWith('/') && !path.startsWith('data:');

/** Resolves an Amplify storage key to a signed URL. Returns the input unchanged if it's already a full URL. */
export const resolveUrl = async (path: string | undefined, fallback: string): Promise<string> => {
  if (!path) return fallback;
  if (!isS3Key(path)) return path;
  try {
    const { url } = await getUrl({ path });
    return url.toString();
  } catch {
    return fallback;
  }
};

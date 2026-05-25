import outputs from '../amplify_outputs.json';

const storage = (outputs as { storage?: { bucket_name?: string; aws_region?: string } }).storage;
const BUCKET = storage?.bucket_name ?? '';
const REGION = storage?.aws_region ?? 'us-east-1';

export const isS3Key = (path?: string): boolean =>
  !!path && !path.startsWith('http') && !path.startsWith('/') && !path.startsWith('data:');

/** Returns a permanent public S3 URL for a storage key, or the path unchanged if it's already a URL. */
export const resolveUrl = async (path: string | undefined, fallback: string): Promise<string> => {
  if (!path) return fallback;
  if (!isS3Key(path)) return path;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURI(path)}`;
};

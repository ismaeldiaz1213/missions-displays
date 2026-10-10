import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onObjectDeleted, onObjectFinalized } from 'firebase-functions/v2/storage';

initializeApp();

/**
 * Missionary page videos arrive straight from phones: often HEVC/MOV (which Chrome on most PCs
 * can't play), 4K, and with the index at the end of the file (so nothing plays until the whole
 * thing downloads). For every upload to videos/<name>.<ext> this makes:
 *   videos/web/<name>.mp4      H.264/AAC, longest side ≤ 1920 px, ~4 Mbps, fast-start
 *   videos/posters/<name>.jpg  a frame for the player to show before it starts
 * The original is never touched, so admins can still download it.
 * Keep the paths in sync with webVideoPath / videoPosterPath in src/storageUrl.ts.
 */
const ORIGINAL = /^videos\/([^/]+?)(\.[^./]+)?$/; // top level only; web/ and posters/ are our outputs
const outputsFor = (path: string) => {
  const base = ORIGINAL.exec(path)?.[1];
  return base ? { web: `videos/web/${base}.mp4`, poster: `videos/posters/${base}.jpg` } : null;
};

const ffmpeg = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath as unknown as string, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000); });
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`))));
  });

const OPTIONS = {
  region: 'us-east1', // must match the bucket's location
  cpu: 8,
  memory: '8GiB' as const, // /tmp is in memory: original + output must fit
  timeoutSeconds: 540, // event functions max out at 9 min ≈ 15 min of 1080p video at 8 vCPU
  concurrency: 1,
};

export const transcodeVideo = onObjectFinalized(OPTIONS, async (event) => {
  const { name, bucket, contentType, generation } = event.data;
  const out = outputsFor(name);
  if (!out || !contentType?.startsWith('video/')) return;

  // Already made from this exact upload (event re-delivered)? A replaced video gets a new generation.
  const files = getStorage().bucket(bucket);
  const [meta] = await files.file(out.web).getMetadata().catch(() => [null]);
  if (meta?.metadata?.sourceGeneration === String(generation)) return;

  const dir = await mkdtemp(join(tmpdir(), 'video-'));
  const input = join(dir, 'in');
  const web = join(dir, 'web.mp4');
  const poster = join(dir, 'poster.jpg');
  const started = Date.now();
  try {
    await files.file(name).download({ destination: input });
    await ffmpeg([
      '-i', input,
      '-map', '0:v:0', '-map', '0:a:0?',
      // Fit the longest side in 1920 px (portrait or landscape), 8-bit 4:2:0 for every browser
      '-vf', "scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))',format=yuv420p",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '4M', '-bufsize', '8M', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-movflags', '+faststart',
      web,
    ]);
    // A frame 1 s in; clips shorter than that use the first frame
    await ffmpeg(['-ss', '1', '-i', web, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-q:v', '3', poster])
      .catch(() => ffmpeg(['-i', web, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-q:v', '3', poster]));

    const cacheControl = 'public, max-age=31536000'; // upload names are unique, so these never change
    const metadata = { sourceGeneration: String(generation) };
    await Promise.all([
      files.upload(poster, { destination: out.poster, metadata: { contentType: 'image/jpeg', cacheControl, metadata } }),
      files.upload(web, { destination: out.web, metadata: { contentType: 'video/mp4', cacheControl, metadata } }),
    ]);
    logger.info('Transcoded video', { name, seconds: Math.round((Date.now() - started) / 1000) });
  } catch (err) {
    logger.error('Video transcode failed', { name, err: String(err) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/** Removing a video from a missionary page also removes its web copy and poster. */
export const cleanUpVideo = onObjectDeleted({ region: 'us-east1' }, async (event) => {
  const out = outputsFor(event.data.name);
  if (!out) return;
  const files = getStorage().bucket(event.data.bucket);
  // Replacing a file also reports the old version as deleted; keep the copies while the video still exists
  const [stillThere] = await files.file(event.data.name).exists();
  if (stillThere) return;
  await Promise.all([out.web, out.poster].map((p) => files.file(p).delete({ ignoreNotFound: true })));
});

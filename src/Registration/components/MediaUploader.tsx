import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonBase, IconButton, LinearProgress, Typography } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import { MEDIA_CONTENT_TYPE, MEDIA_MAX_BYTES } from '../conference';
import type { Strings } from '../i18n';
import { CONFERENCE_MEDIA_PREFIX } from '../../data/registrations';
import { formatBytes } from '../../Administrator/formatBytes';
import { uploadFile } from '../../data/storageFiles';

type Status = 'queued' | 'uploading' | 'done' | 'error';

interface QueuedFile {
  key: string;
  file: File;
  progress: number;
  status: Status;
}

const isMp4 = (f: File) => f.type === MEDIA_CONTENT_TYPE || /\.mp4$/i.test(f.name);
const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-120);

interface Props {
  registrationId: string;
  t: Strings;
  /** Called with true while files are uploading, false when the queue is idle. */
  onUploadingChange?: (uploading: boolean) => void;
}

/** Drop zone + upload queue for conference MP4 videos. Files start uploading as soon as they're added. */
const MediaUploader: React.FC<Props> = ({ registrationId, t, onUploadingChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueuedFile[]>([]);
  const running = useRef(false);
  const [queue, setQueueState] = useState<QueuedFile[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { onUploadingChange?.(uploading); }, [uploading, onUploadingChange]);

  // The upload loop reads the queue through a ref so it always sees files added mid-upload.
  const setQueue = (fn: (q: QueuedFile[]) => QueuedFile[]) => {
    queueRef.current = fn(queueRef.current);
    setQueueState(queueRef.current);
  };
  const update = (key: string, patch: Partial<QueuedFile>) =>
    setQueue((q) => q.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const processQueue = async () => {
    if (running.current) return;
    running.current = true;
    setUploading(true);
    setDenied(false);
    let item: QueuedFile | undefined;
    while ((item = queueRef.current.find((i) => i.status === 'queued'))) {
      const { key, file } = item;
      update(key, { status: 'uploading', progress: 0 });
      try {
        const path = `${CONFERENCE_MEDIA_PREFIX}/${registrationId}/${Date.now()}-${safeName(file.name)}`;
        await uploadFile(file, path, (p) => update(key, { progress: p }), {
          contentType: MEDIA_CONTENT_TYPE,
          contentDisposition: `attachment; filename="${safeName(file.name)}"`,
          customMetadata: { originalName: file.name },
        });
        update(key, { status: 'done', progress: 1 });
      } catch (err) {
        console.error(err);
        update(key, { status: 'error' });
        if ((err as { code?: string }).code === 'storage/unauthorized') setDenied(true);
      }
    }
    running.current = false;
    setUploading(false);
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const problems: string[] = [];
    const accepted: QueuedFile[] = [];
    Array.from(files).forEach((file) => {
      if (!isMp4(file)) problems.push(t.uploadInvalidType(file.name));
      else if (file.size >= MEDIA_MAX_BYTES) problems.push(t.uploadTooLarge(file.name));
      else accepted.push({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, progress: 0, status: 'queued' });
    });
    setRejected(problems);
    if (accepted.length === 0) return;
    setQueue((q) => [...q, ...accepted]);
    processQueue();
  };

  const retryFailed = () => {
    setQueue((q) => q.map((i) => (i.status === 'error' ? { ...i, status: 'queued' } : i)));
    processQueue();
  };

  const failed = queue.some((i) => i.status === 'error');
  const allDone = queue.length > 0 && queue.every((i) => i.status === 'done');

  return (
    <Box>
      <ButtonBase
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        sx={{
          width: '100%', flexDirection: 'column', gap: 1, py: { xs: 4, md: 5 }, px: 2, borderRadius: '14px',
          border: '2px dashed', borderColor: dragOver ? 'var(--ibl-primary)' : 'color-mix(in srgb, var(--ibl-primary) 35%, transparent)',
          bgcolor: dragOver ? 'color-mix(in srgb, var(--ibl-primary) 8%, var(--ibl-surface))' : 'color-mix(in srgb, var(--ibl-primary) 3%, var(--ibl-surface))',
          transition: 'all 0.15s ease',
        }}
      >
        <CloudUploadOutlinedIcon sx={{ fontSize: 44, color: 'var(--ibl-primary)' }} />
        <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700, textAlign: 'center' }}>{t.uploadDrop}</Typography>
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.85rem' }}>{t.uploadLimits}</Typography>
      </ButtonBase>
      <input ref={inputRef} type="file" accept="video/mp4,.mp4" multiple hidden
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

      {rejected.map((msg) => (
        <Typography key={msg} sx={{ color: 'var(--ibl-danger)', fontSize: '0.85rem', mt: 1 }}>{msg}</Typography>
      ))}

      {queue.length > 0 && (
        <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {queue.map((item) => (
            <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: '10px', border: '1px solid var(--ibl-border)' }}>
              <MovieOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ color: 'var(--ibl-text)', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.file.name}
                  </Typography>
                  <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
                    {item.status === 'uploading' ? `${Math.round(item.progress * 100)}%` : formatBytes(item.file.size)}
                  </Typography>
                </Box>
                {(item.status === 'uploading' || item.status === 'queued') && (
                  <LinearProgress variant="determinate" value={item.progress * 100} sx={{
                    mt: 0.75, height: 6, borderRadius: 3,
                    bgcolor: 'color-mix(in srgb, var(--ibl-primary) 12%, transparent)',
                    '& .MuiLinearProgress-bar': { bgcolor: 'var(--ibl-primary)' },
                  }} />
                )}
              </Box>
              {item.status === 'done' && <CheckCircleIcon titleAccess={t.uploadDone} sx={{ color: 'var(--ibl-success)' }} />}
              {item.status === 'error' && (
                <>
                  <ErrorOutlineIcon titleAccess={t.uploadFailed} sx={{ color: 'var(--ibl-danger)' }} />
                  <IconButton size="small" onClick={() => setQueue((q) => q.filter((i) => i.key !== item.key))}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          ))}
        </Box>
      )}

      {uploading && (
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.85rem', mt: 1.5, textAlign: 'center' }}>{t.keepPageOpen}</Typography>
      )}
      {denied && <Typography sx={{ color: 'var(--ibl-danger)', fontSize: '0.9rem', mt: 2 }}>{t.uploadDenied}</Typography>}
      {failed && !uploading && !denied && (
        <Button onClick={retryFailed} variant="outlined" sx={{ mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: 'var(--ibl-primary)', borderColor: 'var(--ibl-primary)' }}>
          {t.uploadRetry}
        </Button>
      )}
      {allDone && !uploading && (
        <Typography sx={{ color: 'var(--ibl-success)', fontWeight: 700, mt: 2 }}>{t.uploadAllDone}</Typography>
      )}
    </Box>
  );
};

export default MediaUploader;

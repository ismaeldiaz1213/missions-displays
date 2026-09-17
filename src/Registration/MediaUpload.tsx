import React, { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, ButtonBase, IconButton, LinearProgress, Typography } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import LockClockIcon from '@mui/icons-material/LockClock';
import PageShell, { CenterCard } from './components/PageShell';
import { MEDIA_MAX_BYTES, MEDIA_UPLOADS_CLOSE_AT, isMediaUploadOpen } from './conference';
import { LOCALES, STRINGS, useLang } from './i18n';
import { CONFERENCE_MEDIA_PREFIX } from '../data/registrations';
import { formatBytes } from '../Administrator/formatBytes';
import { uploadFile } from '../data/storageFiles';

type Status = 'queued' | 'uploading' | 'done' | 'error';

interface QueuedFile {
  key: string;
  file: File;
  progress: number;
  status: Status;
}

const isMedia = (f: File) => f.type.startsWith('video/') || f.type.startsWith('image/');
const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-120);

const MediaUpload: React.FC = () => {
  const { registrationId = '' } = useParams<{ registrationId: string }>();
  const [lang, changeLang] = useLang();
  const t = STRINGS[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const closesOn = new Date(MEDIA_UPLOADS_CLOSE_AT).toLocaleDateString(LOCALES[lang], {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Chicago',
  });

  const update = (key: string, patch: Partial<QueuedFile>) =>
    setQueue((q) => q.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const problems: string[] = [];
    const accepted: QueuedFile[] = [];
    Array.from(files).forEach((file) => {
      if (!isMedia(file)) problems.push(t.uploadInvalidType(file.name));
      else if (file.size >= MEDIA_MAX_BYTES) problems.push(t.uploadTooLarge(file.name));
      else accepted.push({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, progress: 0, status: 'queued' });
    });
    setRejected(problems);
    setQueue((q) => [...q, ...accepted]);
  };

  const startUpload = async () => {
    setUploading(true);
    setDenied(false);
    for (const item of queue.filter((i) => i.status === 'queued' || i.status === 'error')) {
      update(item.key, { status: 'uploading', progress: 0 });
      try {
        const path = `${CONFERENCE_MEDIA_PREFIX}/${registrationId}/${Date.now()}-${safeName(item.file.name)}`;
        await uploadFile(item.file, path, (p) => update(item.key, { progress: p }), {
          contentDisposition: `attachment; filename="${safeName(item.file.name)}"`,
          customMetadata: { originalName: item.file.name },
        });
        update(item.key, { status: 'done', progress: 1 });
      } catch (err) {
        console.error(err);
        update(item.key, { status: 'error' });
        if ((err as { code?: string }).code === 'storage/unauthorized') setDenied(true);
      }
    }
    setUploading(false);
  };

  const shell = (children: React.ReactNode) => (
    <PageShell showDeadline={false} t={t} lang={lang} onLangChange={changeLang}>{children}</PageShell>
  );

  if (!isMediaUploadOpen()) {
    return shell(
      <CenterCard>
        <LockClockIcon sx={{ fontSize: 56, color: 'var(--ibl-primary)', mb: 1.5 }} />
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: '1.5rem', mb: 1 }}>
          {t.uploadClosedTitle}
        </Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.7 }}>{t.uploadClosedBody}</Typography>
      </CenterCard>,
    );
  }

  const pending = queue.some((i) => i.status === 'queued' || i.status === 'error');
  const allDone = queue.length > 0 && queue.every((i) => i.status === 'done');

  return shell(
    <Box sx={{ maxWidth: 720, mx: 'auto', mt: { xs: -4, md: -5 }, px: 2, position: 'relative' }}>
      <Box className="reg-reveal" sx={{
        bgcolor: 'var(--ibl-surface)', borderRadius: '20px', p: { xs: 2.5, md: 4 },
        boxShadow: '0 15px 40px color-mix(in srgb, var(--ibl-primary-dark) 15%, transparent)',
      }}>
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.5rem' }, mb: 0.75 }}>
          {t.uploadTitle}
        </Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.6 }}>{t.uploadIntro}</Typography>
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.88rem', mt: 0.5, mb: 2.5 }}>{t.uploadClosesOn(closesOn)}</Typography>

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
          <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700 }}>{t.uploadDrop}</Typography>
          <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.85rem' }}>{t.uploadLimits}</Typography>
        </ButtonBase>
        <input ref={inputRef} type="file" accept="video/*,image/*" multiple hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

        {rejected.map((msg) => (
          <Typography key={msg} sx={{ color: 'var(--ibl-danger)', fontSize: '0.85rem', mt: 1 }}>{msg}</Typography>
        ))}

        {queue.length > 0 && (
          <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {queue.map((item) => (
              <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: '10px', border: '1px solid var(--ibl-border)' }}>
                {item.file.type.startsWith('video/')
                  ? <MovieOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />
                  : <ImageOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ color: 'var(--ibl-text)', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.file.name}
                    </Typography>
                    <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
                      {item.status === 'uploading' ? `${Math.round(item.progress * 100)}%` : formatBytes(item.file.size)}
                    </Typography>
                  </Box>
                  {item.status === 'uploading' && (
                    <LinearProgress variant="determinate" value={item.progress * 100} sx={{
                      mt: 0.75, height: 6, borderRadius: 3,
                      bgcolor: 'color-mix(in srgb, var(--ibl-primary) 12%, transparent)',
                      '& .MuiLinearProgress-bar': { bgcolor: 'var(--ibl-primary)' },
                    }} />
                  )}
                </Box>
                {item.status === 'done' && <CheckCircleIcon titleAccess={t.uploadDone} sx={{ color: 'var(--ibl-success)' }} />}
                {item.status === 'error' && <ErrorOutlineIcon titleAccess={t.uploadFailed} sx={{ color: 'var(--ibl-danger)' }} />}
                {item.status === 'queued' && !uploading && (
                  <IconButton size="small" onClick={() => setQueue((q) => q.filter((i) => i.key !== item.key))}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        )}

        {denied && <Typography sx={{ color: 'var(--ibl-danger)', fontSize: '0.9rem', mt: 2 }}>{t.uploadDenied}</Typography>}
        {allDone && (
          <Typography sx={{ color: 'var(--ibl-success)', fontWeight: 700, mt: 2 }}>{t.uploadAllDone}</Typography>
        )}

        {pending && (
          <>
            <Button onClick={startUpload} disabled={uploading} variant="contained" size="large" fullWidth sx={{
              mt: 2.5, py: 1.4, borderRadius: '12px', textTransform: 'none', fontWeight: 800, fontSize: '1rem',
              color: 'var(--ibl-on-primary)',
              background: 'linear-gradient(135deg, var(--ibl-primary-dark) 0%, var(--ibl-primary) 100%)',
            }}>
              {t.uploadStart}
            </Button>
            {uploading && (
              <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.85rem', mt: 1, textAlign: 'center' }}>{t.keepPageOpen}</Typography>
            )}
          </>
        )}
      </Box>
    </Box>,
  );
};

export default MediaUpload;

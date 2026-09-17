import React, { useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import type { StoredFile } from '../data/storageFiles';
import { formatBytes } from './formatBytes';

const formatUploaded = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Label/value rows in admin detail dialogs; empty values are hidden. */
export const DetailGroup: React.FC<{ title: string; rows: [string, React.ReactNode][] }> = ({ title, rows }) => {
  const visible = rows.filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (visible.length === 0) return null;
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ color: 'var(--ibl-primary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' }, columnGap: 2, rowGap: { xs: 0, sm: 0.75 } }}>
        {visible.map(([k, v]) => (
          <React.Fragment key={k}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: { xs: 1, sm: 0 } }}>{k}</Typography>
            <Typography component="div" sx={{ color: 'text.primary', fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</Typography>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

/** Uploaded files with inline preview (video, image, PDF) and download. */
export const StoredFileList: React.FC<{ files: StoredFile[] }> = ({ files }) => {
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {files.map((f) => {
        const isVideo = f.contentType.startsWith('video/');
        const isPdf = f.contentType === 'application/pdf';
        return (
          <Paper key={f.path} elevation={0} sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {isVideo ? <MovieOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />
                : isPdf ? <PictureAsPdfOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />
                  : <ImageOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.originalName}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{formatBytes(f.size)} · {formatUploaded(f.uploadedAt)}</Typography>
              </Box>
              {!isPdf && (
                <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setPlaying(playing === f.path ? null : f.path)}>
                  {playing === f.path ? 'Ocultar' : 'Ver'}
                </Button>
              )}
              <Button size="small" variant="outlined" startIcon={<DownloadIcon />} href={f.url} target="_blank" rel="noopener noreferrer" sx={{ textTransform: 'none' }}>
                {isPdf ? 'Abrir' : 'Descargar'}
              </Button>
            </Box>
            {playing === f.path && (
              <Box sx={{ mt: 1.25 }}>
                {isVideo
                  ? <video src={f.url} controls style={{ width: '100%', maxHeight: 420, borderRadius: 8, background: '#000' }} />
                  : <img src={f.url} alt={f.originalName} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 8 }} />}
              </Box>
            )}
          </Paper>
        );
      })}
    </Box>
  );
};

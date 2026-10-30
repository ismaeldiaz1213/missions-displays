import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { CONFERENCE_MEDIA_PREFIX } from '../../data/registrations';
import { listFiles, listFolders, type StoredFile } from '../../data/storageFiles';
import type { Registration } from '../../Registration/conference';
import { formatBytes } from '../formatBytes';

interface ZipEntry { file: StoredFile; name: string }

// Characters Windows doesn't allow in file/folder names
const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

/** One folder per person ("Pérez, Juan"), keeping each file's original name. */
const zipEntries = async (registrations: Registration[]): Promise<ZipEntry[]> => {
  const byId = new Map(registrations.map((r) => [r.id, r]));
  const ids = await listFolders(CONFERENCE_MEDIA_PREFIX);
  const folders = await Promise.all(ids.map(async (id) => {
    const r = byId.get(id);
    const folder = safe(r ? `${r.registrant.lastName}, ${r.registrant.firstName}` : '') || id;
    return { folder, files: await listFiles(`${CONFERENCE_MEDIA_PREFIX}/${id}`) };
  }));
  const used = new Set<string>();
  const unique = (name: string) => {
    const dot = name.lastIndexOf('.');
    const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
    let candidate = name;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  };
  return folders
    .sort((a, b) => a.folder.localeCompare(b.folder))
    .flatMap(({ folder, files }) => files
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))
      .map((file) => ({ file, name: unique(`${folder}/${safe(file.originalName) || file.name}`) })));
};

type SaveFilePicker = (opts: object) => Promise<{ createWritable: () => Promise<WritableStream<Uint8Array>> }>;

/**
 * Downloads every video registrants uploaded as one ZIP. Videos are stored, not recompressed.
 * In Chrome/Edge the ZIP streams straight to the file the admin picks, so its size doesn't
 * matter; other browsers have to hold the whole ZIP in memory first.
 */
const MediaDownloadDialog: React.FC<{ registrations: Registration[]; onClose: () => void }> = ({ registrations, onClose }) => {
  const [entries, setEntries] = useState<ZipEntry[] | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ files: number; bytes: number } | null>(null);
  const [done, setDone] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    zipEntries(registrations).then(setEntries).catch((err) => { setError(String(err)); setEntries([]); });
  }, [registrations]);

  useEffect(() => () => abort.current?.abort(), []);

  const totalBytes = entries?.reduce((n, e) => n + e.file.size, 0) ?? 0;
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  const working = progress !== null && !done;

  const start = async () => {
    if (!entries?.length) return;
    const filename = `videos-conferencia-${new Date().toISOString().slice(0, 10)}.zip`;
    let target: WritableStream<Uint8Array> | null = null;
    if (picker) {
      try {
        const handle = await picker({ suggestedName: filename, types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }] });
        target = await handle.createWritable();
      } catch {
        return; // picker cancelled
      }
    }

    const controller = new AbortController();
    abort.current = controller;
    setError('');
    setDone(false);
    setProgress({ files: 0, bytes: 0 });
    try {
      const { downloadZip } = await import('client-zip');
      let bytes = 0;
      let shown = 0;
      const files = async function* () {
        for (const [i, { file, name }] of entries.entries()) {
          const res = await fetch(file.url, { signal: controller.signal });
          if (!res.ok || !res.body) throw new Error(`${name}: ${res.status} ${res.statusText}`);
          const counted = res.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, ctrl) {
              bytes += chunk.byteLength;
              if (Date.now() - shown > 250) { shown = Date.now(); setProgress({ files: i, bytes }); }
              ctrl.enqueue(chunk);
            },
          }));
          yield { name, input: counted, size: file.size, lastModified: new Date(file.uploadedAt) };
        }
      };
      const zip = downloadZip(files());
      if (target) {
        await zip.body!.pipeTo(target, { signal: controller.signal });
      } else {
        const url = URL.createObjectURL(await zip.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setProgress({ files: entries.length, bytes: totalBytes });
      setDone(true);
    } catch (err) {
      setProgress(null);
      if (!controller.signal.aborted) setError(`No se pudo crear el ZIP: ${String(err)}`);
      await target?.abort().catch(() => {});
    }
  };

  const cancel = () => { abort.current?.abort(); setProgress(null); };

  return (
    <Dialog open onClose={working ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Descargar todos los videos</DialogTitle>
      <DialogContent dividers>
        {entries === null ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><CircularProgress size={20} />Buscando videos…</Box>
        ) : entries.length === 0 ? (
          <Typography color="text.secondary">{error || 'Nadie ha subido videos todavía.'}</Typography>
        ) : (
          <>
            <Typography sx={{ mb: 1 }}>
              <strong>{entries.length}</strong> archivo{entries.length === 1 ? '' : 's'} · <strong>{formatBytes(totalBytes)}</strong>,
              en una carpeta por persona.
            </Typography>
            {!picker && (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 1 }}>
                Para descargas grandes use Chrome o Edge: guardan el ZIP directo al disco. Este navegador tiene que cargarlo todo en memoria primero.
              </Typography>
            )}
            {progress && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={totalBytes ? Math.min(100, (progress.bytes / totalBytes) * 100) : 0} />
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.75 }}>
                  {done ? 'Listo. El ZIP se guardó.'
                    : `Archivo ${Math.min(progress.files + 1, entries.length)} de ${entries.length} · ${formatBytes(progress.bytes)} de ${formatBytes(totalBytes)}`}
                </Typography>
              </Box>
            )}
            {error && <Typography color="error.main" variant="body2" sx={{ mt: 1.5 }}>{error}</Typography>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {working
          ? <Button onClick={cancel} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancelar</Button>
          : <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cerrar</Button>}
        <Button variant="contained" startIcon={working ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          disabled={!entries?.length || working} onClick={start} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {working ? 'Descargando…' : 'Descargar ZIP'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaDownloadDialog;

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, ButtonBase, CircularProgress, IconButton, InputAdornment, MenuItem,
  TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { Missionary } from '../../types';
import { resolveUrl } from '../../storageUrl';
import { BRAND } from '../../ui/brand';
import { panelSx, useAdminLang } from '../adminUi';
import MissionaryForm from '../MissionaryForm';
import { buildEntry, fullName, useDirectory, type DirectoryEntry } from './directoryData';
import MissionaryProfileView, { type ProfileSection } from './MissionaryProfileView';
import CompleteProfileDialog from './CompleteProfileDialog';
import StatusTags from './StatusTags';
import { CONTINENT_LABELS, exportMissionariesExcel, type ExtraSheet } from './exportMissionaries';

type Filter = 'all' | 'published' | 'draft' | 'basic' | 'noEmail' | 'archived';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MissionaryCard: React.FC<{ entry: DirectoryEntry; onOpen: () => void }> = ({ entry, onOpen }) => {
  const [photo, setPhoto] = useState('');
  const m = entry.page;
  useEffect(() => { resolveUrl(m.profileImage, '').then(setPhoto); }, [m.profileImage]);
  return (
    <ButtonBase onClick={onOpen} sx={{
      ...panelSx, p: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5, textAlign: 'left', width: '100%',
      opacity: entry.status === 'archived' ? 0.7 : 1, transition: 'transform 0.15s, box-shadow 0.15s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(15,23,42,0.09)', borderColor: BRAND.blueLine },
    }}>
      <Avatar src={photo || undefined} sx={{ width: 56, height: 56, bgcolor: BRAND.blueSoft, color: BRAND.navy, fontWeight: 800 }}>
        {m.name?.[0]}{m.lastName?.[0]}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 800, color: BRAND.ink, lineHeight: 1.25 }}>{fullName(m)}</Typography>
        {(m.location?.city || m.location?.country) && (
          <Typography sx={{ color: BRAND.muted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.25 }}>
            <PlaceOutlinedIcon sx={{ fontSize: '1rem' }} />{[m.location.city, m.location.country].filter(Boolean).join(', ')}
          </Typography>
        )}
        {m.organization && <Typography sx={{ color: BRAND.text, fontSize: '0.85rem' }} noWrap>{m.organization}</Typography>}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}><StatusTags entry={entry} /></Box>
      </Box>
    </ButtonBase>
  );
};

/**
 * The Misioneros tab: every missionary as a card, with search and filters. Clicking one opens
 * their full profile. "Añadir misionero" creates a page, then asks for the private details.
 */
const MissionaryDirectory: React.FC<{
  storageUsedBytes: number;
  onSaveComplete: () => void;
  extraSections?: ProfileSection[];
  extraSheets?: () => Promise<ExtraSheet[]>;
}> = ({ storageUsedBytes, onSaveComplete, extraSections, extraSheets }) => {
  const { tr } = useAdminLang();
  const { entries, loading, error, reload } = useDirectory();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [continent, setContinent] = useState(() => searchParams.get('continent') ?? 'all');
  const [filter, setFilter] = useState<Filter>(() => (searchParams.get('filtro') as Filter) || 'all');
  const [form, setForm] = useState<{ missionary: Missionary | null; isDraft: boolean } | null>(null);
  const [completing, setCompleting] = useState<DirectoryEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const openId = searchParams.get('m');
  const open = entries.find((e) => e.id === openId) ?? null;
  const setOpen = (id: string | null) => setSearchParams((p) => {
    const next = new URLSearchParams(p);
    next.set('tab', 'misioneros');
    if (id) next.set('m', id); else next.delete('m');
    return next;
  }, { replace: !id });

  // From "Aprobar" in Solicitudes: ?tab=misioneros&draft=<id> opens that draft in the editor.
  const draftParam = searchParams.get('draft');
  useEffect(() => {
    if (!draftParam || loading) return;
    const draft = entries.find((e) => e.id === draftParam && e.status === 'draft');
    if (draft) setForm({ missionary: draft.page, isDraft: true });
    setSearchParams((p) => { p.delete('draft'); p.delete('continent'); return p; }, { replace: true });
  }, [draftParam, loading, entries, setSearchParams]);

  const counts = useMemo(() => {
    const active = entries.filter((e) => e.status !== 'archived');
    return {
      all: active.length,
      published: active.filter((e) => e.status === 'published').length,
      draft: active.filter((e) => e.status === 'draft').length,
      basic: active.filter((e) => !e.complete).length,
      noEmail: active.filter((e) => !e.email).length,
      archived: entries.length - active.length,
    };
  }, [entries]);

  const shown = useMemo(() => {
    const q = normalize(search.trim());
    return entries.filter((e) => {
      if (filter === 'archived' ? e.status !== 'archived' : e.status === 'archived') return false;
      if (filter === 'published' && e.status !== 'published') return false;
      if (filter === 'draft' && e.status !== 'draft') return false;
      if (filter === 'basic' && e.complete) return false;
      if (filter === 'noEmail' && e.email) return false;
      if (continent !== 'all' && e.page.continent !== continent) return false;
      if (!q) return true;
      const m = e.page;
      return [m.name, m.lastName, m.organization, m.location?.city, m.location?.country, m.missionType, e.profile?.email, e.profile?.spouseName, e.profile?.sendingChurch]
        .some((f) => f && normalize(f).includes(q));
    });
  }, [entries, filter, continent, search]);

  const exportExcel = async () => {
    setExporting(true);
    setExportError('');
    try {
      await exportMissionariesExcel(entries, extraSheets ? await extraSheets() : []);
    } catch (err) {
      console.error(err);
      setExportError(String(err));
    } finally {
      setExporting(false);
    }
  };

  const FILTERS: [Filter, string][] = [
    ['all', tr('Todos', 'All')],
    ['published', tr('Publicados', 'Published')],
    ['draft', tr('Borradores', 'Drafts')],
    ['basic', tr('Perfil por completar', 'Profile to complete')],
    ['noEmail', tr('Sin correo', 'No email')],
    ['archived', tr('Archivados', 'Archived')],
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.5rem', color: BRAND.ink, flex: 1, minWidth: 200 }}>
          {tr('Misioneros', 'Missionaries')}
        </Typography>
        <Button variant="outlined" startIcon={exporting ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon />} onClick={exportExcel} disabled={exporting || loading}>
          {tr('Exportar Excel', 'Export to Excel')}
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ missionary: null, isDraft: false })}>
          {tr('Añadir misionero', 'Add missionary')}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
        <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 240, bgcolor: BRAND.white }}
          placeholder={tr('Buscar por nombre, organización, país, correo…', 'Search by name, organization, country, email…')}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }} />
        <TextField select size="small" value={continent} onChange={(e) => setContinent(e.target.value)} sx={{ minWidth: 200, bgcolor: BRAND.white }}>
          <MenuItem value="all">{tr('Todos los continentes', 'All continents')}</MenuItem>
          {Object.entries(CONTINENT_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
        {FILTERS.map(([k, label]) => (
          <Button key={k} size="small" onClick={() => setFilter(k)} variant={filter === k ? 'contained' : 'outlined'}
            color={k === 'noEmail' && counts.noEmail ? 'error' : 'primary'} sx={{ bgcolor: filter === k ? undefined : BRAND.white }}>
            {label} ({counts[k]})
          </Button>
        ))}
      </Box>

      {exportError && <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : shown.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: BRAND.muted }}>
          {search ? tr(`Sin resultados para "${search}"`, `No results for "${search}"`) : tr('No hay misioneros en esta vista.', 'No missionaries in this view.')}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          {shown.map((e) => <MissionaryCard key={e.id} entry={e} onOpen={() => setOpen(e.id)} />)}
        </Box>
      )}

      {open && (
        <MissionaryProfileView
          key={open.id}
          entry={open}
          extraSections={extraSections}
          onClose={() => setOpen(null)}
          onEditPage={() => setForm({ missionary: open.page, isDraft: open.status === 'draft' })}
          onCompleteProfile={() => setCompleting(open)}
          onChanged={reload}
        />
      )}

      {form && (
        <MissionaryForm
          open
          missionary={form.missionary}
          defaultContinent={continent === 'all' ? 'north-america' : continent}
          storageUsedBytes={storageUsedBytes}
          isDraft={form.isDraft}
          onClose={() => setForm(null)}
          onSave={(saved) => {
            const isNew = !form.missionary;
            setForm(null);
            onSaveComplete();
            reload();
            // A brand-new missionary: go straight on to their private details.
            if (isNew) {
              setOpen(saved.id);
              setCompleting(buildEntry(saved, 'published', null));
            }
          }}
        />
      )}

      {completing && (
        <CompleteProfileDialog
          entry={entries.find((e) => e.id === completing.id) ?? completing}
          onClose={() => setCompleting(null)}
          onSaved={() => { setCompleting(null); reload(); }}
        />
      )}
    </Box>
  );
};

export default MissionaryDirectory;

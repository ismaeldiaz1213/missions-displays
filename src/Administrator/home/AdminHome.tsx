import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PhoneInTalkOutlinedIcon from '@mui/icons-material/PhoneInTalkOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { CONTACT_METHOD_LABELS, MISSING_LABELS } from '../../data/missionaryProfiles';
import { A, Panel, StatTile, formatDate, useAdminLang } from '../adminUi';
import { fullName, useDirectory } from '../directory/directoryData';

export interface TaskItem {
  key: string;
  title: string;
  detail?: string;
  action: string;
  onAction: () => void;
}

export interface TaskGroup {
  key: string;
  icon: React.ReactNode;
  title: string;
  /** One line on why this matters / what to do. */
  hint: string;
  items: TaskItem[];
}

const PREVIEW = 5;

const TaskPanel: React.FC<{ group: TaskGroup }> = ({ group }) => {
  const { tr } = useAdminLang();
  const [all, setAll] = useState(false);
  const items = all ? group.items : group.items.slice(0, PREVIEW);
  return (
    <Panel title={
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box component="span" sx={{ color: A.blue, display: 'flex' }}>{group.icon}</Box>
        {group.title}
        <Box component="span" sx={{ bgcolor: A.soft, color: A.navy, borderRadius: '999px', px: 1.1, fontSize: '0.85rem' }}>{group.items.length}</Box>
      </Box>
    }>
      <Typography sx={{ color: A.muted, fontSize: '0.85rem', mt: -1, mb: 1.5 }}>{group.hint}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((it) => (
          <Box key={it.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.1, borderTop: `1px solid ${A.line}` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, color: A.ink }}>{it.title}</Typography>
              {it.detail && <Typography sx={{ color: A.muted, fontSize: '0.85rem' }}>{it.detail}</Typography>}
            </Box>
            <Button size="small" variant="outlined" onClick={it.onAction} sx={{ flexShrink: 0 }}>{it.action}</Button>
          </Box>
        ))}
      </Box>
      {group.items.length > PREVIEW && (
        <Button size="small" onClick={() => setAll(!all)} sx={{ mt: 1 }}>
          {all ? tr('Ver menos', 'Show less') : tr(`Ver los ${group.items.length}`, `Show all ${group.items.length}`)}
        </Button>
      )}
    </Panel>
  );
};

/**
 * The first admin screen: what needs attention today, each with its button right there.
 * Later phases add more groups (reports, missionary changes) through `extraGroups`.
 */
const AdminHome: React.FC<{ extraGroups?: TaskGroup[]; extraStats?: React.ReactNode }> = ({ extraGroups = [], extraStats }) => {
  const { tr, lang } = useAdminLang();
  const { entries, requests, loading, error } = useDirectory();
  const [, setSearchParams] = useSearchParams();

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  const active = entries.filter((e) => e.status !== 'archived');
  const published = active.filter((e) => e.status === 'published');
  const complete = active.filter((e) => e.complete);
  const noEmail = active.filter((e) => !e.email);
  const pendingRequests = requests.filter((r) => r.status === 'pending' && !r.archived);
  const openProfile = (id: string) => setSearchParams({ tab: 'misioneros', m: id });
  const goTab = (tab: string, extra: Record<string, string> = {}) => setSearchParams({ tab, ...extra });

  const groups: TaskGroup[] = [
    {
      key: 'requests', icon: <InboxOutlinedIcon />, title: tr('Solicitudes nuevas', 'New requests'),
      hint: tr('Misioneros que pidieron una página. Revise y apruebe para crear su borrador.', 'Missionaries who asked for a page. Review and approve to create their draft.'),
      items: pendingRequests.map((r) => ({
        key: r.id, title: [r.name, r.lastName].filter(Boolean).join(' '),
        detail: [r.organization, r.country, formatDate(r.createdAt, lang)].filter(Boolean).join(' · '),
        action: tr('Revisar', 'Review'), onAction: () => goTab('solicitudes'),
      })),
    },
    ...extraGroups,
    {
      key: 'drafts', icon: <EditNoteOutlinedIcon />, title: tr('Borradores sin publicar', 'Unpublished drafts'),
      hint: tr('Páginas listas para revisar y publicar en el sitio.', 'Pages ready to review and publish on the site.'),
      items: active.filter((e) => e.status === 'draft').map((e) => ({
        key: e.id, title: fullName(e.page), detail: [e.page.organization, e.page.location?.country].filter(Boolean).join(' · '),
        action: tr('Abrir', 'Open'), onAction: () => openProfile(e.id),
      })),
    },
    {
      key: 'basic', icon: <BadgeOutlinedIcon />, title: tr('Perfiles por completar', 'Profiles to complete'),
      hint: tr('Falta información para que el perfil quede completo (y poder invitarlos).', 'Some details are missing for a complete profile (and to invite them).'),
      items: active.filter((e) => !e.complete).map((e) => ({
        key: e.id, title: fullName(e.page),
        detail: `${tr('Falta', 'Missing')}: ${e.missing.map((f) => MISSING_LABELS[f][lang]).join(', ')}`,
        action: tr('Completar', 'Complete'), onAction: () => openProfile(e.id),
      })),
    },
    {
      key: 'noEmail', icon: <PhoneInTalkOutlinedIcon />, title: tr('Sin correo: contactar por otro medio', 'No email: reach them another way'),
      hint: tr('Estos misioneros no reciben los correos masivos. Comuníquese por teléfono, WhatsApp u otro medio.', "These missionaries don't get mass emails. Reach them by phone, WhatsApp or another way."),
      items: noEmail.map((e) => ({
        key: e.id, title: fullName(e.page),
        detail: [
          e.profile?.preferredContact ? CONTACT_METHOD_LABELS[e.profile.preferredContact][lang] : '',
          e.phone, e.profile?.preferredContactNote,
        ].filter(Boolean).join(' · ') || tr('Sin teléfono tampoco', 'No phone either'),
        action: tr('Ver perfil', 'View profile'), onAction: () => openProfile(e.id),
      })),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <Box>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.5rem', color: A.ink, mb: 0.5 }}>
        {tr('Inicio', 'Home')}
      </Typography>
      <Typography sx={{ color: A.muted, mb: 2.5 }}>
        {tr('Lo que necesita atención hoy. Cada tarea tiene su botón.', 'What needs attention today. Every task has its button.')}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(190px, 1fr))' }, gap: 1.5, mb: 3 }}>
        <StatTile label={tr('Misioneros publicados', 'Published missionaries')} value={published.length} onClick={() => goTab('misioneros', { filtro: 'published' })} />
        <StatTile tone="green" label={tr('Perfiles completos', 'Complete profiles')} value={`${complete.length}/${active.length}`} onClick={() => goTab('misioneros', { filtro: 'basic' })} />
        <StatTile tone={noEmail.length ? 'red' : 'green'} label={tr('Sin correo', 'No email')} value={noEmail.length} onClick={() => goTab('misioneros', { filtro: 'noEmail' })} />
        <StatTile tone={pendingRequests.length ? 'amber' : 'green'} label={tr('Solicitudes pendientes', 'Pending requests')} value={pendingRequests.length} onClick={() => goTab('solicitudes')} />
        {extraStats}
      </Box>

      {groups.length === 0 ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <TaskAltIcon sx={{ fontSize: 56, color: '#16A34A' }} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', mt: 1 }}>{tr('¡Todo al día!', 'All caught up!')}</Typography>
            <Typography sx={{ color: A.muted }}>{tr('No hay nada pendiente por ahora.', 'Nothing needs attention right now.')}</Typography>
          </Box>
        </Panel>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
          {groups.map((g) => <TaskPanel key={g.key} group={g} />)}
        </Box>
      )}
    </Box>
  );
};

export default AdminHome;

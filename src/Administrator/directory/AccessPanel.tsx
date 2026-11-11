import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { inviteMissionary } from '../../data/functions';
import { createEditLink, listEditsForMissionary, revokeEditLink, type MissionaryEdit } from '../../data/missionaryEdits';
import { BRAND } from '../../ui/brand';
import { Panel, formatDate, useAdminLang } from '../adminUi';
import type { DirectoryEntry } from './directoryData';

export const PORTAL_PATH = '/misioneros/mi-pagina';

/**
 * How this missionary gets into their own page: an emailed invitation (they sign in with that
 * email), or — when they have no email — a private link the church sends by WhatsApp or similar,
 * which only lets them propose page changes.
 */
const AccessPanel: React.FC<{ entry: DirectoryEntry; onChanged: () => void }> = ({ entry, onChanged }) => {
  const { tr, lang } = useAdminLang();
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [link, setLink] = useState<MissionaryEdit | null>(null);
  const [copied, setCopied] = useState(false);
  const privateEmail = entry.profile?.email?.trim() ?? '';

  useEffect(() => {
    if (privateEmail || entry.status !== 'published') return;
    listEditsForMissionary(entry.id)
      .then((edits) => setLink(edits.filter((e) => !e.revoked && e.status !== 'approved').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null))
      .catch(console.error);
  }, [entry.id, entry.status, privateEmail]);

  if (entry.status !== 'published') {
    return <Panel title={tr('Acceso a su página', 'Access to their page')}><Typography sx={{ color: BRAND.muted }}>
      {tr('Publique la página primero; luego podrá invitar al misionero.', 'Publish the page first; then you can invite the missionary.')}
    </Typography></Panel>;
  }

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setNotice(null);
    try { await fn(); } catch (err) { console.error(err); setNotice({ type: 'error', text: String((err as { message?: string }).message ?? err) }); } finally { setBusy(''); }
  };

  const invite = () => run('invite', async () => {
    await inviteMissionary(entry.id);
    setNotice({ type: 'success', text: tr(`Invitación enviada a ${privateEmail}.`, `Invitation sent to ${privateEmail}.`) });
    onChanged();
  });

  const url = link ? `${window.location.origin}${PORTAL_PATH}?enlace=${link.token}` : '';

  return (
    <Panel title={tr('Acceso a su página', 'Access to their page')} sx={{ mb: 2.5 }}>
      {privateEmail ? (
        <>
          <Typography sx={{ color: BRAND.text }}>
            {tr('Entra con', 'Signs in with')} <strong>{privateEmail}</strong> {tr('en', 'at')} {window.location.host}{PORTAL_PATH}
          </Typography>
          <Typography sx={{ color: BRAND.muted, fontSize: '0.88rem', mt: 0.5 }}>
            {entry.profile?.invitedAt
              ? tr(`Invitado el ${formatDate(entry.profile.invitedAt, lang)}${entry.profile.invitedBy ? ` por ${entry.profile.invitedBy}` : ''}.`,
                `Invited ${formatDate(entry.profile.invitedAt, lang)}${entry.profile.invitedBy ? ` by ${entry.profile.invitedBy}` : ''}.`)
              : tr('Todavía no lo hemos invitado.', "We haven't invited them yet.")}
          </Typography>
          <Button sx={{ mt: 1.5 }} variant={entry.profile?.invitedAt ? 'outlined' : 'contained'} onClick={invite} disabled={!!busy}
            startIcon={busy === 'invite' ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}>
            {entry.profile?.invitedAt ? tr('Reenviar invitación', 'Resend invitation') : tr('Enviar invitación', 'Send invitation')}
          </Button>
        </>
      ) : (
        <>
          <Typography sx={{ color: BRAND.text }}>
            {tr('No tiene correo, así que no puede entrar con un enlace por correo. Puede mandarle un enlace privado (por WhatsApp, por ejemplo) para que proponga cambios a su página.',
              "They have no email, so they can't sign in by email. You can send them a private link (by WhatsApp, for example) to propose changes to their page.")}
          </Typography>
          {link ? (
            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: BRAND.page, borderRadius: '10px', px: 1.5, py: 1 }}>
                <Typography sx={{ flex: 1, fontSize: '0.85rem', wordBreak: 'break-all' }}>{url}</Typography>
                <Tooltip title={tr('Copiar', 'Copy')}>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => {})}>
                    {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Button sx={{ mt: 1 }} color="inherit" disabled={!!busy} onClick={() => run('revoke', async () => { await revokeEditLink(link.token); setLink(null); })}>
                {tr('Desactivar enlace', 'Turn off link')}
              </Button>
            </Box>
          ) : (
            <Button sx={{ mt: 1.5 }} variant="outlined" startIcon={busy === 'link' ? <CircularProgress size={16} /> : <LinkIcon />} disabled={!!busy}
              onClick={() => run('link', async () => {
                const token = await createEditLink(entry.page);
                setLink({ token, missionaryId: entry.id, status: 'draft', revoked: false, createdAt: new Date().toISOString() } as MissionaryEdit);
              })}>
              {tr('Crear enlace privado', 'Create private link')}
            </Button>
          )}
        </>
      )}
      {notice && <Alert severity={notice.type} sx={{ mt: 1.5 }}>{notice.text}</Alert>}
    </Panel>
  );
};

export default AccessPanel;

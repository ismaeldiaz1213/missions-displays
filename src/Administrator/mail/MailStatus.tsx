import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Tooltip, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { listMailFor, type MailRecord, type MailStatus } from '../../data/mail';
import { A, Tag, formatDate, useAdminLang } from '../adminUi';
import type { DirectoryEntry } from '../directory/directoryData';

export const MailStatusTag: React.FC<{ status: MailStatus; error?: string }> = ({ status, error }) => {
  const { tr } = useAdminLang();
  const tag = {
    queued: <Tag tone="amber">{tr('En cola', 'Queued')}</Tag>,
    sent: <Tag tone="green">{tr('Enviado', 'Sent')}</Tag>,
    logged: <Tag>{tr('Guardado (sin enviar)', 'Recorded (not sent)')}</Tag>,
    error: <Tag tone="red">{tr('Error', 'Error')}</Tag>,
  }[status];
  return error ? <Tooltip title={error}><span>{tag}</span></Tooltip> : tag;
};

const TEMPLATE_LABELS: Record<string, { es: string; en: string }> = {
  requestReceived: { es: 'Confirmación de solicitud', en: 'Request confirmation' },
  invitation: { es: 'Invitación a su página', en: 'Page invitation' },
  signInLink: { es: 'Enlace para entrar', en: 'Sign-in link' },
  reportReminder: { es: 'Recordatorio de informe', en: 'Report reminder' },
  reportReceived: { es: 'Gracias por el informe', en: 'Report thank-you' },
  editApproved: { es: 'Cambios publicados', en: 'Changes published' },
  editRejected: { es: 'Cambios por ajustar', en: 'Changes need a fix' },
};

/** "Correos" section of a missionary's profile: every email we've sent them. */
const MissionaryMail: React.FC<{ entry: DirectoryEntry }> = ({ entry }) => {
  const { tr, lang } = useAdminLang();
  const [, setSearchParams] = useSearchParams();
  const [mails, setMails] = useState<MailRecord[] | null>(null);
  useEffect(() => { listMailFor(entry.id).then(setMails).catch(() => setMails([])); }, [entry.id]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ flex: 1, color: A.muted }}>
          {entry.email ? `${tr('Escribimos a', 'We write to')} ${entry.email}` : tr('Sin correo: no recibe correos masivos ni recordatorios.', 'No email: gets no mass emails or reminders.')}
        </Typography>
        {entry.email && (
          <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setSearchParams({ tab: 'correos', para: entry.id })}>
            {tr('Escribirle', 'Write to them')}
          </Button>
        )}
      </Box>
      {mails === null ? <CircularProgress size={20} /> : mails.length === 0 ? (
        <Typography sx={{ color: A.muted }}>{tr('Todavía no le hemos enviado correos.', "We haven't emailed them yet.")}</Typography>
      ) : mails.map((m) => (
        <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1, bgcolor: A.surface, border: `1px solid ${A.line}`, borderRadius: '12px' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>{m.subject || m.vars?.subject || TEMPLATE_LABELS[m.template]?.[lang] || m.template}</Typography>
            <Typography sx={{ color: A.muted, fontSize: '0.85rem' }}>
              {formatDate(m.createdAt, lang)} · {TEMPLATE_LABELS[m.template]?.[lang] ?? tr('Correo escrito por el equipo', 'Written by the team')} · {m.to}
            </Typography>
          </Box>
          <MailStatusTag status={m.status} error={m.error} />
        </Box>
      ))}
    </Box>
  );
};

export default MissionaryMail;

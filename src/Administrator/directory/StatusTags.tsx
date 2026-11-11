import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { Tag, useAdminLang } from '../adminUi';
import type { DirectoryEntry } from './directoryData';

/** Page status, profile level and "no email" labels for one missionary. */
const StatusTags: React.FC<{ entry: DirectoryEntry }> = ({ entry }) => {
  const { tr } = useAdminLang();
  return (
    <>
      {entry.status === 'draft' && <Tag tone="amber">{tr('Borrador', 'Draft')}</Tag>}
      {entry.status === 'archived' && <Tag tone="grey">{tr('Archivado', 'Archived')}</Tag>}
      {entry.complete
        ? <Tag tone="green" icon={<CheckCircleIcon />}>{tr('Perfil completo', 'Complete profile')}</Tag>
        : <Tag tone="blue">{tr('Perfil básico', 'Basic profile')}</Tag>}
      {!entry.email && <Tag tone="red" icon={<MailOutlineIcon />}>{tr('Sin correo', 'No email')}</Tag>}
    </>
  );
};

export default StatusTags;

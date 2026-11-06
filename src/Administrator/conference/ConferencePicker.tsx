import React from 'react';
import { Box, MenuItem, Select } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { AdminConferences } from './useAdminConferences';

const CURRENT = 'actual';

/** Switches the Registros / Recogidas tabs between the current conference and an archived one. */
const ConferencePicker: React.FC<{ conferences: AdminConferences; archiveId: string | null; onChange: (archiveId: string | null) => void }> =
  ({ conferences, archiveId, onChange }) => (
    <Select size="small" value={archiveId ?? CURRENT} onChange={(e) => onChange(e.target.value === CURRENT ? null : e.target.value)}
      sx={{ minWidth: 260, fontWeight: 600 }}>
      <MenuItem value={CURRENT}>{conferences.current?.name ?? 'Conferencia actual'} · actual</MenuItem>
      {conferences.archives.map((a) => (
        <MenuItem key={a.id} value={a.id}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <Inventory2OutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            {a.name} · archivo
          </Box>
        </MenuItem>
      ))}
    </Select>
  );

export default ConferencePicker;

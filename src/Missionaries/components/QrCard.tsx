import React, { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeSVG } from 'qrcode.react';
import { publicUrlFor } from '../../siteUrl';

/**
 * Desktop-only card with a QR code for the current page, so a visitor at the kiosk can
 * take the missionary's page home on their phone. The code is drawn in the browser by
 * qrcode.react — no service, no network, no cost.
 */
const QrCard: React.FC<{ pathname: string; label: string }> = ({ pathname, label }) => {
  const [open, setOpen] = useState(true);
  const url = publicUrlFor(pathname);

  if (!open) {
    return (
      <IconButton
        onClick={() => setOpen(true)}
        aria-label="Mostrar código QR"
        sx={{
          display: { xs: 'none', md: 'inline-flex' },
          position: 'fixed', right: 20, bottom: 20, zIndex: 900,
          bgcolor: '#1E3A8A', color: '#fff', boxShadow: '0 6px 20px rgba(30,58,138,0.4)',
          '&:hover': { bgcolor: '#2563EB' },
        }}
      >
        <QrCode2Icon />
      </IconButton>
    );
  }

  return (
    <Box sx={{
      display: { xs: 'none', md: 'block' },
      position: 'fixed', right: 20, bottom: 20, zIndex: 900,
      bgcolor: '#fff', borderRadius: '16px', p: 1.75, width: 190, textAlign: 'center',
      border: '1px solid rgba(37,99,235,0.15)',
      boxShadow: '0 10px 34px rgba(30,58,138,0.22)',
    }}>
      <IconButton
        onClick={() => setOpen(false)}
        aria-label="Ocultar código QR"
        size="small"
        sx={{ position: 'absolute', top: 2, right: 2, color: '#94a3b8' }}
      >
        <CloseIcon sx={{ fontSize: '1rem' }} />
      </IconButton>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <QRCodeSVG value={url} title={url} size={132} level="M" bgColor="#ffffff" fgColor="#1E3A8A" />
      </Box>
      <Typography sx={{ color: '#1E3A8A', fontWeight: 800, fontSize: '0.8rem', lineHeight: 1.35 }}>
        {label}
      </Typography>
    </Box>
  );
};

export default QrCard;

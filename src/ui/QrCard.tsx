import React from 'react';
import { Box, Typography } from '@mui/material';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import { QRCodeSVG } from 'qrcode.react';
import { publicUrlFor } from '../siteUrl';
import { BRAND } from './brand';

/**
 * "Scan with your phone" card for the kiosk: a big QR code with a phone icon and a short line
 * of what it opens, so it reads as something to do rather than decoration.
 */
const QrCard: React.FC<{ path: string; title: string; body?: string; size?: number; color?: string; layout?: 'row' | 'column' }> = ({
  path, title, body, size = 120, color = BRAND.navy, layout = 'row',
}) => (
  <Box sx={{
    display: 'flex', flexDirection: layout, alignItems: 'center', gap: 2, p: 1.75, pr: layout === 'row' ? 2.5 : 1.75,
    borderRadius: '22px', bgcolor: BRAND.white, border: `2px solid ${BRAND.blueLine}`,
    boxShadow: '0 14px 36px rgba(30,58,138,0.14)', textAlign: layout === 'row' ? 'left' : 'center',
  }}>
    <Box sx={{ p: 1, borderRadius: '14px', bgcolor: BRAND.white, border: `1px solid ${BRAND.line}`, display: 'flex', flexShrink: 0 }}>
      <QRCodeSVG value={publicUrlFor(path)} size={size} level="M" bgColor="#ffffff" fgColor={color} />
    </Box>
    <Box sx={{ minWidth: 0, maxWidth: layout === 'row' ? 250 : size + 80 }}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.4, borderRadius: '999px', bgcolor: BRAND.blueSoft, color: BRAND.navy, mb: 0.75 }}>
        <PhoneIphoneRoundedIcon sx={{ fontSize: '1.05rem' }} />
        <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Escanee con su teléfono</Typography>
      </Box>
      <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.25 }}>{title}</Typography>
      {body && <Typography sx={{ color: BRAND.muted, fontSize: '0.9rem', lineHeight: 1.4, mt: 0.5 }}>{body}</Typography>}
    </Box>
  </Box>
);

export default QrCard;

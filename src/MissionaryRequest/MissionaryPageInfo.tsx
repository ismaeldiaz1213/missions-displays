import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Collapse, Link, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Lang } from '../Registration/i18n';
import { MISSIONARY_REQUEST_PATH } from '../Home/Home';
import { EXAMPLE_MISSIONARY_PATH, PROJECT_EMAIL, REQUEST_STRINGS } from './requestI18n';

interface Props {
  lang: Lang;
  /** Show the "Send my information" button (off on the request form itself). */
  showFormButton?: boolean;
}

/** Explains the missionary page project, with an expandable live example page. */
const MissionaryPageInfo: React.FC<Props> = ({ lang, showFormButton = true }) => {
  const p = REQUEST_STRINGS[lang].project;
  const [showExample, setShowExample] = useState(false);
  const textSx = { color: 'var(--ibl-text-body)', lineHeight: 1.65, fontSize: '0.95rem' };

  return (
    <Box component="section" sx={{
      bgcolor: 'var(--ibl-surface)', borderRadius: '20px', p: { xs: 2.5, md: 4 }, textAlign: 'left',
      border: '1px solid color-mix(in srgb, var(--ibl-primary) 12%, transparent)',
      boxShadow: '0 10px 30px color-mix(in srgb, var(--ibl-primary-dark) 10%, transparent)',
    }}>
      <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.4rem' }, mb: 1.25 }}>
        {p.title}
      </Typography>
      <Typography sx={{ ...textSx, mb: 1.25 }}>{p.intro}</Typography>
      <Typography sx={{ ...textSx, mb: 1.5 }}>{p.wip}</Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Button variant="outlined" onClick={() => setShowExample((v) => !v)} aria-expanded={showExample}
          endIcon={<ExpandMoreIcon sx={{ transform: showExample ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: 'var(--ibl-primary)', borderColor: 'var(--ibl-primary)' }}>
          {showExample ? p.hideExample : p.showExample}
        </Button>
        <Button component="a" href={EXAMPLE_MISSIONARY_PATH} target="_blank" rel="noopener" endIcon={<OpenInNewIcon />}
          sx={{ textTransform: 'none', fontWeight: 600, color: 'var(--ibl-primary)' }}>
          {p.openExample}
        </Button>
      </Box>
      {/* The iframe only loads once expanded */}
      <Collapse in={showExample} unmountOnExit>
        <Box component="iframe" src={EXAMPLE_MISSIONARY_PATH} title={p.showExample} loading="lazy" sx={{
          // Bleed to the card edges on phones so the example page gets as much width as possible
          display: 'block', width: { xs: 'calc(100% + 32px)', md: '100%' }, mx: { xs: -2, md: 0 },
          height: { xs: 560, md: 620 }, mt: 1, border: '1px solid var(--ibl-border)', borderRadius: { xs: '8px', md: '12px' },
          bgcolor: 'var(--ibl-page-top)',
        }} />
      </Collapse>

      <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700, mt: 2.5, mb: 1 }}>{p.needTitle}</Typography>
      <Box component="ol" sx={{ m: 0, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {p.needs.map((need) => <Typography component="li" key={need} sx={textSx}>{need}</Typography>)}
      </Box>

      {showFormButton && (
        <Button component={RouterLink} to={`${MISSIONARY_REQUEST_PATH}?lang=${lang}`} variant="contained" size="large" sx={{
          mt: 2.5, py: 1.25, px: 3, borderRadius: '12px', textTransform: 'none', fontWeight: 800,
          color: 'var(--ibl-on-primary)', background: 'linear-gradient(135deg, var(--ibl-primary-dark) 0%, var(--ibl-primary) 100%)',
        }}>
          {p.formButton}
        </Button>
      )}

      <Typography sx={{ ...textSx, mt: 2.5 }}>
        {p.emailPrefix}{' '}
        <Link href={`mailto:${PROJECT_EMAIL}`} sx={{ color: 'var(--ibl-primary)', fontWeight: 700 }}>{PROJECT_EMAIL}</Link>
        {p.emailSuffix}
      </Typography>
      <Typography sx={{ ...textSx, mt: 1.5, fontStyle: 'italic' }}>{p.thanks}</Typography>
    </Box>
  );
};

export default MissionaryPageInfo;

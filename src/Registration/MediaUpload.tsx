import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import LockClockIcon from '@mui/icons-material/LockClock';
import PageShell, { CenterCard } from './components/PageShell';
import MediaUploader from './components/MediaUploader';
import { mediaUploadsCloseLabel, isMediaUploadOpen } from './conference';
import { LOCALES, STRINGS, useLang } from './i18n';
import { useConference } from '../data/conference';

/** Standalone "upload later" page — the link is shown to missionaries and evangelists after registering. */
const MediaUpload: React.FC = () => {
  const { registrationId = '' } = useParams<{ registrationId: string }>();
  const [lang, changeLang] = useLang();
  const t = STRINGS[lang];
  const conference = useConference();

  const shell = (children: React.ReactNode) => (
    <PageShell showDeadline={false} t={t} lang={lang} onLangChange={changeLang}>{children}</PageShell>
  );

  if (!conference) return shell(<CenterCard><CircularProgress /></CenterCard>);

  if (!isMediaUploadOpen(conference)) {
    return shell(
      <CenterCard>
        <LockClockIcon sx={{ fontSize: 56, color: 'var(--ibl-primary)', mb: 1.5 }} />
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: '1.5rem', mb: 1 }}>
          {t.uploadClosedTitle}
        </Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.7 }}>{t.uploadClosedBody}</Typography>
      </CenterCard>,
    );
  }

  return shell(
    <Box sx={{ maxWidth: 720, mx: 'auto', mt: { xs: -4, md: -5 }, px: 2, position: 'relative' }}>
      <Box className="reg-reveal" sx={{
        bgcolor: 'var(--ibl-surface)', borderRadius: '20px', p: { xs: 2.5, md: 4 },
        boxShadow: '0 15px 40px color-mix(in srgb, var(--ibl-primary-dark) 15%, transparent)',
      }}>
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.5rem' }, mb: 0.75 }}>
          {t.uploadTitle}
        </Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.6 }}>{t.uploadIntro}</Typography>
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.88rem', mt: 0.5, mb: 2.5 }}>
          {t.uploadClosesOn(mediaUploadsCloseLabel(conference, LOCALES[lang]))}
        </Typography>
        <MediaUploader registrationId={registrationId} t={t} />
      </Box>
    </Box>,
  );
};

export default MediaUpload;

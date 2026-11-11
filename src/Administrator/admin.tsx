import React, { useCallback, useEffect, useState } from 'react';
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Typography, CircularProgress, Paper,
  Chip, useTheme, useMediaQuery,
  ThemeProvider, Tabs, Tab, Badge, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PublicIcon from '@mui/icons-material/Public';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import InboxIcon from '@mui/icons-material/Inbox';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TvIcon from '@mui/icons-material/Tv';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import StorageIndicator from './StorageIndicator';
import RegistrationTable from './registrations/RegistrationTable';
import RequestTable from './requests/RequestTable';
import PickupBoard from './pickups/PickupBoard';
import KioskSettingsPanel from './kiosk/KioskSettingsPanel';
import { useAdminConferences } from './conference/useAdminConferences';
import { USE_EMULATORS, isAdminEmail } from '../firebase';
import { auth } from '../data/auth';
import { usePageTitle } from '../usePageTitle';
import iblLogo from '../assets/ibl_logo.png';
import { BRAND } from '../ui/brand';
import { AdminLangProvider, adminTheme, useAdminLang } from './adminUi';
import { DirectoryProvider, useDirectory } from './directory/directoryData';
import MissionaryDirectory from './directory/MissionaryDirectory';
import AdminHome from './home/AdminHome';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { ReportsProvider, useReports } from './reports/reportsData';
import ReportsBoard from './reports/ReportsBoard';
import MissionaryReports from './reports/MissionaryReports';
import { reportsSheet, useReportTasks } from './reports/reportTasks';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import MailCenter from './mail/MailCenter';
import MissionaryMail from './mail/MailStatus';


type AuthState = 'loading' | 'unauthenticated' | 'authenticated';

const TABS = ['inicio', 'misioneros', 'informes', 'correos', 'solicitudes', 'registros', 'recogidas', 'pantallas'] as const;
type AdminTab = (typeof TABS)[number];

const Admin: React.FC = () => (
  <ThemeProvider theme={adminTheme}>
    <AdminLangProvider>
      <AdminPage />
    </AdminLangProvider>
  </ThemeProvider>
);

const AdminPage: React.FC = () => {
  usePageTitle('Administración');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageRefresh, setStorageRefresh] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  // No ?tab= opens Inicio; every older ?tab= link still works.
  const tab: AdminTab = (TABS as readonly string[]).includes(tabParam ?? '') ? tabParam as AdminTab : 'inicio';
  // Registros and Recogidas show the current conference, or an archived one with ?conferencia=2026
  const conferences = useAdminConferences(authState === 'authenticated');
  const archiveParam = searchParams.get('conferencia');
  const archive = conferences.archives.find((a) => a.id === archiveParam) ?? null;
  const selectConference = (id: string | null) =>
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      if (id) next.set('conferencia', id); else next.delete('conferencia');
      return next;
    }, { replace: true });

  // Only church Google accounts are admins; the same check is enforced server-side in firestore.rules / storage.rules.
  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (user && isAdminEmail(user.email) && user.emailVerified) {
      setUserEmail(user.email ?? '');
      setAuthError('');
      setAuthState('authenticated');
      return;
    }
    if (user) {
      setAuthError(`${user.email} no tiene acceso. Use una cuenta @iblibertad.org o @iblibertad.com.`);
      signOut(auth);
    }
    setAuthState('unauthenticated');
  }), []);

  const signIn = async () => {
    setAuthError('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/popup-blocked') return signInWithRedirect(auth, provider);
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setAuthError(`No se pudo iniciar sesión (${code ?? String(err)}).`);
      }
    }
  };

  if (authState === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', px: 2, background: `linear-gradient(160deg, ${BRAND.page} 0%, #E8F1FC 100%)` }}>
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center', maxWidth: 420, width: '100%', borderRadius: '24px', border: `1px solid ${BRAND.line}`, boxShadow: '0 30px 70px rgba(30,58,138,0.12)' }}>
          <Box component="img" src={iblLogo} alt="" sx={{ height: 64, mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={800} color={BRAND.ink}>Administración de Misiones</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Acceso para cuentas de la iglesia · Church accounts only</Typography>
          <Typography variant="body2" sx={{ mb: 3, color: BRAND.blue, fontWeight: 700 }}>@iblibertad.org · @iblibertad.com</Typography>
          {authError && (
            <Box sx={{ bgcolor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 2, p: 1.5, mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#991B1B' }}>{authError}</Typography>
            </Box>
          )}
          <Button variant="contained" fullWidth size="large" startIcon={<LockOutlinedIcon />} onClick={signIn} sx={{ py: 1.5, fontSize: '1rem' }}>
            Iniciar sesión con Google
          </Button>
          {USE_EMULATORS && (
            // Local emulators only: a fake church account, so the admin page can be tried without Google.
            <Button fullWidth sx={{ mt: 1.5 }} onClick={() => signInWithCredential(auth, GoogleAuthProvider.credential(
              JSON.stringify({ sub: 'emulator-admin', email: 'ayuda@iblibertad.org', email_verified: true, name: 'Ayuda (prueba)' }),
            ))}>
              Entrar como ayuda@iblibertad.org (emulador)
            </Button>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <DirectoryProvider enabled>
      <ReportsProvider enabled>
      <AdminShell
        tab={tab} userEmail={userEmail} isMobile={isMobile}
        archive={archive} conferences={conferences} selectConference={selectConference}
        storageRefresh={storageRefresh} setStorageRefresh={setStorageRefresh}
        storageUsedBytes={storageUsedBytes} setStorageUsedBytes={setStorageUsedBytes}
      />
      </ReportsProvider>
    </DirectoryProvider>
  );
};

const AdminShell: React.FC<{
  tab: AdminTab;
  userEmail: string;
  isMobile: boolean;
  archive: ReturnType<typeof useAdminConferences>['archives'][number] | null;
  conferences: ReturnType<typeof useAdminConferences>;
  selectConference: (id: string | null) => void;
  storageRefresh: number;
  setStorageRefresh: React.Dispatch<React.SetStateAction<number>>;
  storageUsedBytes: number;
  setStorageUsedBytes: (n: number) => void;
}> = ({ tab, userEmail, isMobile, archive, conferences, selectConference, storageRefresh, setStorageRefresh, storageUsedBytes, setStorageUsedBytes }) => {
  const { tr, lang, setLang } = useAdminLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const { entries, requests, reload } = useDirectory();
  const reports = useReports();
  const reportTasks = useReportTasks();
  const lateReports = reportTasks.groups.find((g) => g.key === 'reportsLate')?.items.length ?? 0;
  const profileSections = [{ key: 'informes', label: tr('Informes', 'Reports'), render: (e: Parameters<typeof MissionaryReports>[0]['entry']) => <MissionaryReports entry={e} /> },
    { key: 'correos', label: tr('Correos', 'Email'), render: (e: Parameters<typeof MissionaryMail>[0]['entry']) => <MissionaryMail entry={e} /> }];
  const [pendingOverride, setPendingOverride] = useState<number | null>(null);
  const pendingRequests = pendingOverride ?? requests.filter((r) => r.status === 'pending' && !r.archived).length;
  // Stable: RequestTable reloads whenever this function changes.
  const onPendingCount = useCallback((n: number) => { setPendingOverride(n); reload(); }, [reload]);

  const tabSx = { minHeight: 52, px: { xs: 1.5, sm: 2 } };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box component="header" sx={{
        background: `linear-gradient(120deg, ${BRAND.navy} 0%, ${BRAND.blueDeep} 100%)`, color: BRAND.white,
        px: { xs: 2, sm: 3 }, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
      }}>
        <Box component="img" src={iblLogo} alt="" sx={{ height: 36, bgcolor: BRAND.white, borderRadius: '10px', p: 0.5 }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.2rem' }, lineHeight: 1.2 }}>
            {tr('Misiones · Administración', 'Missions · Admin')}
          </Typography>
          {!isMobile && <Typography sx={{ opacity: 0.75, fontSize: '0.8rem' }}>Iglesia Bautista Libertad</Typography>}
        </Box>
        {!isMobile && tab === 'misioneros' && (
          <StorageIndicator compact refreshTrigger={storageRefresh} onUsageLoaded={setStorageUsedBytes} />
        )}
        <ToggleButtonGroup exclusive size="small" value={lang} onChange={(_, v) => v && setLang(v)} sx={{
          bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '999px',
          '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.8)', border: 0, borderRadius: '999px !important', px: 1.5, py: 0.25, fontWeight: 800 },
          '& .Mui-selected': { bgcolor: `${BRAND.white} !important`, color: `${BRAND.navy} !important` },
        }}>
          <ToggleButton value="es">ES</ToggleButton>
          <ToggleButton value="en">EN</ToggleButton>
        </ToggleButtonGroup>
        {!isMobile && <Chip label={userEmail} size="small" sx={{ color: BRAND.white, bgcolor: 'rgba(255,255,255,0.14)' }} />}
        <Button startIcon={<LogoutIcon />} onClick={() => signOut(auth)} size="small" sx={{ color: BRAND.white, minWidth: 0 }}>
          {isMobile ? '' : tr('Salir', 'Sign out')}
        </Button>
      </Box>

      <Box sx={{ bgcolor: BRAND.white, borderBottom: `1px solid ${BRAND.line}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <Tabs
          value={tab}
          onChange={(_, v: AdminTab) => setSearchParams(
            v === 'inicio' ? {} : { tab: v, ...((v === 'registros' || v === 'recogidas') && archive ? { conferencia: archive.id } : {}) },
          )}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ px: { xs: 0, sm: 2 } }}
        >
          <Tab value="inicio" label={tr('Inicio', 'Home')} icon={<HomeOutlinedIcon fontSize="small" />} iconPosition="start" sx={tabSx} />
          <Tab value="misioneros" label={tr('Misioneros', 'Missionaries')} icon={<PublicIcon fontSize="small" />} iconPosition="start" sx={tabSx} />
          <Tab value="informes" iconPosition="start" sx={tabSx} label={tr('Informes', 'Reports')}
            icon={<Badge badgeContent={lateReports} color="warning"><AssignmentOutlinedIcon fontSize="small" /></Badge>} />
          <Tab value="correos" label={tr('Correos', 'Email')} icon={<MailOutlineIcon fontSize="small" />} iconPosition="start" sx={tabSx} />
          <Tab value="solicitudes" iconPosition="start" sx={tabSx}
            icon={<Badge badgeContent={pendingRequests} color="error"><InboxIcon fontSize="small" /></Badge>}
            label={tr('Solicitudes', 'Requests')} />
          <Tab value="registros" label={tr('Registros', 'Registrations')} icon={<HowToRegIcon fontSize="small" />} iconPosition="start" sx={tabSx} />
          <Tab value="recogidas" label={tr('Recogidas', 'Pickups')} icon={<DirectionsCarIcon fontSize="small" />} iconPosition="start" sx={tabSx} />
          <Tab value="pantallas" label={tr('Pantallas', 'Screens')} icon={<TvIcon fontSize="small" />} iconPosition="start" sx={tabSx} />
        </Tabs>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1600, mx: 'auto' }}>
        {tab === 'inicio' ? (
          <AdminHome extraGroups={reportTasks.groups} extraStats={reportTasks.stat} />
        ) : tab === 'misioneros' ? (
          <MissionaryDirectory
            storageUsedBytes={storageUsedBytes}
            onSaveComplete={() => setStorageRefresh((r) => r + 1)}
            extraSections={profileSections}
            extraSheets={async () => [reportsSheet(entries, reports)]}
          />
        ) : tab === 'informes' ? (
          <ReportsBoard />
        ) : tab === 'correos' ? (
          <MailCenter key={searchParams.get('para') ?? ''} />
        ) : tab === 'solicitudes' ? (
          <RequestTable onPendingCount={onPendingCount} />
        ) : (tab === 'recogidas' || tab === 'registros') && !conferences.current ? (
          conferences.error
            ? <Typography color="error.main">{conferences.error}</Typography>
            : <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : tab === 'recogidas' ? (
          <PickupBoard key={archive?.id ?? 'actual'} conferences={conferences} archive={archive} onSelectConference={selectConference} />
        ) : tab === 'pantallas' ? (
          <KioskSettingsPanel />
        ) : (
          <RegistrationTable key={archive?.id ?? 'actual'} conferences={conferences} archive={archive} onSelectConference={selectConference} />
        )}
      </Box>
    </Box>
  );
};

export default Admin;

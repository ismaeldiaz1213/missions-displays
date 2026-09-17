import React, { useEffect, useState } from 'react';
import {
  GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Typography, CircularProgress, Paper,
  AppBar, Toolbar, Chip, useTheme, useMediaQuery,
  createTheme, ThemeProvider, Tabs, Tab,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PublicIcon from '@mui/icons-material/Public';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import MissionaryTable from './MissionaryTable';
import StorageIndicator from './StorageIndicator';
import RegistrationTable from './registrations/RegistrationTable';
import { firebaseApp, isAdminEmail } from '../firebase';

const auth = getAuth(firebaseApp);

const adminTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0a0a0a', paper: '#1a1a1a' },
    primary: { main: '#2563EB' },
    divider: '#2f2f2f',
  },
  components: {
    MuiAppBar: { styleOverrides: { root: { backgroundColor: '#141414', backgroundImage: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

type AuthState = 'loading' | 'unauthenticated' | 'authenticated';

const Admin: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageRefresh, setStorageRefresh] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'registros' ? 'registros' : 'misioneros';

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
      <ThemeProvider theme={adminTheme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <ThemeProvider theme={adminTheme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
          <Paper sx={{ p: 5, textAlign: 'center', maxWidth: 400, width: '100%', border: '1px solid #2a2a2a' }}>
            <LockOutlinedIcon sx={{ fontSize: 48, color: '#555', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>Portal Administrativo</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Acceso restringido a cuentas</Typography>
            <Typography variant="body2" color="primary.light" sx={{ mb: 3 }}>@iblibertad.org · @iblibertad.com</Typography>
            {authError && (
              <Box sx={{ bgcolor: '#2a1a1a', border: '1px solid #5a2a2a', borderRadius: 1, p: 1.5, mb: 2 }}>
                <Typography variant="caption" color="error.main">{authError}</Typography>
              </Box>
            )}
            <Button
              variant="contained" fullWidth size="large"
              startIcon={<LockOutlinedIcon />}
              onClick={signIn}
              sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
            >
              Iniciar sesión con Google
            </Button>
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={adminTheme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid #2a2a2a' }}>
          <Toolbar sx={{ gap: 1, flexWrap: 'wrap', py: { xs: 1, sm: 0 } }}>
            <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ flexGrow: 1, fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
              {isMobile ? 'Admin' : 'Portal Administrativo'}
            </Typography>
            {!isMobile && tab === 'misioneros' && (
              <StorageIndicator compact refreshTrigger={storageRefresh} onUsageLoaded={setStorageUsedBytes} />
            )}
            {!isMobile && (
              <Chip label={userEmail} variant="outlined" size="small" sx={{ color: '#aaa', borderColor: '#444' }} />
            )}
            <Button startIcon={<LogoutIcon />} onClick={() => signOut(auth)} size="small"
              sx={{ color: '#aaa', textTransform: 'none', minWidth: 0 }}>
              {isMobile ? '' : 'Salir'}
            </Button>
          </Toolbar>
        </AppBar>

        <Tabs
          value={tab}
          onChange={(_, v) => setSearchParams(v === 'registros' ? { tab: v } : {}, { replace: true })}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{ px: { xs: 0, sm: 3 }, borderBottom: '1px solid #2a2a2a', bgcolor: '#141414' }}
        >
          <Tab value="misioneros" label="Misioneros" icon={<PublicIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 52 }} />
          <Tab value="registros" label="Registros" icon={<HowToRegIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 52 }} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tab === 'misioneros' ? (
            <>
              <StorageIndicator
                refreshTrigger={storageRefresh}
                onUsageLoaded={setStorageUsedBytes}
              />
              <MissionaryTable
                storageUsedBytes={storageUsedBytes}
                onSaveComplete={() => setStorageRefresh(r => r + 1)}
              />
            </>
          ) : (
            <RegistrationTable />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Admin;

import React, { useEffect, useState, useCallback } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signInWithRedirect, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import {
  Box, Button, Typography, CircularProgress, Paper,
  AppBar, Toolbar, Chip, useTheme, useMediaQuery,
  createTheme, ThemeProvider,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MissionaryTable from './MissionaryTable';
import StorageIndicator from './StorageIndicator';
import outputs from '../../amplify_outputs.json';

Amplify.configure(outputs as Parameters<typeof Amplify.configure>[0]);

const isConfigured =
  (outputs as { custom?: { API?: { endpoint?: string } } })?.custom?.API?.endpoint !== 'PLACEHOLDER';

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
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageRefresh, setStorageRefresh] = useState(0);

  const checkAuth = useCallback(async () => {
    try {
      await getCurrentUser();
      const session = await fetchAuthSession();
      const email = (session.tokens?.idToken?.payload?.email as string) ?? '';
      setUserEmail(email);
      setAuthState('authenticated');
    } catch {
      setAuthState('unauthenticated');
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) { setAuthState('unauthenticated'); return; }
    checkAuth();
    const unlisten = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') checkAuth();
      if (payload.event === 'signedOut') setAuthState('unauthenticated');
    });
    return unlisten;
  }, [checkAuth]);

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
            {!isConfigured && (
              <Box sx={{ bgcolor: '#2a1f00', border: '1px solid #5a4a00', borderRadius: 1, p: 1.5, mb: 2 }}>
                <Typography variant="caption" color="warning.main">
                  El backend no está desplegado aún. Ejecuta{' '}
                  <code style={{ background: '#333', padding: '1px 4px', borderRadius: 3 }}>npm run sandbox</code>{' '}
                  primero y luego recarga esta página.
                </Typography>
              </Box>
            )}
            <Button
              variant="contained" fullWidth size="large"
              startIcon={<LockOutlinedIcon />}
              disabled={!isConfigured}
              onClick={async () => {
                try {
                  await signInWithRedirect({ provider: 'Google' });
                } catch (err) {
                  if ((err as Error)?.name === 'UserAlreadyAuthenticatedException') {
                    checkAuth();
                  }
                }
              }}
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
              {isMobile ? 'Admin — Misioneros' : 'Portal Administrativo — Misioneros'}
            </Typography>
            {!isMobile && (
              <StorageIndicator compact refreshTrigger={storageRefresh} onUsageLoaded={setStorageUsedBytes} />
            )}
            {!isMobile && (
              <Chip label={userEmail} variant="outlined" size="small" sx={{ color: '#aaa', borderColor: '#444' }} />
            )}
            <Button startIcon={<LogoutIcon />} onClick={() => signOut()} size="small"
              sx={{ color: '#aaa', textTransform: 'none', minWidth: 0 }}>
              {isMobile ? '' : 'Salir'}
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <StorageIndicator
            refreshTrigger={storageRefresh}
            onUsageLoaded={setStorageUsedBytes}
          />
          <MissionaryTable
            storageUsedBytes={storageUsedBytes}
            onSaveComplete={() => setStorageRefresh(r => r + 1)}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Admin;

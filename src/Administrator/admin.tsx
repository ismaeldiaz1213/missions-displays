import React, { useEffect, useState, useCallback } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signInWithRedirect, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import {
  Box, Button, Typography, CircularProgress, Paper,
  AppBar, Toolbar, Chip,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MissionaryTable from './MissionaryTable';
import StorageIndicator from './StorageIndicator';
import outputs from '../../amplify_outputs.json';

Amplify.configure(outputs as Parameters<typeof Amplify.configure>[0]);

const isConfigured =
  (outputs as { custom?: { API?: { endpoint?: string } } })?.custom?.API?.endpoint !== 'PLACEHOLDER';

type AuthState = 'loading' | 'unauthenticated' | 'authenticated';

const Admin: React.FC = () => {
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0a0a0a' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0a0a0a' }}>
        <Paper sx={{ p: 5, textAlign: 'center', maxWidth: 400, width: '100%', bgcolor: '#141414', color: '#fff', border: '1px solid #2a2a2a' }}>
          <LockOutlinedIcon sx={{ fontSize: 48, color: '#555', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>Portal Administrativo</Typography>
          <Typography variant="body2" color="#888" sx={{ mb: 1 }}>Acceso restringido a cuentas</Typography>
          <Typography variant="body2" color="#90caf9" sx={{ mb: 3 }}>@iblibertad.org · @iblibertad.com</Typography>
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
            onClick={() => signInWithRedirect({ provider: 'Google' })}
            sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
          >
            Iniciar sesión con Google
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#141414', borderBottom: '1px solid #2a2a2a' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Portal Administrativo — Misioneros
          </Typography>
          <StorageIndicator
            compact
            refreshTrigger={storageRefresh}
            onUsageLoaded={setStorageUsedBytes}
          />
          <Chip label={userEmail} variant="outlined" size="small" sx={{ mr: 2, color: '#aaa', borderColor: '#444' }} />
          <Button startIcon={<LogoutIcon />} onClick={() => signOut()} sx={{ color: '#aaa', textTransform: 'none' }}>
            Salir
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
  );
};

export default Admin;

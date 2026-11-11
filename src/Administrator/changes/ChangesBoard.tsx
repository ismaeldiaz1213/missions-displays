import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import { listPendingEdits, type MissionaryEdit } from '../../data/missionaryEdits';
import { BRAND } from '../../ui/brand';
import { formatDate, panelSx, useAdminLang } from '../adminUi';
import { useDirectory } from '../directory/directoryData';
import { pageChanges } from './diff';
import ReviewDialog from './ReviewDialog';

interface PendingValue { pending: MissionaryEdit[]; loading: boolean; reload: () => Promise<void> }
const PendingContext = createContext<PendingValue>({ pending: [], loading: true, reload: async () => {} });

/** Changes missionaries have sent and are waiting for approval (for the badge, Inicio and the tab). */
export const PendingEditsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<MissionaryEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setPending((await listPendingEdits()).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const value = useMemo(() => ({ pending, loading, reload }), [pending, loading, reload]);
  return <PendingContext.Provider value={value}>{children}</PendingContext.Provider>;
};

export const usePendingEdits = () => useContext(PendingContext);

/** The Cambios tab: page changes waiting for approval, newest first. */
const ChangesBoard: React.FC = () => {
  const { tr, lang } = useAdminLang();
  const { pending, loading, reload } = usePendingEdits();
  const { entries, reload: reloadDirectory } = useDirectory();
  const [searchParams, setSearchParams] = useSearchParams();
  const openToken = searchParams.get('cambio');
  const open = (token: string | null) => setSearchParams(token ? { tab: 'cambios', cambio: token } : { tab: 'cambios' });

  return (
    <Box>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.5rem', color: BRAND.ink }}>{tr('Cambios por aprobar', 'Changes to approve')}</Typography>
      <Typography sx={{ color: BRAND.muted, mb: 2.5 }}>
        {tr('Lo que los misioneros cambiaron en su página. Nada se publica hasta que alguien lo aprueba.', 'What missionaries changed on their page. Nothing goes live until someone approves it.')}
      </Typography>
      {loading ? <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
        : pending.length === 0 ? <Alert severity="success">{tr('No hay cambios esperando aprobación.', 'No changes waiting for approval.')}</Alert>
          : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {pending.map((e) => {
                const current = entries.find((x) => x.id === e.missionaryId)?.page;
                const n = current ? pageChanges(current, e.proposed).length : null;
                return (
                  <ButtonBase key={e.token} onClick={() => open(e.token)} sx={{ ...panelSx, p: 2, justifyContent: 'flex-start', textAlign: 'left', '&:hover': { borderColor: BRAND.blueLine } }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 800 }}>{[e.proposed.name, e.proposed.lastName].filter(Boolean).join(' ')}</Typography>
                      <Typography sx={{ color: BRAND.muted, fontSize: '0.88rem' }}>
                        {tr('Enviado', 'Submitted')} {formatDate(e.submittedAt, lang)}{n !== null && ` · ${n} ${tr('campos cambiaron', 'fields changed')}`}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: BRAND.blue, fontWeight: 800 }}>{tr('Revisar', 'Review')} →</Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          )}
      {openToken && (
        <ReviewDialog token={openToken} onClose={() => open(null)}
          onDone={() => { open(null); reload(); reloadDirectory(); }} />
      )}
    </Box>
  );
};

export default ChangesBoard;

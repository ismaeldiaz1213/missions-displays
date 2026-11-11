import React, { useEffect, useState, useCallback } from 'react';
import { Box, LinearProgress, Typography, Tooltip, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { totalBytes } from '../data/storageFiles';
import { formatBytes } from './formatBytes';

const FREE_TIER_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

interface Props {
  compact?: boolean;
  onUsageLoaded?: (bytes: number) => void;
  refreshTrigger?: number;
}

const StorageIndicator: React.FC<Props> = ({ compact = false, onUsageLoaded, refreshTrigger }) => {
  const [usedBytes, setUsedBytes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const total = await totalBytes(['images', 'pdfs']);
      setUsedBytes(total);
      onUsageLoaded?.(total);
    } catch (err) {
      console.error('Failed to fetch storage usage:', err);
    } finally {
      setLoading(false);
    }
  }, [onUsageLoaded]);

  useEffect(() => { fetchUsage(); }, [fetchUsage, refreshTrigger]);

  if (usedBytes === null) return null;

  const percent = Math.min((usedBytes / FREE_TIER_BYTES) * 100, 100);
  const isWarning = percent > 70;
  const isDanger = percent > 90;
  const color = isDanger ? 'error' : isWarning ? 'warning' : 'primary';
  const textColor = isDanger ? 'error.main' : isWarning ? 'warning.main' : 'text.secondary';

  if (compact) {
    return (
      <Tooltip title={`${formatBytes(usedBytes)} de 5 GB usados — haz clic para actualizar`}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1, cursor: 'pointer' }}
          onClick={fetchUsage}
        >
          {/* Compact mode sits on the blue admin header */}
          <Typography variant="caption" color={isDanger || isWarning ? textColor : 'rgba(255,255,255,0.85)'} noWrap>
            {formatBytes(usedBytes)} / 5 GB
          </Typography>
          <LinearProgress
            variant={loading ? 'indeterminate' : 'determinate'}
            value={percent}
            color={color}
            sx={{ width: 70, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.25)', ...(color === 'primary' && { '& .MuiLinearProgress-bar': { bgcolor: '#FFFFFF' } }) }}
          />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', border: 1, borderColor: isDanger ? 'error.light' : 'divider', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Almacenamiento de archivos — límite gratuito: 5 GB
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color={textColor} fontWeight={600}>
            {formatBytes(usedBytes)} / 5 GB ({percent.toFixed(1)}%)
          </Typography>
          <IconButton size="small" onClick={fetchUsage} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <LinearProgress
        variant={loading ? 'indeterminate' : 'determinate'}
        value={percent}
        color={color}
        sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
      />
      {isWarning && !isDanger && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
          Estás usando más del 70% del almacenamiento gratuito. Considera eliminar archivos no usados.
        </Typography>
      )}
      {isDanger && (
        <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
          ⚠ Más del 90% del almacenamiento usado. Las próximas subidas pueden generar cobros.
        </Typography>
      )}
    </Box>
  );
};

export default StorageIndicator;

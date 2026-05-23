import React, { useEffect, useState, useCallback } from 'react';
import { Box, LinearProgress, Typography, Tooltip, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { list } from 'aws-amplify/storage';

const FREE_TIER_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

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
      const [images, pdfs] = await Promise.all([
        list({ path: 'images/', options: { listAll: true } }),
        list({ path: 'pdfs/', options: { listAll: true } }),
      ]);
      const total = [...images.items, ...pdfs.items]
        .reduce((acc, item) => acc + (item.size ?? 0), 0);
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
  const textColor = isDanger ? 'error.main' : isWarning ? 'warning.main' : '#aaa';

  if (compact) {
    return (
      <Tooltip title={`${formatBytes(usedBytes)} de 5 GB usados — haz clic para actualizar`}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1, cursor: 'pointer' }}
          onClick={fetchUsage}
        >
          <Typography variant="caption" color={textColor} noWrap>
            {formatBytes(usedBytes)} / 5 GB
          </Typography>
          <LinearProgress
            variant={loading ? 'indeterminate' : 'determinate'}
            value={percent}
            color={color}
            sx={{ width: 70, height: 4, borderRadius: 2, bgcolor: '#333' }}
          />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: '#141414', border: `1px solid ${isDanger ? '#5a2a2a' : '#2a2a2a'}`, borderRadius: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="#888">
          Almacenamiento S3 — límite gratuito: 5 GB
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color={textColor} fontWeight={600}>
            {formatBytes(usedBytes)} / 5 GB ({percent.toFixed(1)}%)
          </Typography>
          <IconButton size="small" onClick={fetchUsage} sx={{ color: '#555' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <LinearProgress
        variant={loading ? 'indeterminate' : 'determinate'}
        value={percent}
        color={color}
        sx={{ height: 6, borderRadius: 3, bgcolor: '#2a2a2a' }}
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

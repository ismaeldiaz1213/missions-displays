import React, { useState } from 'react';
import { Box } from '@mui/material';

const KM_PER_MILE = 1.609344;

/**
 * "A 1,250 millas de Houston". Miles first (we're in Texas); a tap switches to kilometers for
 * anyone who goes looking, without making it look like a button.
 */
const DistanceFromHouston: React.FC<{ km: number }> = ({ km }) => {
  const [metric, setMetric] = useState(false);
  const value = metric ? Math.round(km) : Math.round(km / KM_PER_MILE);
  return (
    <Box component="span" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setMetric((v) => !v); }}>
      A {value.toLocaleString('en-US')} {metric ? 'km' : 'millas'} de Houston
    </Box>
  );
};

export default DistanceFromHouston;

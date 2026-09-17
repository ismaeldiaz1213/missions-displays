import React from 'react';
import { Box, TextField } from '@mui/material';
import type { Address, PersonInfo } from '../conference';
import type { Strings } from '../i18n';

interface Props {
  prefix: string;
  value: PersonInfo;
  onChange: (patch: Partial<PersonInfo>) => void;
  errors: Record<string, string>;
  labels: Strings['person'];
  requireContact?: boolean;
  hideAddress?: boolean;
}

const grid = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 };

const PersonFields: React.FC<Props> = ({ prefix, value, onChange, errors, labels, requireContact = false, hideAddress = false }) => {
  const field = (key: keyof Omit<PersonInfo, 'address'>, extra: Record<string, unknown> = {}) => (
    <TextField
      label={labels[key]}
      value={value[key]}
      onChange={(e) => onChange({ [key]: e.target.value })}
      error={!!errors[`${prefix}.${key}`]}
      helperText={errors[`${prefix}.${key}`]}
      name={`${prefix}.${key}`}
      fullWidth
      {...extra}
    />
  );

  const setAddress = (patch: Partial<Address>) => onChange({ address: { ...value.address, ...patch } });
  const addr = (key: keyof Address, autoComplete: string) => (
    <TextField
      label={labels[key]}
      value={value.address[key]}
      onChange={(e) => setAddress({ [key]: e.target.value })}
      autoComplete={autoComplete}
      fullWidth
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={grid}>
        {field('firstName', { required: true, autoComplete: 'given-name' })}
        {field('lastName', { required: true, autoComplete: 'family-name' })}
        {field('email', { required: requireContact, type: 'email', autoComplete: 'email' })}
        {field('phone', { required: requireContact, type: 'tel', autoComplete: 'tel' })}
      </Box>
      {field('church', { required: requireContact })}
      {!hideAddress && (
        <>
          {addr('street', 'street-address')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1.2fr 1.5fr' }, gap: 2 }}>
            {addr('city', 'address-level2')}
            {addr('state', 'address-level1')}
            {addr('zip', 'postal-code')}
            {addr('country', 'country-name')}
          </Box>
        </>
      )}
    </Box>
  );
};

export default PersonFields;

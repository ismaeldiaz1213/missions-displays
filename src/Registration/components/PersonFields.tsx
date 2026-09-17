import { Box, TextField } from '@mui/material';
import type { Address, WifeInfo } from '../conference';
import type { Strings } from '../i18n';

type Person = WifeInfo & { address?: Address };

interface Props<T extends Person> {
  prefix: string;
  value: T;
  onChange: (patch: Partial<T>) => void;
  errors: Record<string, string>;
  labels: Strings['person'];
  requireContact?: boolean;
}

const grid = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 };

/** Name + contact fields, plus the address when the value has one. */
const PersonFields = <T extends Person>({ prefix, value, onChange, errors, labels, requireContact = false }: Props<T>) => {
  const field = (key: keyof WifeInfo, extra: Record<string, unknown> = {}) => (
    <TextField
      label={labels[key]}
      value={value[key]}
      onChange={(e) => onChange({ [key]: e.target.value } as Partial<T>)}
      error={!!errors[`${prefix}.${key}`]}
      helperText={errors[`${prefix}.${key}`]}
      name={`${prefix}.${key}`}
      fullWidth
      {...extra}
    />
  );

  const address = value.address;
  const addr = (key: keyof Address, autoComplete: string, htmlInput?: Record<string, string>) => (
    <TextField
      label={labels[key]}
      value={address?.[key] ?? ''}
      onChange={(e) => onChange({ address: { ...address, [key]: e.target.value } } as Partial<T>)}
      autoComplete={autoComplete}
      slotProps={htmlInput && { htmlInput }}
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
      {address && (
        <>
          {addr('street', 'street-address')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1.2fr 1.5fr' }, gap: 2 }}>
            {addr('city', 'address-level2')}
            {addr('state', 'address-level1')}
            {addr('zip', 'postal-code', { inputMode: 'numeric' })}
            {addr('country', 'country-name')}
          </Box>
        </>
      )}
    </Box>
  );
};

export default PersonFields;

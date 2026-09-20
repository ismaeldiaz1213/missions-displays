/**
 * The kiosk runs on localhost, so links meant to leave the building (QR codes, share
 * links) have to point at the public site rather than the current origin.
 */
export const PUBLIC_SITE_ORIGIN = 'https://misiones.iblibertad.org';

export const publicUrlFor = (pathname: string) => `${PUBLIC_SITE_ORIGIN}${pathname}`;

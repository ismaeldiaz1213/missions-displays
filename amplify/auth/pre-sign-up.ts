import type { PreSignUpTriggerHandler } from 'aws-lambda';

const ALLOWED_DOMAINS = ['iblibertad.org', 'iblibertad.com'];

export const handler: PreSignUpTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email ?? '';
  const domain = email.split('@')[1]?.toLowerCase() ?? '';

  if (!ALLOWED_DOMAINS.includes(domain)) {
    throw new Error('Access restricted to iblibertad.org and iblibertad.com accounts.');
  }

  // Google OAuth users must be auto-confirmed since they can't click a verification email
  if (event.triggerSource === 'PreSignUp_ExternalProvider') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  return event;
};

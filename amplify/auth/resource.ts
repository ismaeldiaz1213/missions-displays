import { defineAuth, defineFunction, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true, // required by Cognito — the UI only exposes Google sign-in
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: 'email',
        },
      },
      // After deploy, add your production Amplify URL here too
      callbackUrls: [
        'http://localhost:5173/admin',
        'https://master.d1vy4te7fv937a.amplifyapp.com/admin',
        'https://misiones.iblibertad.org/admin',
      ],
      logoutUrls: [
        'http://localhost:5173',
        'https://master.d1vy4te7fv937a.amplifyapp.com',
        'https://misiones.iblibertad.org',
      ],
    },
  },
  triggers: {
    preSignUp: defineFunction({
      name: 'pre-sign-up',
      entry: './pre-sign-up.ts',
      resourceGroupName: 'auth', // keeps trigger in the auth stack, avoids circular deps
    }),
  },
});

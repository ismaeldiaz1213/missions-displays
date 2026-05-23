import { defineFunction } from '@aws-amplify/backend';

export const missionaryFunction = defineFunction({
  name: 'missionaries',
  entry: './handler.ts',
  timeoutSeconds: 30,
});

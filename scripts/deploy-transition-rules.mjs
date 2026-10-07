/**
 * Deploys a relaxed copy of firestore.rules that accepts the previous hotel-fee formulas
 * as well as the current one, so that changing the fee never rejects a registration from a
 * visitor whose browser still has the old page.
 *
 *   npm run deploy:rules:transition   # 1. relax the live rules
 *   git push                          # 2. ship the new site
 *   npm run deploy:rules              # 3. (a day later) back to strict
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { withLegacyFees } from '../tests/rules/transitionRules.mjs';

const PROJECT = 'ibl-missions-display';
const OUT = '.firebase-transition';

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/firestore.rules`, withLegacyFees(readFileSync('firestore.rules', 'utf8')));
writeFileSync(`${OUT}/firebase.json`, JSON.stringify({ firestore: { rules: 'firestore.rules' } }, null, 2));

console.log('Deploying transitional rules (current + legacy fee formulas)…');
execFileSync('npx', ['--yes', 'firebase-tools@latest', 'deploy', '--only', 'firestore:rules', '--project', PROJECT], {
  cwd: OUT,
  stdio: 'inherit',
  env: { ...process.env, GOOGLE_CLOUD_QUOTA_PROJECT: PROJECT },
});
console.log('\nDone. Ship the site, then run `npm run deploy:rules` to go back to strict rules.');

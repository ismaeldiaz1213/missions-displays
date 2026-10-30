/**
 * Checks that firestore.rules charges the hotel fee the way calculateHotelFee does:
 * $40 per ROOM per day ($80 for laymen), a room sleeping up to four, infants not counted.
 *
 * Run it with:  npm run test:rules
 * (that starts the Firestore emulator; it never touches the real project)
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { withLegacyFees } from './transitionRules.mjs';

const RULES = new URL('../../firestore.rules', import.meta.url);
// Also accept the previous per-adult amounts while visitors still have the old page cached.
const LEGACY_RATES = process.argv.includes('--transition');

const rules = readFileSync(RULES, 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'demo-ibl-fee',
  firestore: { rules: LEGACY_RATES ? withLegacyFees(rules) : rules, host: '127.0.0.1', port: 8080 },
});
await env.clearFirestore();
const db = env.unauthenticatedContext().firestore();

const DAYS = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];

const reg = (over = {}) => ({
  language: 'es', category: 'pastor',
  registrant: { firstName: 'Juan', lastName: 'Pérez', email: 'j@x.com', phone: '555', address: { street: '', city: '', state: '', zip: '', country: '' } },
  homeChurch: 'IBL', homeChurchCity: 'Houston', missionaryBoard: '', sendingChurch: '',
  bringingWife: false, wife: null,
  bringingChildren: false, children: null,
  attendanceDays: DAYS, needsLodging: true,
  travel: {
    needsPickup: false, transport: '', airline: '', flightNumber: '', airport: '', busCompany: '', busStation: '',
    transportDetails: '', pickupLocation: '', arrivalDate: '2026-11-02', arrivalTime: '', departureDate: '',
    arrivingByRV: false, notes: '',
  },
  heardAbout: 'friend', heardAboutOther: '', specialNeeds: '',
  hotelFee: 160, createdAt: serverTimestamp(), ...over,
});

const wife = { bringingWife: true, wife: { firstName: 'Ana', lastName: 'Pérez', email: '', phone: '' } };
const kids = (count, infants = 0) => ({ bringingChildren: true, children: { count, infants, ages: '', notes: '' } });

let pass = 0, fail = 0, n = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};
const put = (over) => setDoc(doc(db, `registrations/r${n++}`), reg(over));

console.log(`hotel fee rules${LEGACY_RATES ? ' (transition: old rates still allowed)' : ''}`);

// One room, four days, $40/day = $160
await check('alone → 1 room', assertSucceeds(put({})));
await check('with wife → still 1 room', assertSucceeds(put({ ...wife })));
await check('wife + 1 infant → 1 room (infants free)', assertSucceeds(put({ ...wife, ...kids(1, 1) })));
await check('wife + 2 children → 1 room', assertSucceeds(put({ ...wife, ...kids(2) })));
await check('wife + 2 children + 1 infant → 1 room', assertSucceeds(put({ ...wife, ...kids(3, 1) })));
await check('wife + 3 children → 2 rooms ($320)', assertSucceeds(put({ ...wife, ...kids(3), hotelFee: 320 })));
await check('wife + 6 children → 2 rooms ($320)', assertSucceeds(put({ ...wife, ...kids(6), hotelFee: 320 })));
await check('wife + 7 children → 3 rooms ($480)', assertSucceeds(put({ ...wife, ...kids(7), hotelFee: 480 })));
await check('alone + 4 children → 2 rooms ($320)', assertSucceeds(put({ ...kids(4), hotelFee: 320 })));
await check('layman with wife → 1 room at $80/day ($320)', assertSucceeds(put({ category: 'layman', ...wife, hotelFee: 320 })));
await check('layman, 2 days, 2 rooms → $320', assertSucceeds(put({ category: 'layman', ...wife, ...kids(3), attendanceDays: DAYS.slice(0, 2), hotelFee: 320 })));
await check('layman with own lodging → $0', assertSucceeds(put({ category: 'layman', needsLodging: false, hotelFee: 0 })));
await check('2 days only → $80', assertSucceeds(put({ ...wife, attendanceDays: DAYS.slice(0, 2), hotelFee: 80 })));

// Still free for the people who never pay
await check('missionary → $0', assertSucceeds(put({ category: 'missionary', missionaryBoard: 'BIMI', sendingChurch: 'IBL', ...wife, hotelFee: 0 })));
await check('evangelist → $0', assertSucceeds(put({ category: 'evangelist', ...wife, hotelFee: 0 })));
await check('own lodging → $0', assertSucceeds(put({ ...wife, needsLodging: false, hotelFee: 0 })));

// Wrong amounts are refused
await check('needs lodging but $0 rejected', assertFails(put({ ...wife, hotelFee: 0 })));
await check('own lodging but charged rejected', assertFails(put({ ...wife, needsLodging: false })));
await check('arbitrary amount rejected', assertFails(put({ hotelFee: 55 })));
await check('pastor charged the layman rate rejected', assertFails(put({ hotelFee: 320 })));

// These amounts are exactly what the old per-adult formula produced, so they are only
// refused once the transition window is over and the strict rules are deployed.
if (!LEGACY_RATES) {
  await check('charging per person instead of per room rejected', assertFails(put({ ...wife, hotelFee: 320 })));
  await check('charging for an infant rejected', assertFails(put({ ...wife, ...kids(3, 1), hotelFee: 320 })));
  await check('too few rooms for a big family rejected', assertFails(put({ ...wife, ...kids(7), hotelFee: 320 })));
  await check('layman at the discounted rate rejected', assertFails(put({ category: 'layman', hotelFee: 160 })));
}

if (LEGACY_RATES) {
  await check('old $40-per-adult amount still accepted', assertSucceeds(put({ ...wife, hotelFee: 320 })));
  await check('old $50-per-adult amount still accepted', assertSucceeds(put({ ...wife, hotelFee: 400 })));
  await check('layman at the old $40 rate still accepted', assertSucceeds(put({ category: 'layman', hotelFee: 160 })));
}

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);

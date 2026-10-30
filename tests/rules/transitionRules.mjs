/**
 * Changing the hotel fee formula means the rules and the live site disagree for a few minutes
 * (and longer for anyone whose browser still has the old page cached). Deploying this relaxed
 * copy first, then the site, then the strict rules, means no registration is ever rejected.
 *
 * Used by `npm run deploy:rules:transition` and by the rules test (`--transition`).
 */
export const withLegacyFees = (rules) => {
  const patched = rules.replace(
    '&& d.hotelFee == hotelFee(d, hotelRate(d))',
    // hotelFee(d, 40): laymen before they were charged the $80 rate
    '&& (d.hotelFee == hotelFee(d, hotelRate(d)) || d.hotelFee == hotelFee(d, 40) || d.hotelFee == legacyPerAdultFee(d, 40) || d.hotelFee == legacyPerAdultFee(d, 50))',
  );
  if (patched === rules) throw new Error('fee comparison not found in firestore.rules — update transitionRules.mjs');

  // The old formula: per adult per day, before rooms (and before the $50 → $40 change).
  return patched.replace(
    '    function validRegistration(d) {',
    `    function legacyPerAdultFee(d, rate) {
      return d.category in ['missionary', 'evangelist'] || !d.needsLodging
        ? 0 : rate * d.attendanceDays.size() * (d.bringingWife ? 2 : 1);
    }

    function validRegistration(d) {`,
  );
};

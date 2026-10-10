// Day/night math for the maps (accurate to well under a degree — plenty for shading).

/** [lon, lat] of the point where the sun is directly overhead right now. */
const subsolarPoint = (date: Date): [number, number] => {
  const rad = Math.PI / 180;
  const d = date.getTime() / 86_400_000 - 10_957.5; // days since J2000
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) / rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad;
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const lon = ((((ra - gmst * 15) % 360) + 540) % 360) - 180;
  return [lon, dec];
};

/** [lon, lat] at the middle of the night side (the circle 90° around it is in darkness). */
export const nightCenter = (date: Date): [number, number] => {
  const [lon, lat] = subsolarPoint(date);
  return [lon + 180, -lat];
};

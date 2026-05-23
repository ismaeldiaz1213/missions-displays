import ContinentPageLayout from './ContinentPageLayout';
import { SOUTH_AMERICA_LAT_CENTER, SOUTH_AMERICA_LON_CENTER } from '../constants';

const SouthAmerica: React.FC = () => (
  <ContinentPageLayout title="Sur América" slug="south-america" centerLat={SOUTH_AMERICA_LAT_CENTER} centerLon={SOUTH_AMERICA_LON_CENTER} />
);
export default SouthAmerica;

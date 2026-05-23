import ContinentPageLayout from './ContinentPageLayout';
import { NORTH_AMERICA_LAT_CENTER, NORTH_AMERICA_LON_CENTER } from '../constants';

const NorthAmerica: React.FC = () => (
  <ContinentPageLayout title="América del Norte" slug="north-america" centerLat={NORTH_AMERICA_LAT_CENTER} centerLon={NORTH_AMERICA_LON_CENTER} />
);
export default NorthAmerica;

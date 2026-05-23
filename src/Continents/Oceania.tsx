import ContinentPageLayout from './ContinentPageLayout';
import { OCEANIA_LAT_CENTER, OCEANIA_LON_CENTER } from '../constants';

const Oceania: React.FC = () => (
  <ContinentPageLayout title="Oceanía" slug="oceania" centerLat={OCEANIA_LAT_CENTER} centerLon={OCEANIA_LON_CENTER} />
);
export default Oceania;

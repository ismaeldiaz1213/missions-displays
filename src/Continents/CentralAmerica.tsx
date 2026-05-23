import ContinentPageLayout from './ContinentPageLayout';
import { CENTRAL_AMERICA_LAT_CENTER, CENTRAL_AMERICA_LON_CENTER } from '../constants';

const CentralAmerica: React.FC = () => (
  <ContinentPageLayout title="Centro América" slug="central-america" centerLat={CENTRAL_AMERICA_LAT_CENTER} centerLon={CENTRAL_AMERICA_LON_CENTER} />
);
export default CentralAmerica;

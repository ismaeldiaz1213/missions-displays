import ContinentPageLayout from './ContinentPageLayout';
import { ASIA_LAT_CENTER, ASIA_LON_CENTER } from '../constants';

const Asia: React.FC = () => (
  <ContinentPageLayout title="Asia" slug="asia" centerLat={ASIA_LAT_CENTER} centerLon={ASIA_LON_CENTER} />
);
export default Asia;

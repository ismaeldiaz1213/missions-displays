import ContinentPageLayout from './ContinentPageLayout';
import { AFRICA_LAT_CENTER, AFRICA_LON_CENTER } from '../constants';

const Africa: React.FC = () => (
  <ContinentPageLayout title="África" slug="africa" centerLat={AFRICA_LAT_CENTER} centerLon={AFRICA_LON_CENTER} />
);
export default Africa;

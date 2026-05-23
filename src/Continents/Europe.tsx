import ContinentPageLayout from './ContinentPageLayout';
import { EUROPE_LAT_CENTER, EUROPE_LON_CENTER } from '../constants';

const Europe: React.FC = () => (
  <ContinentPageLayout title="Europa" slug="europe" centerLat={EUROPE_LAT_CENTER} centerLon={EUROPE_LON_CENTER} />
);
export default Europe;

import { useCallback, useEffect, useState } from 'react';
import type { ConferenceConfig } from '../../Registration/conference';
import { getConferenceFresh } from '../../data/conference';
import { listArchivedConferences, type ArchivedConference } from '../../data/conferenceArchive';

export interface AdminConferences {
  /** The conference taking registrations now; null while loading. */
  current: ConferenceConfig | null;
  /** Past conferences, newest first. */
  archives: ArchivedConference[];
  error: string;
  reload: () => Promise<void>;
}

export const useAdminConferences = (enabled: boolean): AdminConferences => {
  const [current, setCurrent] = useState<ConferenceConfig | null>(null);
  const [archives, setArchives] = useState<ArchivedConference[]>([]);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const [c, a] = await Promise.all([getConferenceFresh(), listArchivedConferences()]);
      setCurrent(c);
      setArchives(a);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de la conferencia.');
    }
  }, []);

  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);

  return { current, archives, error, reload };
};

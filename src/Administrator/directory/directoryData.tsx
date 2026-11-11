import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Missionary } from '../../types';
import { listArchived, listForAdmin, type ArchivedMissionary } from '../../data/missionaries';
import {
  contactEmail, contactPhone, listProfiles, missingFields, type MissingField, type MissionaryProfile,
} from '../../data/missionaryProfiles';
import { listMissionaryRequests, type MissionaryRequest } from '../../data/missionaryRequests';

export type PageStatus = 'published' | 'draft' | 'archived';

/** One missionary as the admin sees them: their page plus everything private. */
export interface DirectoryEntry {
  id: string;
  page: Missionary;
  status: PageStatus;
  profile: MissionaryProfile | null;
  missing: MissingField[];
  complete: boolean;
  email: string;
  phone: string;
  archive?: ArchivedMissionary;
}

export const fullName = (m: Pick<Missionary, 'name' | 'lastName'>) => [m.name, m.lastName].filter(Boolean).join(' ');

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** The request a page was created from (by draft id, else by matching name). */
export const requestFor = (id: string, page: Missionary, requests: MissionaryRequest[]) =>
  requests.find((r) => r.draftId === id)
  ?? requests.find((r) => normalize(r.lastName) === normalize(page.lastName) && normalize(page.name).startsWith(normalize(r.name)));

export const buildEntry = (page: Missionary, status: PageStatus, profile: MissionaryProfile | null, archive?: ArchivedMissionary): DirectoryEntry => {
  const missing = missingFields(page, profile);
  return {
    id: page.id, page, status, profile, missing, complete: !!profile && missing.length === 0,
    email: contactEmail(page, profile), phone: contactPhone(page, profile), archive,
  };
};

interface DirectoryValue {
  entries: DirectoryEntry[];
  requests: MissionaryRequest[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

const DirectoryContext = createContext<DirectoryValue>({
  entries: [], requests: [], loading: true, error: '', reload: async () => {},
});

/** Loads every missionary, profile and request once for all the admin tabs. */
export const DirectoryProvider: React.FC<{ enabled: boolean; children: React.ReactNode }> = ({ enabled, children }) => {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [requests, setRequests] = useState<MissionaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const [{ published, drafts }, profiles, archived, reqs] = await Promise.all([
        listForAdmin(), listProfiles(), listArchived(), listMissionaryRequests(),
      ]);
      const byId = new Map(profiles.map((p) => [p.id, p]));
      const all = [
        ...published.map((m) => buildEntry(m, 'published', byId.get(m.id) ?? null)),
        ...drafts.map((m) => buildEntry(m, 'draft', byId.get(m.id) ?? null)),
        ...archived.map((a) => buildEntry(a.page, 'archived', byId.get(a.page.id) ?? null, a)),
      ].sort((a, b) => fullName(a.page).localeCompare(fullName(b.page), 'es'));
      setEntries(all);
      setRequests(reqs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);

  const value = useMemo(() => ({ entries, requests, loading, error, reload }), [entries, requests, loading, error, reload]);
  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
};

export const useDirectory = () => useContext(DirectoryContext);

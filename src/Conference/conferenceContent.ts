// Content for the public conference landing page (/conferencia).
// The dates themselves live in src/Registration/conference.ts — this file only adds
// what the landing page needs: the schedule, the video, and the artwork.

import type { Lang } from '../Registration/i18n';

/** A video is either on YouTube or a file we host ourselves in public/. */
export type VideoSource =
  | { kind: 'youtube'; id: string }
  | { kind: 'file'; src: string; poster: string; portrait?: boolean };

/**
 * The 2026 invitation. The Spanish one is on YouTube; the English one only exists as a
 * phone video, so we host a web-encoded copy (see the README for the ffmpeg command).
 */
export const INVITATION_VIDEO: Record<Lang, VideoSource> = {
  es: { kind: 'youtube', id: 'hz0aW2ZHQ5Q' },
  en: {
    kind: 'file',
    src: '/conferencia/english-2026-invitation.mp4',
    poster: '/conferencia/english-invitation-poster.jpg',
    portrait: true,
  },
};

export type GallerySlide =
  | { kind: 'youtube'; id: string; caption: Record<Lang, string> }
  | { kind: 'image'; src: string; alt: Record<Lang, string>; caption?: Record<Lang, string> };

/**
 * "Conferencias anteriores" carousel: photos and videos from past conferences, in order.
 * Put photos in public/conferencia/galeria/ (web-sized, ~1600px wide JPGs) and list them here.
 * TODO(photos): we need more preaching photos — see docs/TODO-conference-photos.md.
 */
export const PAST_GALLERY: GallerySlide[] = [
  { kind: 'youtube', id: '3XOjWSD8qQ0', caption: { es: 'Resumen de la conferencia 2023', en: '2023 conference recap' } },
];

/** Official 2026 artwork (from src/assets/MC 2026, resized into public/conferencia). */
export const POSTER_SRC = '/conferencia/poster-2026.jpg';
export const POSTER_SRC_SMALL = '/conferencia/poster-2026-sm.jpg';
export const WHEAT_TEXTURE = '/conferencia/wheat-texture.jpg';
/** White silhouette of the globe from the artwork; tinted with a CSS mask. */
export const GLOBE_ARC = '/conferencia/globe-arc.png';

export const CHURCH_ADDRESS = '6111 Breen Dr, Houston, TX 77086';
export const CHURCH_PHONE = '281-591-1111';
export const CHURCH_SITE = 'https://iblibertad.org';

export type ScheduleKind = 'service' | 'meal' | 'registration' | 'session';

export interface ScheduleItem {
  kind: ScheduleKind;
  /** Key into the schedule label dictionaries in conferenceI18n.ts */
  label: string;
  time: string;
}

export interface ScheduleDay {
  /** Conference day, YYYY-MM-DD; must match CONFERENCE_DAYS. */
  date: string;
  items: ScheduleItem[];
}

// Same times as the 2025 conference, moved to the 2026 dates.
export const SCHEDULE: ScheduleDay[] = [
  {
    date: '2026-11-02',
    items: [
      { kind: 'registration', label: 'packetPickup', time: '12:00 PM – 6:00 PM' },
      { kind: 'meal', label: 'dinner', time: '5:30 – 7:00 PM' },
      { kind: 'service', label: 'firstService', time: '7:30 PM' },
    ],
  },
  ...['2026-11-03', '2026-11-04', '2026-11-05'].map((date) => ({
    date,
    items: [
      { kind: 'session' as const, label: 'sessions', time: '9:00 AM' },
      { kind: 'meal' as const, label: 'lunch', time: '12:00 – 1:00 PM' },
      { kind: 'meal' as const, label: 'dinner', time: '5:30 – 6:30 PM' },
      { kind: 'service' as const, label: 'service', time: '7:00 PM' },
    ],
  })),
];

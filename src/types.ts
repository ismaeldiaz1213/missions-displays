export interface ContactInfo {
  type: 'email' | 'phone' | 'facebook' | 'instagram' | 'website';
  value: string;
}

export interface MissionaryMedia {
  url: string;
  title?: string;
}

export interface Missionary {
  id: string;
  name: string;
  lastName: string;
  organization: string;
  continent: string;
  location: {
    city: string;
    country: string;
    state?: string;
    latitude: number;
    longitude: number;
  };
  profileImage: string;
  description: string;
  prayerLetter?: string;
  media: MissionaryMedia[];
  contactInfo: ContactInfo[];
  specialNotes?: string;
  startDate?: string;
  missionType: string;
}

export interface ContinentInfo {
  id: string;
  name: string;
  nameSp: string;
  route: string;
  centerLat: number;
  centerLon: number;
  color: string;
}

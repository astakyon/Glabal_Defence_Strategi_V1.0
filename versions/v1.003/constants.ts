import { CountryData } from './types';

export const INITIAL_RESOURCES = {
  budget: 100,
  intelligence: 50,
  military: 50,
  stability: 100,
};

export const THREAT_TYPES = ['Suikast', 'İç Karışıklık', 'Savaş', 'Terörizm', 'Ekonomi'] as const;

import countryData from './assets/country_data.json';

export const COUNTRY_ISO_MAP: Record<string, CountryData> = countryData;

export const VERSION = "1.003";

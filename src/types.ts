export interface CountryData {
  tr: string;
  en: string;
  code: string;
  leader: string;
  governmentType: string;
  army: number;
  economy: number;
  technology: number;
  agriculture: number;
  population: number;
  gdp: number;
  capital: string;
  language: string;
  numericId?: number;
  flagUrl?: string; // Hata mesajında flagUrl'in kullanıldığı görülüyor
}

export type CountryMetadata = Record<string, CountryData>;

// Restored types based on import errors
export interface GameState {
  turn: number;
  maxTurns: number;
  resources: any;
  threats: any[];
  units: any[];
  logs: string[];
  mapMode: string;
  gameOver: boolean;
  victory: boolean;
  worldState: Record<string, any>;
  gamePhase: string;
}

export interface Threat { 
  id: string; 
  type: string; 
  severity: number; 
  countryId: string; 
  turnsLeft: number;
}
export interface ThreatType { name: string; }
export interface Country { 
  id: string; 
  name: string; 
  numericId?: number; 
}
export interface Unit { 
  id: string; 
  countryId: string; 
  type: string; 
}
export interface CountryState { 
  id: string; 
  name: string; 
  ownerId: string; 
  color: string;
  technology: number;
  agriculture: number;
  army: number;
  economy: number;
  allies: string[];
  enemies: string[];
  leader: string;
  governmentType: string;
  spies: number;
  intelLevel: number;
  sanctions: boolean;
  isRebellion: boolean;
  capital: string;
  language: string;
  population: number;
  gdp: number;
}
export interface UserProfile { name: string; }
export interface SaveGame { id: number; timestamp: string; gameState: GameState; playerCountryId: string; }
export type MapMode = 'political' | 'military' | 'events' | 'wars' | 'threat';
export type GamePhase = 'main_menu' | 'playing';

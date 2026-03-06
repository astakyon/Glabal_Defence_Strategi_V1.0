export type ThreatType = 'Suikast' | 'İç Karışıklık' | 'Savaş' | 'Terörizm' | 'Ekonomi' | 'İç Savaş';

export type UnitType = 'Army' | 'Agent';

export type MapMode = 'political' | 'threat' | 'military' | 'wars' | 'events';

export interface Unit {
  id: string;
  type: UnitType;
  countryId: string;
}

export interface Threat {
  id: string;
  type: ThreatType;
  severity: number;
  turnsLeft: number;
  countryId: string;
}

export interface Country {
  id: string;
  name: string;
}

export interface Resources {
  budget: number;
  intelligence: number;
  military: number;
  stability: number;
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
  capital?: string;
  language?: string;
}

export type GamePhase = 'main_menu' | 'country_selection' | 'playing' | 'paused' | 'design_doc';

export interface GameState {
  turn: number;
  maxTurns: number;
  resources: Resources;
  threats: Threat[];
  units: Unit[];
  logs: string[];
  mapMode: MapMode;
  gameOver: boolean;
  victory: boolean;
  worldState: Record<string, CountryState>;
  gamePhase: GamePhase;
}

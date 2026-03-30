/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Coins, Crosshair, Users, Activity, ChevronRight, RefreshCw, Map as MapIcon, Eye, Swords, User, Globe as GlobeIcon, BookOpen, ArrowLeft, Home, Zap, Wheat, Handshake, Play, Pause, Clock, Layers, Settings, ListOrdered, Save, Info } from 'lucide-react';
import * as topojson from 'topojson-client';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { GameState, Threat, ThreatType, Country, Unit, CountryState, UserProfile, SaveGame, CountryMetadata, CountryData } from './types';
import { DataManager } from './services/dataManager';
import type { MapMode, GamePhase } from './types';
import { INITIAL_RESOURCES, THREAT_TYPES, COUNTRY_ISO_MAP, VERSION } from './constants';
import Globe from './Globe';
import EventLogSidebar from './components/EventLogSidebar';
import MainGameArea from './components/MainGameArea';
import ActionSidebar from './components/ActionSidebar';
import ActionButton from './components/ActionButton';

type AppState = 'menu' | 'gdd' | 'settings' | 'select_country' | 'playing' | 'tutorial' | 'saves' | 'profile';

const getFlag = (name: string, countryMetadata: CountryMetadata) => {
  const countryEntry = Object.entries(countryMetadata).find(
    ([eng, data]) => eng === name || data.tr === name
  );
  
  if (countryEntry) {
    const data = countryEntry[1];
    const src = data.flagUrl || `https://flagcdn.com/w40/${data.code}.png`;
    return <img src={src} alt={name} className="inline-block w-6 h-4 mr-2" />;
  }
  return <span className="mr-2">🏳️</span>;
};

const GOVERNMENT_TYPES = ['Demokrasi', 'Cumhuriyet', 'Monarşi', 'Diktatörlük', 'Komünizm'];
const LEADERS = ['Ahmet Yılmaz', 'John Doe', 'Vladimir Ivanov', 'Li Wei', 'Hans Schmidt', 'Jean Dupont', 'James Smith', 'Kenji Sato', 'Raj Patel', 'Carlos Silva'];

export default function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [playerCountry, setPlayerCountry] = useState<Country | null>(null);
  const [countriesData, setCountriesData] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [saves, setSaves] = useState<SaveGame[]>([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(2000);
  const [showThreats, setShowThreats] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'region' | 'diplomacy'>('region');
  const [actionsSubTab, setActionsSubTab] = useState<'main' | 'diplomacy' | 'covert'>('main');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [countryMetadata, setCountryMetadata] = useState<CountryMetadata>(() => DataManager.getInitializedData());
  const [initialResources, setInitialResources] = useState(() => {
    const saved = localStorage.getItem('initialResources');
    return saved ? JSON.parse(saved) : { ...INITIAL_RESOURCES };
  });
  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    maxTurns: 20,
    resources: { ...initialResources },
    threats: [],
    units: [],
    logs: ['Oyun başladı. Dünyayı yönetme sırası sizde.'],
    mapMode: 'political',
    gameOver: false,
    victory: false,
    worldState: {} as Record<string, CountryState>,
    gamePhase: 'main_menu',
  });

  const t = (key: string, tr: string, en: string) => language === 'tr' ? tr : en;

  const getCountryState = (id: string, name: string) => {
    if (isLoading) return undefined;
    
    console.log('getCountryState id:', id, 'name:', name, 'countryMetadata:', countryMetadata);
    // Find entry in countryMetadata
    const entry = (Object.values(countryMetadata) as CountryData[]).find(
      (data) => data.en === id || data.tr === id || data.code === id || data.en === name || data.tr === name
    );
    
    if (entry) {
        // Map CountryMetadata to CountryState structure
        return {
            id: entry.en, // Use English name as ID
            name: entry.tr,
            ownerId: entry.en,
            color: gameState.worldState[entry.en]?.color || '#34d399', // Keep color if it exists
            technology: gameState.worldState[entry.en]?.technology ?? entry.technology,
            agriculture: gameState.worldState[entry.en]?.agriculture ?? entry.agriculture,
            army: gameState.worldState[entry.en]?.army ?? entry.army,
            economy: gameState.worldState[entry.en]?.economy ?? entry.economy,
            allies: gameState.worldState[entry.en]?.allies || [],
            enemies: gameState.worldState[entry.en]?.enemies || [],
            leader: entry.leader,
            governmentType: entry.governmentType,
            spies: gameState.worldState[entry.en]?.spies || 0,
            intelLevel: gameState.worldState[entry.en]?.intelLevel || 0,
            sanctions: gameState.worldState[entry.en]?.sanctions || false,
            isRebellion: gameState.worldState[entry.en]?.isRebellion || false,
            capital: entry.capital,
            language: entry.language,
            population: entry.population,
            gdp: entry.gdp
        } as CountryState;
    }
    
    return undefined;
  };

  const countryState = selectedCountry ? getCountryState(selectedCountry.id, selectedCountry.name) : null;
  console.log('App.tsx countryState:', countryState, 'selectedCountry:', selectedCountry);
  const isOwnedByPlayer = countryState?.ownerId === playerCountry?.id;
  const ownerState = countryState ? getCountryState(countryState.ownerId || '', '') : null;
  const isAlly = (countryState?.allies || []).includes(playerCountry?.id || '');
  const isEnemy = (countryState?.enemies || []).includes(playerCountry?.id || '');

  const saveGame = (type: 'autosave' | 'manual' = 'manual') => {
    const newSave: SaveGame = {
      id: type === 'autosave' ? 0 : Date.now(),
      timestamp: new Date().toLocaleString(),
      gameState: gameState,
      playerCountryId: playerCountry?.id || ''
    };
    
    if (type === 'autosave') {
      localStorage.setItem('autosave', JSON.stringify(newSave));
    } else {
      const updatedSaves = [...saves.filter(s => s.id !== 0), newSave];
      setSaves(updatedSaves);
      localStorage.setItem('saves', JSON.stringify(updatedSaves));
    }
  };

  const PauseMenu = () => (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 space-y-4 w-80">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Oyun Duraklatıldı</h2>
        <button onClick={() => setIsPaused(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-full font-bold">Devam Et</button>
        <button onClick={() => { saveGame('manual'); setAppState('saves'); setIsPaused(false); }} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-full font-bold">Kayıtlar</button>
        <button onClick={() => { saveGame('manual'); setAppState('menu'); setIsPaused(false); }} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-full font-bold">Ana Menüye Dön</button>
        <button onClick={() => { setAppState('menu'); setIsPaused(false); }} className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-full font-bold">Yeni Oyuna Başla</button>
      </div>
    </div>
  );

  const loadGame = (save: SaveGame) => {
    setGameState(save.gameState);
    setPlayerCountry({ id: save.playerCountryId, name: gameState.worldState[save.playerCountryId]?.name || '' });
    setAppState('playing');
  };

  const [showRankings, setShowRankings] = useState(false);
  const [rankingsTab, setRankingsTab] = useState<'army' | 'economy' | 'agriculture' | 'technology'>('economy');
  const [settingsTab, setSettingsTab] = useState<'general' | 'database' | 'costs'>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionCosts, setActionCosts] = useState(() => {
    const saved = localStorage.getItem('actionCosts');
    return saved ? JSON.parse(saved) : {
      deployArmy: 20,
      deployAgent: 15,
      ekonomi: 30,
      peace: 500,
      attack: 200,
      spy: 50,
      intel: 20,
      sanction: 100,
      rebel: 200,
      assassinate: 500,
      rebelSuppress: 200,
      crisisSolve: 100,
      allyEconomy: 100,
      allyMilitary: 150,
      allyTech: 300,
      counterTerrorism: 150,
      counterRebellion: 200,
      counterAssassination: 50,
      counterWar: 300,
    };
  });

  const saveActionCosts = () => {
    localStorage.setItem('actionCosts', JSON.stringify(actionCosts));
    alert('Maliyetler kaydedildi!');
  };

  const saveCountryData = () => {
    DataManager.saveData(countryMetadata);
    alert('Veriler kaydedildi!');
  };

  const saveInitialResources = () => {
    localStorage.setItem('initialResources', JSON.stringify(initialResources));
    alert('Başlangıç ayarları kaydedildi!');
  };

  // Load World Map Data
  useEffect(() => {
    // console.log("useEffect running");
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) setUserProfile(JSON.parse(savedProfile));
    
    const savedGames = localStorage.getItem('saves');
    if (savedGames) setSaves(JSON.parse(savedGames));

    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(res => {
        // console.log("Map data response:", res);
        return res.json();
      })
      .then(topology => {
        const geojson = topojson.feature(topology, topology.objects.countries) as any;
        // Filter out Antarctica for better gameplay focus
        const filteredFeatures = geojson.features.filter((f: any) => f.properties.name !== 'Antarctica');
        console.log("Filtered features count:", filteredFeatures.length);
        
        // Log missing countries
        const dbCountries = Object.keys(COUNTRY_ISO_MAP);
        const featureNames = filteredFeatures.map((f: any) => f.properties.name);
        const missing = filteredFeatures.filter((f: any) => !dbCountries.includes(f.properties.name));
        // console.log("Missing countries:", missing.map((f: any) => f.properties.name));
        console.log("Filtered features count:", filteredFeatures.length);
        
        // Validate metadata
        // missing.forEach((f: any) => console.log("Country not found in metadata:", f.properties.name));
        
        // Map names to Turkish and merge geometry
        const updatedMetadata = { ...countryMetadata };
        filteredFeatures.forEach((f: any, i: number) => {
          f.properties.englishName = f.properties.name;
          // Try to find by English name first, then try to find by matching 'en' field in metadata
          let countryData = updatedMetadata[f.properties.name];
          
          if (!countryData) {
            if (f.properties?.name) {
              const normalizedName = f.properties.name.toLowerCase().replace(/\s+/g, '');
              countryData = Object.values(updatedMetadata).find((c: CountryData) => 
                (c.en?.toLowerCase().replace(/\s+/g, '') === normalizedName) ||
                (c.tr?.toLowerCase().replace(/\s+/g, '') === normalizedName)
              );
            }
          }
          
          if (countryData) {
            f.properties.name = countryData.tr;
            // Merge geometry
            countryData.geometry = f.geometry;
            // Ensure the key in updatedMetadata is the English name for consistency
            if (updatedMetadata[f.properties.name] !== countryData) {
                delete updatedMetadata[f.properties.name];
                updatedMetadata[countryData.en] = countryData;
            }
          } else {
            // console.log("Country not found in metadata:", f.properties.name);
            f.properties.name = f.properties.name + " (Eksik)";
          }
        });
        
        // console.log("Updating countryMetadata:", updatedMetadata);
        setCountryMetadata(updatedMetadata);
        localStorage.setItem('countryMetadata', JSON.stringify(updatedMetadata));
        setCountriesData(filteredFeatures);
        // console.log("Countries data set and metadata merged");
        
        // Initialize world state
        const initialWorldState: Record<string, CountryState> = {};
        const colors = ['#34d399', '#14b8a6', '#eab308', '#16a34a', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];
        
        filteredFeatures.forEach((f: any, i: number) => {
          const id = f.id || f.properties.englishName;
          const englishName = f.properties.englishName || f.id;
          const turkishName = f.properties.name;
          
          let countryData = updatedMetadata[englishName];
          if (!countryData) {
            countryData = Object.values(updatedMetadata).find((c: CountryData) => c.en?.toLowerCase() === englishName?.toLowerCase());
          }
          
          const details = countryData ? { 
            leader: countryData.leader || 'Bilinmiyor', 
            capital: countryData.capital || 'Bilinmiyor', 
            language: countryData.language || 'Yerel Dil',
            population: countryData.population || 0,
            gdp: countryData.gdp || 0
          } : { 
            leader: 'Bilinmiyor', 
            capital: 'Bilinmiyor', 
            language: 'Yerel Dil',
            population: 0,
            gdp: 0
          };
          
          initialWorldState[englishName] = {
            id: englishName,
            name: turkishName,
            ownerId: englishName,
            color: colors[i % colors.length],
            technology: countryData?.technology || 1,
            agriculture: countryData?.agriculture || 1,
            army: countryData?.army || 60,
            economy: countryData?.economy || 1,
            allies: [],
            enemies: [],
            leader: details.leader,
            governmentType: countryData?.governmentType || 'Cumhuriyet',
            spies: 0,
            intelLevel: 0,
            sanctions: false,
            isRebellion: false,
            capital: details.capital,
            language: details.language,
            population: details.population,
            gdp: details.gdp
          };
        });
        
        setGameState(prev => {
          // console.log("Setting worldState:", initialWorldState);
          return { ...prev, worldState: initialWorldState };
        });
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching map data:", err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    // console.log("gameState changed:", gameState);
  }, [gameState]);

  // Handle ESC key for pause menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && appState === 'playing') {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState]);

  // Generate a random threat
  const spawnThreat = () => {
    if (countriesData.length === 0) return null;
    
    let countryFeature;
    // 30% chance to spawn threat directly in player's country to increase local tension
    if (playerCountry && Math.random() < 0.3) {
      countryFeature = countriesData.find(c => (c.id || c.properties.name) === playerCountry.id);
    }
    
    if (!countryFeature) {
      countryFeature = countriesData[Math.floor(Math.random() * countriesData.length)];
    }

    const type = THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)];
    const severity = Math.floor(Math.random() * 5) + 1; // 1 to 5
    
    const newThreat: Threat = {
      id: Math.random().toString(36).substring(7),
      type,
      severity,
      turnsLeft: Math.floor(Math.random() * 3) + 2, // 2 to 4 turns to resolve
      countryId: countryFeature.id || countryFeature.properties.name,
    };

    return newThreat;
  };

  // Next Turn Logic
  const nextTurn = useCallback(() => {
    if (gameState.gameOver) return;

    setGameState((prev) => {
      const newLogs = [...prev.logs];
      let newStability = prev.resources.stability;
      let newBudget = prev.resources.budget;
      let newIntelligence = prev.resources.intelligence + 5;
      let newMilitary = prev.resources.military + 5;
      let newWorldState = { ...prev.worldState };

      // 1. Economy & Growth
      let totalAg = 0;
      Object.values(newWorldState).forEach((c: any) => {
        if (c.ownerId === playerCountry?.id) {
          totalAg += c.agriculture;
        }
        // AI countries also grow their armies slowly
        if (c.ownerId !== playerCountry?.id) {
          c.army += c.agriculture * 10;
        }
      });
      newBudget += totalAg * 5; // Budget from agriculture
      newBudget += 20; // Base income

      // 2. Wars & Conquest
      Object.values(newWorldState).forEach((c: any) => {
        if (c.enemies && c.enemies.length > 0) {
          const enemyId = c.enemies[0]; // Fight first enemy
          const enemy = newWorldState[enemyId];
          if (enemy) {
            const myPower = c.army * (1 + c.technology * 0.1);
            const enemyPower = enemy.army * (1 + enemy.technology * 0.1);
            
            const myCasualties = Math.floor(enemyPower * (Math.random() * 0.1 + 0.05));
            const enemyCasualties = Math.floor(myPower * (Math.random() * 0.1 + 0.05));

            c.army -= myCasualties;
            enemy.army -= enemyCasualties;

            if (c.army <= 0) {
              c.army = enemy.army * 0.1; // Leave some garrison
              c.ownerId = enemy.ownerId; // Conquered!
              c.enemies = [];
              c.allies = [];
              newLogs.unshift(`[SAVAŞ] ${enemy.name}, ${c.name} ülkesini işgal etti!`);
            }
            if (enemy.army <= 0) {
              enemy.army = c.army * 0.1;
              enemy.ownerId = c.ownerId; // Conquered!
              enemy.enemies = [];
              enemy.allies = [];
              newLogs.unshift(`[SAVAŞ] ${c.name}, ${enemy.name} ülkesini işgal etti!`);
            }
          }
        }
      });

      // Process existing threats
      let updatedThreats = prev.threats.map((t) => ({ ...t, turnsLeft: t.turnsLeft - 1 }));
      
      // Units counter threats automatically
      prev.units.forEach(unit => {
        const regionThreats = updatedThreats.filter(t => t.countryId === unit.countryId);
        if (unit.type === 'Army') {
          const target = regionThreats.find(t => t.type === 'Savaş' || t.type === 'Terörizm');
          if (target) {
            target.severity -= 1;
            const countryName = countriesData.find(c => c.id === unit.countryId)?.properties.name || 'Bilinmeyen Bölge';
            newLogs.unshift(`[Birlik] ${countryName} bölgesindeki Ordu, ${target.type} tehdidini bastırıyor.`);
          }
        } else if (unit.type === 'Agent') {
          const target = regionThreats.find(t => t.type === 'Suikast' || t.type === 'İç Karışıklık');
          if (target) {
            target.severity -= 1;
            const countryName = countriesData.find(c => c.id === unit.countryId)?.properties.name || 'Bilinmeyen Bölge';
            newLogs.unshift(`[Birlik] ${countryName} bölgesindeki Ajan, ${target.type} tehdidini zayıflatıyor.`);
          }
        }
      });

      // Filter out defeated threats and trigger expired ones
      updatedThreats = updatedThreats.filter((t) => {
        const countryName = countriesData.find(c => (c.id || c.properties.name) === t.countryId)?.properties.name || 'Bilinmeyen Bölge';
        if (t.severity <= 0) {
          newLogs.unshift(`[Başarı] ${countryName} bölgesindeki ${t.type} tehdidi tamamen yok edildi!`);
          newStability += 2;
          return false;
        }
        if (t.turnsLeft <= 0) {
          // Threat triggered!
          const isLocal = newWorldState[t.countryId]?.ownerId === playerCountry?.id;
          newLogs.unshift(`[Kritik] ${countryName} bölgesindeki ${t.type} tehdidi engellenemedi! ${isLocal ? '(ÖZ YURDUMUZDA!)' : ''}`);
          
          // Double stability damage if it's in the player's own country
          newStability -= t.severity * (isLocal ? 10 : 5);
          
          if (t.type === 'Ekonomi') newBudget -= 30;
          if (t.type === 'Savaş') newMilitary -= 20;
          if (t.type === 'Suikast') newIntelligence -= 20;
          
          return false; // Remove from list
        }
        return true; // Keep in list
      });

      // Spawn new threats
      if (Math.random() > 0.3) { // 70% chance to spawn a threat each turn
        const newThreat = spawnThreat();
        if (newThreat) {
          updatedThreats.push(newThreat);
          const countryName = countriesData.find(c => c.id === newThreat.countryId)?.properties.name || 'Bilinmeyen Bölge';
          newLogs.unshift(`[Uyarı] ${countryName} bölgesinde yeni bir ${newThreat.type} tehdidi belirdi!`);
        }
      }

      // Check win/loss conditions
      let gameOver = false;

      if (newStability <= 0 || newBudget <= -50) {
        gameOver = true;
        newLogs.unshift('Oyun Bitti! Ülke istikrarını kaybetti veya iflas etti.');
      }

      const newState = {
        ...prev,
        turn: prev.turn + 1,
        resources: {
          budget: Math.max(-50, newBudget),
          intelligence: Math.max(0, newIntelligence),
          military: Math.max(0, newMilitary),
          stability: Math.max(0, newStability),
        },
        threats: updatedThreats,
        logs: newLogs.slice(0, 50), // Keep last 50 logs
        gameOver,
        victory: false,
        worldState: newWorldState
      };

      // Autosave
      const newSave: SaveGame = {
        id: 0,
        timestamp: new Date().toLocaleString(),
        gameState: newState,
        playerCountryId: playerCountry?.id || ''
      };
      localStorage.setItem('autosave', JSON.stringify(newSave));

      return newState;
    });
  }, [countriesData, playerCountry]);

  // Actions
  const handleAction = (actionType: string) => {
    if (!selectedCountry || gameState.gameOver || gameState.victory) return;

    const regionThreats = gameState.threats.filter(t => t.countryId === selectedCountry.id);
    const regionUnits = gameState.units.filter(u => u.countryId === selectedCountry.id);
    
    setGameState((prev) => {
      let { budget, intelligence, military, stability } = prev.resources;
      const newLogs = [...prev.logs];
      let updatedThreats = [...prev.threats];
      let updatedUnits = [...prev.units];

      let actionSuccess = false;

      switch (actionType) {
        case 'deploy_army':
          if (budget >= actionCosts.deployArmy && military >= 15 && !regionUnits.some(u => u.type === 'Army')) {
            budget -= actionCosts.deployArmy;
            military -= 15;
            updatedUnits.push({ id: Math.random().toString(), type: 'Army', countryId: selectedCountry.id });
            newLogs.unshift(`${selectedCountry.name} bölgesine Ordu konuşlandırıldı.`);
            actionSuccess = true;
          }
          break;
        case 'deploy_agent':
          if (budget >= actionCosts.deployAgent && intelligence >= 10 && !regionUnits.some(u => u.type === 'Agent')) {
            budget -= actionCosts.deployAgent;
            intelligence -= 10;
            updatedUnits.push({ id: Math.random().toString(), type: 'Agent', countryId: selectedCountry.id });
            newLogs.unshift(`${selectedCountry.name} bölgesine Ajan yerleştirildi.`);
            actionSuccess = true;
          }
          break;
        case 'ekonomi':
          if (budget >= actionCosts.ekonomi) {
            budget -= actionCosts.ekonomi;
            stability += 10;
            const targetThreat = regionThreats.find(t => t.type === 'Ekonomi');
            if (targetThreat) {
              updatedThreats = updatedThreats.filter(t => t.id !== targetThreat.id);
              newLogs.unshift(`${selectedCountry.name} bölgesindeki Ekonomik kriz çözüldü!`);
            } else {
              newLogs.unshift(`${selectedCountry.name} bölgesine ekonomik yatırım yapıldı.`);
            }
            actionSuccess = true;
          }
          break;
      }

      if (!actionSuccess) {
        newLogs.unshift('Yetersiz kaynak veya bölgede zaten bu birlik var!');
        return prev;
      }

      return {
        ...prev,
        resources: { budget, intelligence, military, stability },
        threats: updatedThreats,
        units: updatedUnits,
        logs: newLogs.slice(0, 10),
      };
    });
  };

  // Auto-play effect
  useEffect(() => {
    if (!autoPlay || gameState.gameOver) return;
    const interval = setInterval(nextTurn, gameSpeed);
    return () => clearInterval(interval);
  }, [autoPlay, gameSpeed, gameState.gameOver, nextTurn]);

  const restartGame = () => {
    setGameState({
      turn: 1,
      resources: { ...initialResources },
      threats: [],
      units: [],
      logs: ['Oyun yeniden başladı. Yeni bir ülke seçin.'],
      mapMode: 'political',
      gameOver: false,
      victory: false,
    });
    setSelectedCountry(null);
    setPlayerCountry(null);
    setAppState('select_country');
  };

  const getCountryFill = (countryId: string) => {
    // Find the English ID if the provided ID is a Turkish name
    let safeId = countryId;
    const metadataEntry = Object.entries(countryMetadata).find(([_, data]) => (data as CountryData).tr === countryId || (data as CountryData).en === countryId || (data as CountryData).code === countryId);
    if (metadataEntry) {
      safeId = metadataEntry[0];
    }
    
    const countryState = gameState.worldState[safeId];
    
    if (gameState.mapMode === 'political') {
      const colors = ['#34d399', '#14b8a6', '#eab308', '#16a34a', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#f472b6', '#a78bfa', '#fb923c', '#22c55e', '#06b6d4', '#6366f1'];
      const colorIndex = safeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
      const uniqueColor = colors[colorIndex];
      if (!countryState) return uniqueColor;
      if (countryState.ownerId === playerCountry?.id) return '#3b82f6'; // blue-500
      const owner = gameState.worldState[countryState.ownerId];
      return owner ? owner.color : (countryState.color || uniqueColor);
    }
    
    if (gameState.mapMode === 'threat') {
      const threats = gameState.threats.filter(t => t.countryId === safeId);
      if (threats.length === 0) return '#1e293b';
      const totalSeverity = threats.reduce((sum, t) => sum + t.severity, 0);
      if (totalSeverity > 5) return '#ef4444'; // red-500
      if (totalSeverity > 2) return '#f97316'; // orange-500
      return '#eab308'; // yellow-500
    }

    if (gameState.mapMode === 'military') {
      if (!countryState) return '#1e293b';
      const army = countryState.army || 0;
      if (army < 20) return '#334155'; // slate-700
      if (army < 50) return '#3b82f6'; // blue-500
      return '#1e40af'; // blue-800
    }

    if (gameState.mapMode === 'wars') {
      if (!countryState) return '#1e293b';
      return countryState.enemies && countryState.enemies.length > 0 ? '#ef4444' : '#1e293b';
    }

    if (gameState.mapMode === 'events') {
      if (!countryState) return '#1e293b';
      return countryState.sanctions ? '#eab308' : '#1e293b';
    }

    return countryState?.color || '#374151';
  };

  const upgradeCountry = (type: 'technology' | 'agriculture' | 'army') => {
    if (!selectedCountry) return;
    
    setGameState(prev => {
      const cost = type === 'technology' ? 100 : type === 'agriculture' ? 50 : 30;
      if (prev.resources.budget < cost) {
        return { ...prev, logs: ['[Hata] Yetersiz bütçe!', ...prev.logs] };
      }

      const newWorldState = { ...prev.worldState };
      const country = { ...newWorldState[selectedCountry.id] };

      if (type === 'technology') country.technology += 1;
      if (type === 'agriculture') country.agriculture += 1;
      if (type === 'army') country.army += 1;

      newWorldState[selectedCountry.id] = country;

      return {
        ...prev,
        resources: { ...prev.resources, budget: prev.resources.budget - cost },
        worldState: newWorldState,
        logs: [`[Yatırım] ${country.name} ülkesinde ${type === 'technology' ? 'Teknoloji' : type === 'agriculture' ? 'Tarım' : 'Ordu'} geliştirildi.`, ...prev.logs]
      };
    });
  };

  const handleDiplomacy = (action: 'alliance' | 'war' | 'peace', targetId: string | number) => {
    if (!targetId || !playerCountry) return;
    
    // Helper to find country key in worldState
    const findCountryKey = (id: string | number) => {
      const searchId = String(id).toLowerCase().trim();
      const keys = Object.keys(gameState.worldState);
      
      // 1. Direct match (key or name)
      let foundKey = keys.find(key => 
        key.toLowerCase().trim() === searchId || 
        (gameState.worldState[key].name?.toLowerCase().trim() === searchId)
      );

      // 2. Metadata match (using numericId, tr, en, code)
      if (!foundKey) {
        const metaKey = Object.keys(countryMetadata).find(k => {
          const m = countryMetadata[k];
          return String(m.numericId) === searchId || 
                 m.tr?.toLowerCase().trim() === searchId || 
                 m.en?.toLowerCase().trim() === searchId || 
                 m.code?.toLowerCase().trim() === searchId;
        });
        
        if (metaKey) {
          // If found in metadata, try to find the corresponding key in worldState
          foundKey = keys.find(k => k === metaKey || gameState.worldState[k].name === countryMetadata[metaKey].tr);
        }
      }

      // 3. Special case for Turkey
      if (!foundKey && (searchId === 'turkey' || searchId === 'türkiye')) {
        foundKey = keys.find(key => 
          gameState.worldState[key].name?.toLowerCase().includes('türkiye') ||
          gameState.worldState[key].name?.toLowerCase().includes('turkey')
        );
      }
      
      return foundKey;
    };

    const safeTargetId = findCountryKey(targetId);
    const safePlayerId = findCountryKey(playerCountry.id);
    
    if (!safeTargetId || !safePlayerId) {
      console.warn("Diplomacy failed: Target or Player not found", { targetId, playerId: playerCountry.id, safeTargetId, safePlayerId });
      return;
    }
    
    setGameState(prev => {
      const newWorldState = { ...prev.worldState };
      const target = { ...newWorldState[safeTargetId], allies: newWorldState[safeTargetId].allies || [], enemies: newWorldState[safeTargetId].enemies || [] };
      const player = { ...newWorldState[safePlayerId], allies: newWorldState[safePlayerId].allies || [], enemies: newWorldState[safePlayerId].enemies || [] };
      let newBudget = prev.resources.budget;

      if (action === 'alliance') {
        if (!target.allies.includes(player.id)) {
          target.allies.push(player.id);
          player.allies.push(target.id);
        }
        // Remove from enemies if they were
        target.enemies = target.enemies.filter(id => id !== player.id);
        player.enemies = player.enemies.filter(id => id !== target.id);
        
        newWorldState[target.id] = target;
        newWorldState[player.id] = player;
        return {
          ...prev,
          worldState: newWorldState,
          logs: [`[Diplomasi] ${target.name} ile ittifak kuruldu!`, ...prev.logs]
        };
      } else if (action === 'war') {
        if (!target.enemies.includes(player.id)) {
          target.enemies.push(player.id);
          player.enemies.push(target.id);
        }
        // Remove from allies if they were
        target.allies = target.allies.filter(id => id !== player.id);
        player.allies = player.allies.filter(id => id !== target.id);
        
        newWorldState[target.id] = target;
        newWorldState[player.id] = player;
        return {
          ...prev,
          worldState: newWorldState,
          logs: [`[SAVAŞ] ${target.name} ülkesine savaş ilan edildi!`, ...prev.logs]
        };
      } else if (action === 'peace') {
        if (newBudget >= actionCosts.peace) {
          newBudget -= actionCosts.peace;
          target.enemies = target.enemies.filter(id => id !== player.id);
          player.enemies = player.enemies.filter(id => id !== target.id);
          newWorldState[target.id] = target;
          newWorldState[player.id] = player;
          return {
            ...prev,
            resources: { ...prev.resources, budget: newBudget },
            worldState: newWorldState,
            logs: [`[Diplomasi] ${target.name} ile barış yapıldı!`, ...prev.logs]
          };
        }
      } else if (action === 'break_alliance') {
        target.allies = target.allies.filter(id => id !== player.id);
        player.allies = player.allies.filter(id => id !== target.id);
        newWorldState[target.id] = target;
        newWorldState[player.id] = player;
        return {
          ...prev,
          worldState: newWorldState,
          logs: [`[Diplomasi] ${target.name} ile ittifak bozuldu!`, ...prev.logs]
        };
      } else if (action === 'attack') {
        if (newBudget >= actionCosts.attack) {
          newBudget -= actionCosts.attack;
          target.army = Math.max(0, target.army - 500);
          newWorldState[target.id] = target;
          return {
            ...prev,
            resources: { ...prev.resources, budget: newBudget },
            worldState: newWorldState,
            logs: [`[SAVAŞ] ${target.name} ülkesine saldırı düzenlendi!`, ...prev.logs]
          };
        }
      }
      return prev;
    });
  };

  const handleCovertAction = (action: 'spy' | 'intel' | 'sanction' | 'rebel' | 'assassinate' | 'rebel_suppress' | 'crisis_solve', targetId: string) => {
    if (!playerCountry) return;
    
    setGameState(prev => {
      const newState = { ...prev.worldState };
      const target = { ...newState[targetId] };
      let newBudget = prev.resources.budget;
      let logMsg = '';

      switch (action) {
        case 'spy':
          if (newBudget >= actionCosts.spy) {
            newBudget -= actionCosts.spy;
            target.spies += 1;
            logMsg = `[İstihbarat] ${target.name} ülkesine ajan yerleştirildi.`;
          }
          break;
        case 'intel':
          if (newBudget >= actionCosts.intel && target.spies > 0) {
            newBudget -= actionCosts.intel;
            target.intelLevel = Math.min(100, target.intelLevel + 20);
            logMsg = `[İstihbarat] ${target.name} hakkında bilgi toplandı. İstihbarat seviyesi: %${target.intelLevel}`;
          }
          break;
        case 'sanction':
          if (newBudget >= actionCosts.sanction) {
            newBudget -= actionCosts.sanction;
            target.sanctions = true;
            target.agriculture = Math.max(1, target.agriculture - 2);
            logMsg = `[Ekonomi] ${target.name} ülkesine ekonomik yaptırım uygulandı.`;
          }
          break;
        case 'rebel':
          if (newBudget >= actionCosts.rebel && target.spies > 0) {
            newBudget -= actionCosts.rebel;
            logMsg = `[Gizli Operasyon] ${target.name} ülkesindeki muhalifler desteklendi. İç savaş riski arttı.`;
            const newThreat: Threat = {
              id: Math.random().toString(36).substring(7),
              type: 'İç Savaş',
              severity: Math.floor(Math.random() * 5) + 5,
              turnsLeft: 5,
              countryId: targetId,
            };
            newState[targetId] = target;
            return {
              ...prev,
              resources: { ...prev.resources, budget: newBudget },
              worldState: newState,
              threats: [...prev.threats, newThreat],
              logs: [logMsg, ...prev.logs]
            };
          }
          break;
        case 'assassinate':
          if (newBudget >= actionCosts.assassinate && target.spies >= 2) {
            newBudget -= actionCosts.assassinate;
            target.leader = LEADERS[Math.floor(Math.random() * LEADERS.length)];
            target.spies -= 1;
            logMsg = `[Kritik] ${target.name} liderine suikast düzenlendi! Yeni lider: ${target.leader}`;
            newState[targetId] = target;
            return {
              ...prev,
              resources: { ...prev.resources, budget: newBudget },
              worldState: newState,
              logs: [logMsg, ...prev.logs]
            };
          }
          break;
        case 'rebel_suppress':
          if (newBudget >= actionCosts.rebelSuppress) {
            newBudget -= actionCosts.rebelSuppress;
            target.isRebellion = false;
            logMsg = `[İçişleri] ${target.name} ülkesindeki isyan bastırıldı.`;
            newState[targetId] = target;
            return {
              ...prev,
              resources: { ...prev.resources, budget: newBudget },
              worldState: newState,
              logs: [logMsg, ...prev.logs]
            };
          }
          break;
        case 'crisis_solve':
          if (newBudget >= actionCosts.crisisSolve) {
            newBudget -= actionCosts.crisisSolve;
            target.sanctions = false;
            logMsg = `[Ekonomi] ${target.name} ülkesindeki ekonomik kriz çözüldü.`;
            newState[targetId] = target;
            return {
              ...prev,
              resources: { ...prev.resources, budget: newBudget },
              worldState: newState,
              logs: [logMsg, ...prev.logs]
            };
          }
          break;
      }

      if (logMsg) {
        newState[targetId] = target;
        return {
          ...prev,
          resources: { ...prev.resources, budget: newBudget },
          worldState: newState,
          logs: [logMsg, ...prev.logs]
        };
      }
      return prev;
    });
  };

  const handleAllySupport = (action: 'economy' | 'military' | 'tech', targetId: string) => {
    if (!playerCountry) return;
    
    setGameState(prev => {
      const newState = { ...prev.worldState };
      const target = { ...newState[targetId] };
      let newBudget = prev.resources.budget;
      let logMsg = '';

      switch (action) {
        case 'economy':
          if (newBudget >= actionCosts.allyEconomy) {
            newBudget -= actionCosts.allyEconomy;
            target.agriculture += 1;
            logMsg = `[Destek] Müttefikimiz ${target.name}'e ekonomik paket gönderildi.`;
          }
          break;
        case 'military':
          if (newBudget >= actionCosts.allyMilitary) {
            newBudget -= actionCosts.allyMilitary;
            target.army += 2000;
            logMsg = `[Destek] Müttefikimiz ${target.name}'e askeri teçhizat ve birlik gönderildi.`;
          }
          break;
        case 'tech':
          if (newBudget >= actionCosts.allyTech) {
            newBudget -= actionCosts.allyTech;
            target.technology += 1;
            logMsg = `[Destek] Müttefikimiz ${target.name} ile teknoloji paylaşıldı.`;
          }
          break;
      }

      if (logMsg) {
        newState[targetId] = target;
        return {
          ...prev,
          resources: { ...prev.resources, budget: newBudget },
          worldState: newState,
          logs: [logMsg, ...prev.logs]
        };
      }
      return prev;
    });
  };

  const handleCounterThreat = (threatId: string, type: string, countryId: string) => {
    setGameState(prev => {
      const country = prev.worldState[countryId];
      let cost = 0;
      let reqSpies = 0;
      let logMsg = '';
      
      if (type === 'Ekonomi') { cost = actionCosts.crisisSolve; logMsg = `${country.name} ülkesindeki Ekonomik Kriz yatırımlarımızla çözüldü.`; }
      else if (type === 'Terörizm') { cost = actionCosts.counterTerrorism; logMsg = `${country.name} ülkesindeki Terörizm askeri desteğimizle bastırıldı.`; }
      else if (type === 'İç Karışıklık' || type === 'İç Savaş') { cost = actionCosts.counterRebellion; reqSpies = 1; logMsg = `${country.name} ülkesindeki isyan ajanlarımızca bastırıldı.`; }
      else if (type === 'Suikast') { cost = actionCosts.counterAssassination; reqSpies = 1; logMsg = `${country.name} liderine yönelik suikast ajanlarımızca engellendi.`; }
      else if (type === 'Savaş') { cost = actionCosts.counterWar; logMsg = `${country.name} ülkesindeki Savaş diplomatik müdahalemizle sonlandırıldı.`; }

      if (prev.resources.budget < cost) return prev;
      if (reqSpies > 0 && (country.spies || 0) < reqSpies) return prev;

      return {
        ...prev,
        resources: { ...prev.resources, budget: prev.resources.budget - cost },
        threats: prev.threats.filter(t => t.id !== threatId),
        logs: [`[MÜDAHALE] ${logMsg}`, ...prev.logs]
      };
    });
  };

  const globalRankings = React.useMemo(() => {
    const countries = Object.values(gameState.worldState) as CountryState[];
    if (countries.length === 0) return { army: [], economy: [], agriculture: [], technology: [] };
    
    return {
      army: [...countries].sort((a, b) => b.army - a.army),
      economy: [...countries].sort((a, b) => b.economy - a.economy),
      agriculture: [...countries].sort((a, b) => b.agriculture - a.agriculture),
      technology: [...countries].sort((a, b) => b.technology - a.technology),
    };
  }, [gameState.worldState]);

  const getCountryRank = (countryId: string, type: 'army' | 'economy' | 'agriculture' | 'technology') => {
    const list = globalRankings[type];
    const index = list.findIndex(c => c.id === countryId);
    return index !== -1 ? index + 1 : '-';
  };

  if (appState === 'menu') {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex font-sans text-white relative overflow-hidden">
        {/* Non-interactive Background Globe */}
        <div className="absolute right-48 top-0 bottom-0 w-1/2 flex items-center justify-center pointer-events-none">
          <div className="relative w-[750px] h-[750px]">
            <Globe 
              selectedCountryId={null} 
              onSelectCountry={() => {}} 
              getCountryFill={(id) => {
                // Generate a vibrant color based on ID hash
                const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#06b6d4'];
                return colors[hash % colors.length];
              }}
              getFlag={() => <></>}
              countryMetadata={countryMetadata}
              threats={[]}
              units={[]}
              worldState={gameState.worldState}
              interactive={false}
              showThreats={false}
              showUnits={false}
              mapMode={gameState.mapMode}
            />
          </div>
        </div>
        
        {/* Left Side Menu */}
        <div className="z-10 w-full max-w-md flex flex-col justify-center px-16 gap-6">
          <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 text-transparent bg-clip-text mb-12">
            GLOBAL<br/>DEFENSE
            <span className="text-2xl block text-white mt-2">v{VERSION}</span>
          </h1>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => loadGame(saves[saves.length - 1])}
              disabled={saves.length === 0}
              className={`text-left px-8 py-4 rounded-lg font-bold text-2xl transition-all hover:pl-12 flex items-center gap-4 ${saves.length > 0 ? 'bg-indigo-900/50 hover:bg-indigo-800/50 text-white' : 'bg-slate-800 opacity-50 cursor-not-allowed text-slate-400'}`}
            >
              <Play size={28} /> Devam Et
            </button>
            <button 
              onClick={() => setAppState('select_country')}
              className="text-left bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-lg font-bold text-2xl transition-all hover:pl-12 flex items-center gap-4"
            >
              <Shield size={28} /> Yeni Oyun
            </button>
            <button 
              onClick={() => setAppState('saves')}
              className="text-left bg-slate-800/50 hover:bg-slate-700/50 text-white px-8 py-4 rounded-lg font-bold text-2xl transition-all hover:pl-12 flex items-center gap-4"
            >
              <Save size={28} /> Kayıtlar
            </button>
            <button 
              onClick={() => setAppState('gdd')}
              className="text-left bg-slate-800/50 hover:bg-slate-700/50 text-white px-8 py-4 rounded-lg font-bold text-2xl transition-all hover:pl-12 flex items-center gap-4"
            >
              <BookOpen size={28} /> GDD
            </button>
            <button 
              onClick={() => setAppState('tutorial')}
              className="text-left bg-slate-800/50 hover:bg-slate-700/50 text-white px-8 py-4 rounded-lg font-bold text-2xl transition-all hover:pl-12 flex items-center gap-4"
            >
              <Info size={28} /> Nasıl Oynanır
            </button>
            <button 
              onClick={() => setAppState('settings')}
              className="text-left bg-slate-800/50 hover:bg-slate-700/50 text-white px-8 py-4 rounded-lg font-bold text-2xl transition-all hover:pl-12 flex items-center gap-4"
            >
              <Settings size={28} /> Ayarlar
            </button>
          </div>
        </div>
        
        {/* Profile Button Bottom Right */}
        <button 
          onClick={() => setAppState('profile')}
          className="absolute bottom-8 right-8 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white p-4 rounded-full shadow-lg transition-all flex items-center gap-3 px-6 z-20"
        >
          <User size={24} /> Profil
        </button>
      </div>
    );
  }

  if (appState === 'tutorial') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-white p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => setAppState('menu')}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 transition-colors"
          >
            <ArrowLeft size={20} /> Ana Menüye Dön
          </button>
          
          <h1 className="text-4xl font-black mb-8 text-white border-b border-slate-700 pb-4 flex items-center gap-3">
            <BookOpen size={32} /> Nasıl Oynanır?
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-indigo-400 mb-2">Dünya Yönetimi</h3>
              <p className="text-slate-300">Ülkenizi seçin ve kaynaklarınızı (Bütçe, İstihbarat, Ordu, İstikrar) yöneterek 20 tur boyunca hayatta kalın.</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-emerald-400 mb-2">Tehditler</h3>
              <p className="text-slate-300">Haritada beliren tehditleri (Savaş, Ekonomi, Suikast vb.) birliklerinizle (Ordu, Ajan) zamanında durdurun.</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-amber-400 mb-2">Diplomasi</h3>
              <p className="text-slate-300">Diğer ülkelerle ittifak kurun veya savaş ilan edin. Müttefiklerinize ekonomik ve askeri destek sağlayın.</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-rose-400 mb-2">Gizli Operasyonlar</h3>
              <p className="text-slate-300">Ajanlarınızı kullanarak düşman ülkelerde casusluk yapın, yaptırım uygulayın veya liderlerine suikast düzenleyin.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const resetGameState = () => {
    setGameState({
      turn: 1,
      maxTurns: 20,
      resources: { ...initialResources },
      threats: [],
      units: [],
      logs: ['Oyun başladı. Dünyayı yönetme sırası sizde.'],
      mapMode: 'political',
      gameOver: false,
      victory: false,
      worldState: gameState.worldState, // Keep the world state
    });
  };

  const deleteSave = (id: number) => {
    const updatedSaves = saves.filter(s => s.id !== id);
    setSaves(updatedSaves);
    localStorage.setItem('saves', JSON.stringify(updatedSaves));
  };

  if (appState === 'saves') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-white p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => setAppState('menu')}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 transition-colors"
          >
            <ArrowLeft size={20} /> Ana Menüye Dön
          </button>
          
          <h1 className="text-4xl font-black mb-8 text-white border-b border-slate-700 pb-4 flex items-center gap-3">
            <ListOrdered size={32} /> Kayıtlı Oyunlar
          </h1>
          
          <div className="space-y-4">
            {saves.length === 0 ? (
              <p className="text-slate-400 text-center py-12">Henüz kayıtlı oyun bulunmuyor.</p>
            ) : (
              saves.map((save, index) => {
                const country = countriesData.find(c => c.id === save.playerCountryId);
                return (
                  <div key={save.id} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {country?.properties.name || 'Bilinmeyen Ülke'} - Tur {save.gameState.turn}
                      </h3>
                      <p className="text-slate-400 text-sm">{save.timestamp}</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => loadGame(save)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-bold transition-all"
                      >
                        Yükle
                      </button>
                      <button 
                        onClick={() => deleteSave(save.id)}
                        className="bg-red-900 hover:bg-red-800 text-white px-6 py-3 rounded-full font-bold transition-all"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'settings') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-white p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => setAppState('menu')}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 transition-colors"
          >
            <ArrowLeft size={20} /> Ana Menüye Dön
          </button>
          
          <h1 className="text-4xl font-black mb-8 text-white border-b border-slate-700 pb-4 flex items-center gap-3">
            <Settings size={32} /> Oyun Ayarları
          </h1>

          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setSettingsTab('general')}
              className={`px-6 py-2 rounded-full font-bold ${settingsTab === 'general' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              Genel Ayarlar
            </button>
            <button 
              onClick={() => setSettingsTab('costs')}
              className={`px-6 py-2 rounded-full font-bold ${settingsTab === 'costs' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              Maliyetler
            </button>
            <button 
              onClick={() => setSettingsTab('database')}
              className={`px-6 py-2 rounded-full font-bold ${settingsTab === 'database' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              Veritabanı
            </button>
          </div>

          {settingsTab === 'general' ? (
            <div className="space-y-6">
              <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-6">
                <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">Genel Ayarlar</h2>
                <div className="flex items-center justify-between">
                  <label className="font-semibold">Oyun Tur Sayısı:</label>
                  <input 
                    type="number" 
                    value={gameState.maxTurns}
                    onChange={(e) => setGameState(prev => ({ ...prev, maxTurns: parseInt(e.target.value) || 20 }))}
                    className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white w-24"
                    min="10" max="1000"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold">Zorluk Seviyesi:</label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  >
                    <option value="easy">Kolay</option>
                    <option value="medium">Orta</option>
                    <option value="hard">Zor</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold">Dil:</label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'tr' | 'en')}
                    className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold">Otomatik Oynat:</label>
                  <input 
                    type="checkbox" 
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="w-6 h-6 accent-indigo-600"
                  />
                </div>
              </section>

              <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mt-6">
                <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">Başlangıç Ayarları</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold">Başlangıç Bütçesi:</label>
                    <input 
                      type="number" 
                      value={initialResources.budget}
                      onChange={(e) => setInitialResources(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white w-24"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold">Başlangıç İstihbaratı:</label>
                    <input 
                      type="number" 
                      value={initialResources.intelligence}
                      onChange={(e) => setInitialResources(prev => ({ ...prev, intelligence: parseInt(e.target.value) || 0 }))}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white w-24"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold">Başlangıç Askeri Gücü:</label>
                    <input 
                      type="number" 
                      value={initialResources.military}
                      onChange={(e) => setInitialResources(prev => ({ ...prev, military: parseInt(e.target.value) || 0 }))}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white w-24"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold">Başlangıç İstikrarı:</label>
                    <input 
                      type="number" 
                      value={initialResources.stability}
                      onChange={(e) => setInitialResources(prev => ({ ...prev, stability: parseInt(e.target.value) || 0 }))}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white w-24"
                      min="0"
                    />
                  </div>
                  <button onClick={saveInitialResources} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-500">Kaydet</button>
                </div>
              </section>

              <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mt-6">
                <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">Oyun Hızı</h2>
                <div className="flex items-center justify-between">
                  <label className="font-semibold">Oyun Hızı (ms):</label>
                  <input 
                    type="number" 
                    value={gameSpeed}
                    onChange={(e) => setGameSpeed(parseInt(e.target.value) || 1000)}
                    className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white w-24"
                    min="500" max="5000"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold">Ses Efektleri:</label>
                  <input 
                    type="checkbox" 
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-6 h-6 accent-indigo-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold">Müzik:</label>
                  <input 
                    type="checkbox" 
                    checked={musicEnabled}
                    onChange={(e) => setMusicEnabled(e.target.checked)}
                    className="w-6 h-6 accent-indigo-600"
                  />
                </div>
              </section>
            </div>
          ) : settingsTab === 'costs' ? (
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-6">
              <h2 className="text-2xl font-bold text-indigo-400 mb-4">Maliyet Ayarları</h2>
              {(() => {
                const ACTION_METADATA: Record<string, { trName: string, desc: string, icon: any }> = {
                  deployArmy: { trName: "Ordu Konuşlandır", desc: "Sınırlara ordu yerleştirir.", icon: Swords },
                  deployAgent: { trName: "Ajan Yerleştir", desc: "Düşman ülkeye ajan sızdırır.", icon: User },
                  ekonomi: { trName: "Ekonomi Yatırımı", desc: "Ülke ekonomisini güçlendirir.", icon: Coins },
                  peace: { trName: "Barış", desc: "Savaşı sonlandırır.", icon: Handshake },
                  attack: { trName: "Saldırı", desc: "Düşman ülkeye saldırı başlatır.", icon: Swords },
                  spy: { trName: "Casusluk", desc: "Gizli bilgi toplar.", icon: Eye },
                  intel: { trName: "İstihbarat", desc: "Düşman planlarını öğrenir.", icon: Activity },
                  sanction: { trName: "Yaptırım", desc: "Ekonomik kısıtlamalar uygular.", icon: AlertTriangle },
                  rebel: { trName: "İsyan Çıkar", desc: "Düşman ülkede kaos yaratır.", icon: AlertTriangle },
                  assassinate: { trName: "Suikast", desc: "Liderleri ortadan kaldırır.", icon: Crosshair },
                  rebelSuppress: { trName: "İsyan Bastır", desc: "İç karışıklıkları durdurur.", icon: Shield },
                  crisisSolve: { trName: "Kriz Çöz", desc: "Ülke içi krizleri çözer.", icon: RefreshCw },
                  allyEconomy: { trName: "Ekonomik Destek", desc: "Müttefik ekonomisine yardım eder.", icon: Coins },
                  allyMilitary: { trName: "Askeri Destek", desc: "Müttefik ordusuna yardım eder.", icon: Swords },
                  allyTech: { trName: "Teknoloji Desteği", desc: "Müttefik teknolojisini geliştirir.", icon: Zap },
                  counterTerrorism: { trName: "Terörle Mücadele", desc: "Terör saldırılarını önler.", icon: Shield },
                  counterRebellion: { trName: "İsyanla Mücadele", desc: "İsyanları engeller.", icon: AlertTriangle },
                  counterAssassination: { trName: "Suikast Önleme", desc: "Liderleri korur.", icon: Shield },
                  counterWar: { trName: "Savaşla Mücadele", desc: "Savaş tehditlerini bertaraf eder.", icon: Swords },
                };

                return Object.entries({
                  diplomasi: { title: "Diplomasi", icon: Handshake, description: "Uluslararası ilişkileri yönetin.", actions: ["peace", "attack"] },
                  gizli: { title: "Gizli Operasyonlar", icon: Eye, description: "Ülke dışındaki gizli faaliyetler.", actions: ["spy", "intel", "sanction", "rebel", "assassinate", "crisisSolve", "rebelSuppress"] },
                  askeri: { title: "Askeri", icon: Swords, description: "Askeri güç ve savunma.", actions: ["deployArmy", "deployAgent", "counterTerrorism", "counterRebellion", "counterAssassination", "counterWar"] },
                  ekonomi: { title: "Ekonomi", icon: Coins, description: "Ekonomik yatırımlar ve destekler.", actions: ["ekonomi", "allyEconomy", "allyMilitary", "allyTech"] }
                }).map(([category, config]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-300">
                      <config.icon className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">{config.title}</h3>
                    </div>
                    <p className="text-sm text-slate-400">{config.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {config.actions.map(action => {
                        const meta = ACTION_METADATA[action];
                        return (
                          <div key={action} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <div className="flex items-center gap-2">
                              <meta.icon className="w-4 h-4 text-slate-500" />
                              <div>
                                  <label className="text-sm font-medium">{meta.trName}</label>
                                  <p className="text-xs text-slate-500">{meta.desc}</p>
                              </div>
                            </div>
                            <input 
                              type="number" 
                              value={actionCosts[action as keyof typeof actionCosts] as number}
                              onChange={(e) => setActionCosts(prev => ({ ...prev, [action]: parseInt(e.target.value) || 0 }))}
                              className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-white w-20 text-sm"
                              min="0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
              <button onClick={saveActionCosts} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-500">Kaydet</button>
            </section>
          ) : (
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-2">Veritabanı (Ülkeler)</h2>
                <input 
                  type="text" 
                  placeholder="Ülke ara..." 
                  className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={saveCountryData} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-500">Kaydet</button>
              </div>
              <div className="flex gap-6">
                <div className="w-1/3 h-[500px] overflow-y-auto bg-slate-900 rounded-xl border border-slate-700">
                  {Object.entries(countryMetadata)
                    .filter(([eng, data]: [string, CountryData]) => 
                      eng.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (data.tr?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                    )
                    .map(([eng, data]: [string, CountryData]) => (
                      <button 
                        key={eng}
                        onClick={() => setSelectedCountryId(eng)}
                        className={`w-full text-left p-4 border-b border-slate-700 hover:bg-slate-700/50 flex items-center gap-3 ${selectedCountryId === eng ? 'bg-slate-700' : ''}`}
                      >
                        <img src={`https://flagcdn.com/w40/${data.code}.png`} alt={eng} className="w-8 h-6 rounded shadow-sm" />
                        <span className="font-medium">{data.tr}</span>
                      </button>
                    ))}
                </div>
                <div className="flex-1 bg-slate-900 p-6 rounded-xl border border-slate-700">
                  {selectedCountryId && countryMetadata[selectedCountryId] ? (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-indigo-400 mb-4">{countryMetadata[selectedCountryId].tr} Detayları</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400">Ülke Kodu (ISO)</label>
                          <input type="text" value={countryMetadata[selectedCountryId].code || ''} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], code: e.target.value}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Türkçe İsim</label>
                          <input type="text" value={countryMetadata[selectedCountryId].tr || ''} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], tr: e.target.value}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">İngilizce İsim</label>
                          <input type="text" value={countryMetadata[selectedCountryId].en || ''} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], en: e.target.value}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Bayrak URL</label>
                          <input type="text" value={countryMetadata[selectedCountryId].flagUrl || ''} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], flagUrl: e.target.value}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Başkan</label>
                          <input type="text" value={countryMetadata[selectedCountryId].leader || ''} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], leader: e.target.value}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Yönetim</label>
                          <input type="text" value={countryMetadata[selectedCountryId].governmentType || ''} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], governmentType: e.target.value}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Başkent</label>
                          <input type="text" value={countryMetadata[selectedCountryId].capital || ''} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], capital: e.target.value}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Dil</label>
                          <input type="text" value={countryMetadata[selectedCountryId].language || ''} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], language: e.target.value}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Ordu</label>
                          <input type="number" value={countryMetadata[selectedCountryId].army} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], army: parseInt(e.target.value) || 0}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Ekonomi</label>
                          <input type="number" value={countryMetadata[selectedCountryId].economy} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], economy: parseInt(e.target.value) || 0}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Teknoloji</label>
                          <input type="number" value={countryMetadata[selectedCountryId].technology} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], technology: parseInt(e.target.value) || 0}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Tarım</label>
                          <input type="number" value={countryMetadata[selectedCountryId].agriculture} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], agriculture: parseInt(e.target.value) || 0}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">Nüfus</label>
                          <input type="number" value={countryMetadata[selectedCountryId].population} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], population: parseInt(e.target.value) || 0}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">GSYİH</label>
                          <input type="number" value={countryMetadata[selectedCountryId].gdp} onChange={(e) => setCountryMetadata(prev => ({...prev, [selectedCountryId]: {...prev[selectedCountryId], gdp: parseInt(e.target.value) || 0}}))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-20">Lütfen bir ülke seçin</div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    );
  }

  if (appState === 'profile') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-white p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => setAppState('menu')}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 transition-colors"
          >
            <ArrowLeft size={20} /> Ana Menüye Dön
          </button>
          
          <h1 className="text-4xl font-black mb-8 text-white border-b border-slate-700 pb-4 flex items-center gap-3">
            <User size={32} /> Profil Bilgileri
          </h1>
          
          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-indigo-900 flex items-center justify-center text-4xl font-bold text-white border-4 border-indigo-500">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{userProfile?.name || 'Kullanıcı'}</h2>
              <p className="text-slate-400">Deneyimli Stratejist</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (appState === 'tutorial') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-white p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => setAppState('menu')}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 transition-colors"
          >
            <ArrowLeft size={20} /> Ana Menüye Dön
          </button>
          
          <h1 className="text-4xl font-black mb-8 text-white border-b border-slate-700 pb-4 flex items-center gap-3">
            <BookOpen size={32} /> Eğitim Modu
          </h1>
          
          <div className="space-y-8 text-slate-300 leading-relaxed">
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-indigo-400 mb-4">1. Temel Mekanikler</h2>
              <p>Oyun, kaynak yönetimi ve strateji üzerine kuruludur. Her tur, ülkenizin kaynaklarını (Bütçe, İstihbarat, Ordu, İstikrar) yöneterek dünyadaki krizleri çözmeye çalışırsınız.</p>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-red-400 mb-4">2. Tehditler</h2>
              <p>Dünyada Savaş, Terörizm, Suikast, İç Karışıklık ve Ekonomi krizleri çıkar. Bunları çözmek için birliklerinizi kriz bölgelerine göndermelisiniz.</p>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-blue-400 mb-4">3. Diplomasi</h2>
              <p>Diğer ülkelerle ittifak kurabilir veya savaş ilan edebilirsiniz. Müttefiklerinize destek vererek onları güçlendirebilirsiniz.</p>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2"><Eye /> 4. Gizli Operasyonlar ve Diplomasi</h2>
              <p className="mb-4">Diğer ülkelerin iç işlerine müdahale edebilir veya müttefiklerinizi destekleyebilirsiniz:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Ajan Yerleştirme:</strong> Hedef ülkeye ajan sızdırarak istihbarat toplayabilir ve gizli operasyonlar düzenleyebilirsiniz.</li>
                <li><strong>Muhalifleri Destekleme:</strong> Ajanlarınız aracılığıyla hedef ülkede iç savaş çıkarma riskini artırabilirsiniz.</li>
                <li><strong>Suikast:</strong> Hedef ülkenin liderine suikast düzenleyerek yönetimi değiştirebilir ve ülkeyi kaosa sürükleyebilirsiniz.</li>
                <li><strong>Müttefik Desteği:</strong> İttifak kurduğunuz ülkelere ekonomik, askeri ve teknolojik destek sağlayarak onları güçlendirebilirsiniz.</li>
              </ul>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center gap-2"><Activity /> 5. Kazanma ve Kaybetme</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Zafer:</strong> 20. turun sonuna kadar İstikrarınızı 0'ın üstünde tutmayı başarırsanız oyunu kazanırsınız.</li>
                <li><strong>Mağlubiyet:</strong> İstikrarınız 0 veya altına düşerse hükümetiniz düşer ve oyunu kaybedersiniz.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'gdd') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-white p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => setAppState('menu')}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 transition-colors"
          >
            <ArrowLeft size={20} /> Ana Menüye Dön
          </button>
          
          <h1 className="text-4xl font-black mb-8 text-white border-b border-slate-700 pb-4 flex items-center gap-3">
            <BookOpen size={32} /> Oyun Tasarım Dokümanı
          </h1>
          
          <div className="space-y-8 text-slate-300 leading-relaxed">
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-indigo-400 mb-4">1. Oyunun Amacı</h2>
              <p>Dünyayı yöneten bir lider olarak, ülkenizin istikrarını korumak ve küresel krizleri yönetmek.</p>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-red-400 mb-4">2. Temel Mekanikler</h2>
              <p>Kaynak yönetimi (Bütçe, İstihbarat, Ordu, İstikrar) ve tur tabanlı strateji.</p>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-blue-400 mb-4">3. Tehditler ve Krizler</h2>
              <p>Dünya genelinde ortaya çıkan Savaş, Terörizm, Suikast ve Ekonomi krizlerine karşı birliklerinizi kullanarak müdahale edin.</p>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-purple-400 mb-4">4. Gizli Operasyonlar</h2>
              <p>Ajanlarınızı kullanarak casusluk yapın, yaptırım uygulayın veya düşman liderlerine suikast düzenleyin.</p>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">5. Kazanma ve Kaybetme</h2>
              <p>Tur sonuna kadar istikrarı koruyun; aksi takdirde hükümetiniz düşer.</p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'select_country') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white relative">
        <div className="p-8 text-center bg-slate-800/80 border-b border-slate-700 shadow-lg z-10 flex items-center justify-between">
          <button 
            onClick={() => setAppState('menu')}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} /> Ana Menü
          </button>
          <div>
            <h2 className="text-4xl font-black text-indigo-400 mb-2">Ülkenizi Seçin</h2>
            <p className="text-slate-300 text-lg">Korumak ve yönetmek istediğiniz ülkeyi haritadan seçin.</p>
          </div>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
        <div className="flex-1 relative flex overflow-hidden">
          <div className="flex-1 relative">
            {countriesData.length > 0 ? (
              <Globe 
                selectedCountryId={selectedCountry?.id || null}
                onSelectCountry={(country) => {
                  setSelectedCountry(country);
                }}
                getCountryFill={getCountryFill}
                getFlag={(name, metadata) => getFlag(name, metadata as unknown as CountryMetadata)}
                countryMetadata={countryMetadata}
                threats={[]}
                units={[]}
                worldState={gameState.worldState}
                mapMode={gameState.mapMode}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 animate-pulse">
                Dünya haritası yükleniyor...
              </div>
            )}
          </div>

          {/* Country Details Panel */}
          {selectedCountry && (
            <div className="w-96 bg-gray-900 border-l border-gray-700 p-6 flex flex-col z-10">
              <div className="text-8xl mb-6 text-center">{getFlag(selectedCountry?.name || '', countryMetadata)}</div>
              <h2 className="text-4xl font-bold mb-6 text-white text-center">{selectedCountry?.name || 'Bilinmiyor'}</h2>
              
              <div className="space-y-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <span className="text-gray-400 text-xs uppercase block mb-1">Lider</span>
                  <span className="text-white font-semibold text-lg">{getCountryState(selectedCountry?.id || selectedCountry?.properties?.name || '', selectedCountry?.name || '')?.leader || 'Bilinmiyor'}</span>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <span className="text-gray-400 text-xs uppercase block mb-1">Başkent</span>
                  <span className="text-white font-semibold text-lg">{getCountryState(selectedCountry?.id || selectedCountry?.properties?.name || '', selectedCountry?.name || '')?.capital || 'Bilinmiyor'}</span>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <span className="text-gray-400 text-xs uppercase block mb-1">Resmi Dil</span>
                  <span className="text-white font-semibold text-lg">{getCountryState(selectedCountry?.id || selectedCountry?.properties?.name || '', selectedCountry?.name || '')?.language || 'Bilinmiyor'}</span>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <span className="text-gray-400 text-xs uppercase block mb-1">Nüfus</span>
                  <span className="text-white font-semibold text-lg">{getCountryState(selectedCountry?.id || selectedCountry?.properties?.name || '', selectedCountry?.name || '')?.population?.toLocaleString() || 'Bilinmiyor'}</span>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <span className="text-gray-400 text-xs uppercase block mb-1">GSYİH</span>
                  <span className="text-white font-semibold text-lg">{getCountryState(selectedCountry?.id || selectedCountry?.properties?.name || '', selectedCountry?.name || '')?.gdp?.toLocaleString() || 'Bilinmiyor'}</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!selectedCountry) return;
                  setPlayerCountry(selectedCountry);
                  setAppState('playing');
                  setGameState(prev => ({
                    ...prev,
                    logs: [`${selectedCountry.name} yönetimi devralındı. Ülkemizi dış tehditlere karşı korumalıyız!`]
                  }));
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-auto text-lg"
              >
                <Shield size={24} /> Onayla ve Başla
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-sans relative overflow-hidden">
      {/* Pause Menu Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700 min-w-[300px] text-center shadow-2xl flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white mb-4">OYUN DURAKLATILDI</h2>
            <button 
              onClick={() => setIsPaused(false)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Play size={20} /> Oyuna Devam Et
            </button>
            <button 
              onClick={() => {
                saveGame('manual');
                setAppState('saves');
                setIsPaused(false);
              }}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-6 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ListOrdered size={20} /> Kayıtlar
            </button>
            <button 
              onClick={() => {
                saveGame('manual');
                setAppState('menu');
                setIsPaused(false);
              }}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-6 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Home size={20} /> Ana Menüye Dön
            </button>
            <button 
              onClick={() => {
                setPlayerCountry(null);
                setGameState(prev => ({
                  turn: 1,
                  maxTurns: 20,
                  resources: { ...initialResources },
                  threats: [],
                  units: [],
                  logs: ['Oyun başladı. Dünyayı yönetme sırası sizde.'],
                  mapMode: 'political',
                  gameOver: false,
                  victory: false,
                  worldState: prev.worldState,
                }));
                setAppState('select_country');
                setIsPaused(false);
              }}
              className="bg-red-900 hover:bg-red-800 border border-red-700 text-white px-6 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} /> Yeni Oyuna Başla
            </button>
          </div>
        </div>
      )}
      <Header 
        playerCountry={playerCountry}
        gameState={gameState}
        autoPlay={autoPlay}
        setAutoPlay={setAutoPlay}
        gameSpeed={gameSpeed}
        setGameSpeed={setGameSpeed}
        nextTurn={nextTurn}
      />
      <div className="flex flex-1 overflow-hidden">
        <EventLogSidebar logs={gameState.logs} />
        <MainGameArea 
          gameState={gameState}
          setGameState={setGameState}
          showRankings={showRankings}
          setShowRankings={setShowRankings}
          showThreats={showThreats}
          setShowThreats={setShowThreats}
          showUnits={showUnits}
          setShowUnits={setShowUnits}
          selectedCountry={selectedCountry}
          rankingsTab={rankingsTab}
          setRankingsTab={setRankingsTab}
          countriesData={countriesData}
          getCountryFill={getCountryFill}
          getFlag={getFlag}
          countryMetadata={countryMetadata}
          onSelectCountry={setSelectedCountry}
        />
        <ActionSidebar 
          key={JSON.stringify(gameState.worldState[selectedCountry?.id || ''] || {})}
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          actionsSubTab={actionsSubTab}
          setActionsSubTab={setActionsSubTab}
          selectedCountry={selectedCountry}
          gameState={gameState}
          countryState={countryState}
          getCountryRank={getCountryRank}
          handleCounterThreat={handleCounterThreat}
          upgradeCountry={upgradeCountry}
          handleDiplomacy={handleDiplomacy}
          handleAllySupport={handleAllySupport}
          handleCovertAction={handleCovertAction}
          isOwnedByPlayer={isOwnedByPlayer}
          isAlly={isAlly}
          isEnemy={isEnemy}
        />
      </div>












                      </div>
  );
}

function Header({ playerCountry, gameState, autoPlay, setAutoPlay, gameSpeed, setGameSpeed, nextTurn }: any) {
  return (
    <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center shadow-md z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
          GLOBAL DEFENSE
          <span className="text-xs block text-gray-400">v{VERSION}</span>
        </h1>
        {playerCountry && (
          <div className="flex items-center gap-2 bg-indigo-900/50 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-200 text-sm font-medium">
            <Home size={14} /> {playerCountry.name}
          </div>
        )}
        <div className="bg-gray-800 px-4 py-1.5 rounded-full border border-gray-700 flex items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">TUR</span>
          <span className="text-white font-bold">{gameState.turn}</span>
        </div>
        
        {/* Auto-Play Controls */}
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
          <button 
            onClick={() => setAutoPlay(!autoPlay)} 
            className={`transition-colors ${autoPlay ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-white'}`}
            title={autoPlay ? "Otomatik Turu Durdur" : "Otomatik Turu Başlat"}
          >
            {autoPlay ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1"></div>
          <Clock size={14} className="text-gray-500" />
          <select 
            value={gameSpeed} 
            onChange={e => setGameSpeed(Number(e.target.value))} 
            className="bg-transparent text-white text-sm outline-none cursor-pointer"
          >
            <option value={3000} className="bg-gray-800">Yavaş</option>
            <option value={1500} className="bg-gray-800">Normal</option>
            <option value={500} className="bg-gray-800">Hızlı</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-6">
        <ResourceItem icon={<Coins size={20} className="text-yellow-400" />} label="Bütçe" value={gameState.resources.budget} />
        <ResourceItem icon={<Activity size={20} className="text-blue-400" />} label="İstihbarat" value={gameState.resources.intelligence} />
        <ResourceItem icon={<Crosshair size={20} className="text-red-400" />} label="Askeri Güç" value={gameState.resources.military} />
        <ResourceItem icon={<Users size={20} className="text-green-400" />} label="İstikrar" value={gameState.resources.stability} />
      </div>

      <button 
        onClick={nextTurn}
        disabled={gameState.gameOver || gameState.victory}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        Turu Bitir <ChevronRight size={18} />
      </button>
    </header>
  );
}

function ResourceItem(props: { icon: React.ReactNode, label: string, value: number }) {
  const { icon, label, value } = props;
  return (
    <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
      {icon}
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-400 uppercase leading-none">{label}</span>
        <span className="font-bold leading-tight">{value}</span>
      </div>
    </div>
  );
}

function MapLegend({ mapMode }: { mapMode: MapMode }) {
  const legends: Record<MapMode, { title: string, items: { label: string, color: string }[] }> = {
    political: { title: 'Politik Harita', items: [{ label: 'Oyuncu', color: '#4f46e5' }, { label: 'Diğer', color: '#1f2937' }] },
    threat: { title: 'Tehdit Seviyesi', items: [{ label: 'Yüksek', color: '#991b1b' }, { label: 'Orta', color: '#b45309' }, { label: 'Düşük', color: '#854d0e' }] },
    military: { title: 'Askeri Güç', items: [{ label: 'Ordu Var', color: '#1e3a8a' }, { label: 'Diğer', color: '#312e81' }] },
    wars: { title: 'Savaş Durumu', items: [{ label: 'Savaşta', color: '#ef4444' }, { label: 'Barış', color: '#1f2937' }] },
    events: { title: 'Olaylar (Yaptırımlar)', items: [{ label: 'Yaptırım Var', color: '#eab308' }, { label: 'Sakin', color: '#1f2937' }] },
  };

  const legend = legends[mapMode];
  return (
    <div className="absolute bottom-4 left-4 z-20 bg-gray-800/90 p-4 rounded-xl border border-gray-700 shadow-xl">
      <h4 className="text-white font-bold text-sm mb-2">{legend.title}</h4>
      {mapMode === 'events' && <p className="text-xs text-gray-400 mb-2">Yaptırım uygulanan ülkeleri gösterir.</p>}
      <div className="space-y-1">
        {legend.items.map(item => (
          <div key={item.label} className="flex items-center gap-2 text-xs text-gray-300">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}



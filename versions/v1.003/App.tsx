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
  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    maxTurns: 20,
    resources: { ...INITIAL_RESOURCES },
    threats: [],
    units: [],
    logs: ['Oyun başladı. Dünyayı yönetme sırası sizde.'],
    mapMode: 'political',
    gameOver: false,
    victory: false,
    worldState: {} as Record<string, CountryState>,
    gamePhase: 'main_menu',
  });

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [saves, setSaves] = useState<SaveGame[]>([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(2000);
  const [showThreats, setShowThreats] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'region' | 'actions'>('region');
  const [actionsSubTab, setActionsSubTab] = useState<'main' | 'diplomacy' | 'covert' | 'threats'>('main');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [countryMetadata, setCountryMetadata] = useState<CountryMetadata>(() => DataManager.getInitializedData());

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
            technology: entry.technology,
            agriculture: entry.agriculture,
            army: entry.army,
            economy: entry.economy,
            allies: gameState.worldState[entry.en]?.allies || [],
            enemies: gameState.worldState[entry.en]?.enemies || [],
            leader: entry.leader,
            governmentType: entry.governmentType,
            spies: gameState.worldState[entry.en]?.spies || 0,
            intelLevel: gameState.worldState[entry.en]?.intelLevel || 0,
            sanctions: gameState.worldState[entry.en]?.sanctions || false,
            capital: entry.capital,
            language: entry.language
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
  const [settingsTab, setSettingsTab] = useState<'general' | 'database'>('general');
  const [searchQuery, setSearchQuery] = useState('');

  const saveCountryData = () => {
    DataManager.saveData(countryMetadata);
    alert('Veriler kaydedildi!');
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
          const turkishName = f.properties.name;
          const englishName = f.properties.englishName;
          
          let countryData = updatedMetadata[englishName];
          if (!countryData) {
            countryData = Object.values(updatedMetadata).find((c: CountryData) => c.en?.toLowerCase() === englishName?.toLowerCase());
          }
          
          const details = countryData ? { 
            leader: countryData.leader || 'Bilinmiyor', 
            capital: countryData.capital || 'Bilinmiyor', 
            language: countryData.language || 'Yerel Dil' 
          } : { 
            leader: 'Bilinmiyor', 
            capital: 'Bilinmiyor', 
            language: 'Yerel Dil' 
          };
          
          initialWorldState[id] = {
            id,
            name: turkishName,
            ownerId: id,
            color: colors[i % colors.length],
            technology: countryData?.technology || 1,
            agriculture: countryData?.agriculture || 1,
            army: countryData?.army || 1000,
            economy: countryData?.economy || 1,
            allies: [],
            enemies: [],
            leader: details.leader,
            governmentType: countryData?.governmentType || 'Cumhuriyet',
            spies: 0,
            intelLevel: 0,
            sanctions: false,
            capital: details.capital,
            language: details.language
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
          if (budget >= 20 && military >= 15 && !regionUnits.some(u => u.type === 'Army')) {
            budget -= 20;
            military -= 15;
            updatedUnits.push({ id: Math.random().toString(), type: 'Army', countryId: selectedCountry.id });
            newLogs.unshift(`${selectedCountry.name} bölgesine Ordu konuşlandırıldı.`);
            actionSuccess = true;
          }
          break;
        case 'deploy_agent':
          if (budget >= 15 && intelligence >= 10 && !regionUnits.some(u => u.type === 'Agent')) {
            budget -= 15;
            intelligence -= 10;
            updatedUnits.push({ id: Math.random().toString(), type: 'Agent', countryId: selectedCountry.id });
            newLogs.unshift(`${selectedCountry.name} bölgesine Ajan yerleştirildi.`);
            actionSuccess = true;
          }
          break;
        case 'ekonomi':
          if (budget >= 30) {
            budget -= 30;
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
      resources: { ...INITIAL_RESOURCES },
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
      if (type === 'army') country.army += 1000;

      newWorldState[selectedCountry.id] = country;

      return {
        ...prev,
        resources: { ...prev.resources, budget: prev.resources.budget - cost },
        worldState: newWorldState,
        logs: [`[Yatırım] ${country.name} ülkesinde ${type === 'technology' ? 'Teknoloji' : type === 'agriculture' ? 'Tarım' : 'Ordu'} geliştirildi.`, ...prev.logs]
      };
    });
  };

  const handleDiplomacy = (action: 'alliance' | 'war', targetId: string | number) => {
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
      }
      return prev;
    });
  };

  const handleCovertAction = (action: 'spy' | 'intel' | 'sanction' | 'rebel' | 'assassinate', targetId: string) => {
    if (!playerCountry) return;
    
    setGameState(prev => {
      const newState = { ...prev.worldState };
      const target = { ...newState[targetId] };
      let newBudget = prev.resources.budget;
      let logMsg = '';

      switch (action) {
        case 'spy':
          if (newBudget >= 50) {
            newBudget -= 50;
            target.spies += 1;
            logMsg = `[İstihbarat] ${target.name} ülkesine ajan yerleştirildi.`;
          }
          break;
        case 'intel':
          if (newBudget >= 20 && target.spies > 0) {
            newBudget -= 20;
            target.intelLevel = Math.min(100, target.intelLevel + 20);
            logMsg = `[İstihbarat] ${target.name} hakkında bilgi toplandı. İstihbarat seviyesi: %${target.intelLevel}`;
          }
          break;
        case 'sanction':
          if (newBudget >= 100) {
            newBudget -= 100;
            target.sanctions = true;
            target.agriculture = Math.max(1, target.agriculture - 2);
            logMsg = `[Ekonomi] ${target.name} ülkesine ekonomik yaptırım uygulandı.`;
          }
          break;
        case 'rebel':
          if (newBudget >= 200 && target.spies > 0) {
            newBudget -= 200;
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
          if (newBudget >= 500 && target.spies >= 2) {
            newBudget -= 500;
            target.leader = LEADERS[Math.floor(Math.random() * LEADERS.length)];
            target.spies -= 1;
            logMsg = `[Kritik] ${target.name} liderine suikast düzenlendi! Yeni lider: ${target.leader}`;
            const newThreat: Threat = {
              id: Math.random().toString(36).substring(7),
              type: 'Suikast',
              severity: 5,
              turnsLeft: 3,
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
      }
      
      newState[targetId] = target;
      return {
        ...prev,
        resources: { ...prev.resources, budget: newBudget },
        worldState: newState,
        logs: logMsg ? [logMsg, ...prev.logs] : prev.logs
      };
    });
  };

  const handleCounterThreat = (threatId: string, type: string, countryId: string) => {
    setGameState(prev => {
      const threat = prev.threats.find(t => t.id === threatId);
      if (!threat) return prev;
      
      let cost = 0;
      if (type === 'Ekonomi') cost = 100;
      else if (type === 'Terörizm') cost = 150;
      else if (type === 'İç Karışıklık' || type === 'İç Savaş') cost = 200;
      else if (type === 'Suikast') cost = 50;
      else if (type === 'Savaş') cost = 300;
      
      if (prev.resources.budget < cost) return prev;
      
      return {
        ...prev,
        resources: { ...prev.resources, budget: prev.resources.budget - cost },
        threats: prev.threats.filter(t => t.id !== threatId),
        logs: [`[Başarı] ${type} tehdidi müdahale ile durduruldu.`, ...prev.logs]
      };
    });
  };

  const handleAllySupport = (type: 'economy' | 'military' | 'tech', targetId: string) => {
    setGameState(prev => {
      let cost = 0;
      if (type === 'economy') cost = 100;
      else if (type === 'military') cost = 150;
      else if (type === 'tech') cost = 300;
      
      if (prev.resources.budget < cost) return prev;
      
      const newWorldState = { ...prev.worldState };
      const target = { ...newWorldState[targetId] };
      
      if (type === 'economy') target.agriculture += 2;
      else if (type === 'military') target.army += 2000;
      else if (type === 'tech') target.technology += 1;
      
      newWorldState[targetId] = target;
      
      return {
        ...prev,
        resources: { ...prev.resources, budget: prev.resources.budget - cost },
        worldState: newWorldState,
        logs: [`[Diplomasi] Müttefik desteği sağlandı: ${type}`, ...prev.logs]
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col">
      {appState === 'menu' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950">
          <div className="z-10 w-full max-w-md flex flex-col justify-center px-16 gap-6">
            <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 text-transparent bg-clip-text mb-12">
              GLOBAL<br/>DEFENSE
              <span className="text-2xl block text-white mt-2">v{VERSION}</span>
            </h1>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => setAppState('select_country')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105">Yeni Oyun</button>
              <button onClick={() => setAppState('saves')} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-full font-bold text-lg transition-all">Kayıtlı Oyunlar</button>
              <button onClick={() => setAppState('settings')} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-full font-bold text-lg transition-all">Ayarlar</button>
            </div>
          </div>
        </div>
      )}
      
      {appState === 'select_country' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <h2 className="text-4xl font-bold mb-8">Ülkeni Seç</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            {Object.entries(countryMetadata).slice(0, 8).map(([id, data]) => (
              <button 
                key={id}
                onClick={() => {
                  setPlayerCountry({ id, name: data.tr });
                  setAppState('playing');
                }}
                className="bg-slate-800 p-4 rounded-xl hover:bg-indigo-900 border border-slate-700 transition-all"
              >
                {data.tr}
              </button>
            ))}
          </div>
          <button onClick={() => setAppState('menu')} className="mt-8 text-slate-400 hover:text-white">Geri</button>
        </div>
      )}

      {appState === 'playing' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-20">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
                GLOBAL DEFENSE
                <span className="text-xs block text-gray-400">v{VERSION}</span>
              </h1>
              {playerCountry && (
                <div className="flex items-center gap-2 bg-indigo-900/50 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-200 text-sm font-medium">
                  <User size={14} />
                  {playerCountry.name}
                </div>
              )}
              <div className="bg-slate-800 px-4 py-1 rounded-full text-slate-300 font-mono text-sm">
                TUR: {gameState.turn} / {gameState.maxTurns}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-yellow-400">
                <Coins size={20} />
                <span className="font-mono font-bold text-lg">{Math.floor(gameState.resources.budget)}</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <Activity size={20} />
                <span className="font-mono font-bold text-lg">{gameState.resources.intelligence}</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <Swords size={20} />
                <span className="font-mono font-bold text-lg">{gameState.resources.military}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield size={20} />
                <span className="font-mono font-bold text-lg">{gameState.resources.stability}</span>
              </div>
              <button 
                onClick={nextTurn}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-bold transition-all"
              >
                Turu Bitir
              </button>
            </div>
          </header>

          {/* Main Game Area */}
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
      )}
      
      {isPaused && <PauseMenu />}
    </div>
  );
}

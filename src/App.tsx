/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Coins, Crosshair, Users, Activity, ChevronRight, RefreshCw, Map as MapIcon, Eye, Swords, User, Globe as GlobeIcon, BookOpen, ArrowLeft, Home, Zap, Wheat, Handshake, Play, Pause, Clock, Layers, Settings, ListOrdered } from 'lucide-react';
import * as topojson from 'topojson-client';
import { GameState, Threat, ThreatType, Country, Unit, CountryState } from './types';
import { INITIAL_RESOURCES, THREAT_TYPES } from './constants';
import Globe from './Globe';

type AppState = 'menu' | 'gdd' | 'settings' | 'select_country' | 'playing';

const FLAG_MAP: Record<string, string> = {
  "Turkey": "🇹🇷", "United States of America": "🇺🇸", "Russia": "🇷🇺", "China": "🇨🇳",
  "Germany": "🇩🇪", "France": "🇫🇷", "United Kingdom": "🇬🇧", "Japan": "🇯🇵",
  "India": "🇮🇳", "Brazil": "🇧🇷", "Italy": "🇮🇹", "Canada": "🇨🇦",
  "South Korea": "🇰🇷", "Australia": "🇦🇺", "Spain": "🇪🇸", "Mexico": "🇲🇽",
  "Indonesia": "🇮🇩", "Saudi Arabia": "🇸🇦", "Iran": "🇮🇷", "Israel": "🇮🇱",
  "Ukraine": "🇺🇦", "Greece": "🇬🇷", "Egypt": "🇪🇬", "South Africa": "🇿🇦",
  "Syria": "🇸🇾", "Iraq": "🇮🇶", "Bulgaria": "🇧🇬", "Georgia": "🇬🇪", "Armenia": "🇦🇲"
};
const getFlag = (name: string) => FLAG_MAP[name] || "🏳️";

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
    worldState: {},
    gamePhase: 'main_menu',
  });

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(2000);
  const [showThreats, setShowThreats] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'region' | 'diplomacy'>('region');

  const [showRankings, setShowRankings] = useState(false);
  const [rankingsTab, setRankingsTab] = useState<'army' | 'economy' | 'agriculture' | 'technology'>('economy');

  // Load World Map Data
  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(res => res.json())
      .then(topology => {
        const geojson = topojson.feature(topology, topology.objects.countries) as any;
        // Filter out Antarctica for better gameplay focus
        const filteredFeatures = geojson.features.filter((f: any) => f.properties.name !== 'Antarctica');
        setCountriesData(filteredFeatures);

        // Initialize world state
        const initialWorldState: Record<string, CountryState> = {};
        const colors = ['#34d399', '#14b8a6', '#eab308', '#16a34a', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];
        filteredFeatures.forEach((f: any, i: number) => {
          const id = f.id || f.properties.name;
          initialWorldState[id] = {
            id,
            name: f.properties.name,
            ownerId: id,
            color: colors[i % colors.length],
            technology: Math.floor(Math.random() * 3) + 1,
            agriculture: Math.floor(Math.random() * 5) + 1,
            army: Math.floor(Math.random() * 5000) + 1000,
            economy: Math.floor(Math.random() * 100) + 50,
            allies: [],
            enemies: [],
            leader: LEADERS[Math.floor(Math.random() * LEADERS.length)],
            governmentType: GOVERNMENT_TYPES[Math.floor(Math.random() * GOVERNMENT_TYPES.length)],
            spies: 0,
            intelLevel: Math.floor(Math.random() * 20),
            sanctions: false,
            capital: f.properties.name + ' City',
            language: 'Yerel Dil',
          };
        });
        setGameState(prev => ({ ...prev, worldState: initialWorldState }));
      });
  }, []);

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
      Object.values(newWorldState).forEach(c => {
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
      Object.values(newWorldState).forEach(c => {
        if (c.enemies.length > 0) {
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

      return {
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
    const safeId = countryId || 'unknown';
    const countryState = gameState.worldState[safeId];
    
    if (gameState.mapMode === 'political') {
      if (!countryState) return '#1f2937';
      // If owned by player, use player color
      if (countryState.ownerId === playerCountry?.id) return '#4f46e5'; // indigo-600
      
      // Otherwise use the owner's original color
      const owner = gameState.worldState[countryState.ownerId];
      return owner ? owner.color : countryState.color;
    }
    
    if (gameState.mapMode === 'threat') {
      const threats = gameState.threats.filter(t => t.countryId === safeId);
      if (threats.length === 0) return '#1f2937'; // gray-800
      const totalSeverity = threats.reduce((sum, t) => sum + t.severity, 0);
      if (totalSeverity > 5) return '#991b1b'; // red-800
      if (totalSeverity > 2) return '#b45309'; // amber-700
      return '#854d0e'; // yellow-800
    }

    if (gameState.mapMode === 'military') {
      const units = gameState.units.filter(u => u.countryId === safeId);
      if (units.length === 0) return '#1f2937';
      if (units.some(u => u.type === 'Army')) return '#1e3a8a'; // blue-900
      return '#312e81'; // indigo-900
    }

    if (gameState.mapMode === 'wars') {
      const isAtWar = countryState?.enemies?.length > 0 || gameState.threats.some(t => t.countryId === safeId && t.type === 'Savaş');
      return isAtWar ? '#ef4444' : '#1f2937'; // red-500 or gray-800
    }

    if (gameState.mapMode === 'events') {
      const hasEvents = gameState.threats.some(t => t.countryId === safeId);
      return hasEvents ? '#eab308' : '#1f2937'; // yellow-500 or gray-800
    }

    return '#1f2937';
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

  const handleDiplomacy = (action: 'alliance' | 'war', targetId: string) => {
    if (!targetId || !playerCountry) return;
    
    setGameState(prev => {
      const newWorldState = { ...prev.worldState };
      const target = { ...newWorldState[targetId] };
      const player = { ...newWorldState[playerCountry.id] };

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
      }

      if (action === 'war') {
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
              type: 'İç Karışıklık',
              severity: 8,
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
          if (newBudget >= 100) {
            newBudget -= 100;
            target.agriculture += 1;
            logMsg = `[Destek] Müttefikimiz ${target.name}'e ekonomik paket gönderildi.`;
          }
          break;
        case 'military':
          if (newBudget >= 150) {
            newBudget -= 150;
            target.army += 2000;
            logMsg = `[Destek] Müttefikimiz ${target.name}'e askeri teçhizat ve birlik gönderildi.`;
          }
          break;
        case 'tech':
          if (newBudget >= 300) {
            newBudget -= 300;
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
      
      if (type === 'Ekonomi') { cost = 100; logMsg = `${country.name} ülkesindeki Ekonomik Kriz yatırımlarımızla çözüldü.`; }
      else if (type === 'Terörizm') { cost = 150; logMsg = `${country.name} ülkesindeki Terörizm askeri desteğimizle bastırıldı.`; }
      else if (type === 'İç Karışıklık' || type === 'İç Savaş') { cost = 200; reqSpies = 1; logMsg = `${country.name} ülkesindeki isyan ajanlarımızca bastırıldı.`; }
      else if (type === 'Suikast') { cost = 50; reqSpies = 1; logMsg = `${country.name} liderine yönelik suikast ajanlarımızca engellendi.`; }
      else if (type === 'Savaş') { cost = 300; logMsg = `${country.name} ülkesindeki Savaş diplomatik müdahalemizle sonlandırıldı.`; }

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
    const countries = Object.values(gameState.worldState);
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans text-white relative overflow-hidden">
        {/* Background Globe effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
          <GlobeIcon size={800} className="text-indigo-500 animate-[spin_60s_linear_infinite]" />
        </div>
        
        <div className="z-10 text-center max-w-2xl px-6">
          <h1 className="text-6xl font-black mb-6 tracking-tighter bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            GLOBAL DEFENSE
          </h1>
          <p className="text-xl text-gray-300 mb-12 leading-relaxed">
            Dünya krizde. Suikastler, iç karışıklıklar ve savaşlar sınırları aşıyor. 
            Ülkeni seç, kaynaklarını yönet ve 20 tur boyunca küresel istikrarı sağla.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setAppState('select_country')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full font-bold text-xl transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(79,70,229,0.4)] flex items-center justify-center gap-3"
            >
              <Shield size={24} /> Oyuna Başla
            </button>
            <button 
              onClick={() => setAppState('gdd')}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-8 py-4 rounded-full font-bold text-xl transition-all flex items-center justify-center gap-3"
            >
              <BookOpen size={24} /> Nasıl Oynanır?
            </button>
            <button 
              onClick={() => setAppState('settings')}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-8 py-4 rounded-full font-bold text-xl transition-all flex items-center justify-center gap-3"
            >
              <Settings size={24} /> Ayarlar
            </button>
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
          
          <div className="space-y-8 text-slate-300">
            {/* Global Settings */}
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">Genel Ayarlar</h2>
              <div className="flex items-center gap-4">
                <label className="font-semibold">Oyun Tur Sayısı:</label>
                <input 
                  type="number" 
                  value={gameState.maxTurns}
                  onChange={(e) => setGameState(prev => ({ ...prev, maxTurns: parseInt(e.target.value) || 20 }))}
                  className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white w-24"
                  min="10" max="1000"
                />
              </div>
            </section>

            {/* Country Settings */}
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center gap-2">Ülke Düzenleme</h2>
              <div className="mb-4">
                <select 
                  className="bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white w-full max-w-md"
                  onChange={(e) => setSelectedCountry(countriesData.find(c => c.id === e.target.value || c.properties.name === e.target.value))}
                  value={selectedCountry?.id || selectedCountry?.properties?.name || ''}
                >
                  <option value="">Bir ülke seçin...</option>
                  {Object.values(gameState.worldState).sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedCountry && gameState.worldState[selectedCountry.id || selectedCountry.properties.name] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['technology', 'agriculture', 'army', 'economy'].map(stat => (
                    <div key={stat} className="flex flex-col gap-1">
                      <label className="text-sm text-gray-400 capitalize">{stat === 'technology' ? 'Teknoloji' : stat === 'agriculture' ? 'Tarım' : stat === 'army' ? 'Ordu' : 'Ekonomi'}</label>
                      <input 
                        type="number" 
                        value={gameState.worldState[selectedCountry.id || selectedCountry.properties.name][stat as keyof CountryState] as number}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setGameState(prev => ({
                            ...prev,
                            worldState: {
                              ...prev.worldState,
                              [selectedCountry.id || selectedCountry.properties.name]: {
                                ...prev.worldState[selectedCountry.id || selectedCountry.properties.name],
                                [stat]: val
                              }
                            }
                          }));
                        }}
                        className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Diplomacy Settings */}
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">Diplomasi Düzenleme</h2>
              <p className="text-sm text-gray-400 mb-4">Ülke düzenleme bölümünden seçtiğiniz ülkenin diplomatik ilişkilerini buradan yönetebilirsiniz.</p>
              
              {selectedCountry && gameState.worldState[selectedCountry.id || selectedCountry.properties.name] ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-400">Yeni Müttefik Ekle</label>
                    <select 
                      className="bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white w-full max-w-md"
                      onChange={(e) => {
                        if(!e.target.value) return;
                        const targetId = e.target.value;
                        const sourceId = selectedCountry.id || selectedCountry.properties.name;
                        setGameState(prev => {
                          const newWorld = {...prev.worldState};
                          if(!newWorld[sourceId].allies.includes(targetId)) newWorld[sourceId].allies.push(targetId);
                          if(!newWorld[targetId].allies.includes(sourceId)) newWorld[targetId].allies.push(sourceId);
                          newWorld[sourceId].enemies = newWorld[sourceId].enemies.filter(id => id !== targetId);
                          newWorld[targetId].enemies = newWorld[targetId].enemies.filter(id => id !== sourceId);
                          return {...prev, worldState: newWorld};
                        });
                        e.target.value = "";
                      }}
                    >
                      <option value="">Ülke Seç...</option>
                      {Object.values(gameState.worldState)
                        .filter(c => c.id !== (selectedCountry.id || selectedCountry.properties.name) && !gameState.worldState[selectedCountry.id || selectedCountry.properties.name].allies.includes(c.id))
                        .sort((a,b) => a.name.localeCompare(b.name))
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-400">Yeni Düşman Ekle (Savaş)</label>
                    <select 
                      className="bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white w-full max-w-md"
                      onChange={(e) => {
                        if(!e.target.value) return;
                        const targetId = e.target.value;
                        const sourceId = selectedCountry.id || selectedCountry.properties.name;
                        setGameState(prev => {
                          const newWorld = {...prev.worldState};
                          if(!newWorld[sourceId].enemies.includes(targetId)) newWorld[sourceId].enemies.push(targetId);
                          if(!newWorld[targetId].enemies.includes(sourceId)) newWorld[targetId].enemies.push(sourceId);
                          newWorld[sourceId].allies = newWorld[sourceId].allies.filter(id => id !== targetId);
                          newWorld[targetId].allies = newWorld[targetId].allies.filter(id => id !== sourceId);
                          return {...prev, worldState: newWorld};
                        });
                        e.target.value = "";
                      }}
                    >
                      <option value="">Ülke Seç...</option>
                      {Object.values(gameState.worldState)
                        .filter(c => c.id !== (selectedCountry.id || selectedCountry.properties.name) && !gameState.worldState[selectedCountry.id || selectedCountry.properties.name].enemies.includes(c.id))
                        .sort((a,b) => a.name.localeCompare(b.name))
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-white mb-2">Mevcut İlişkiler:</h3>
                    <div className="flex flex-wrap gap-2">
                      {gameState.worldState[selectedCountry.id || selectedCountry.properties.name].allies.map(allyId => (
                        <span key={allyId} className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs border border-green-700">
                          Müttefik: {gameState.worldState[allyId]?.name}
                        </span>
                      ))}
                      {gameState.worldState[selectedCountry.id || selectedCountry.properties.name].enemies.map(enemyId => (
                        <span key={enemyId} className="bg-red-900/50 text-red-300 px-2 py-1 rounded text-xs border border-red-700">
                          Savaşta: {gameState.worldState[enemyId]?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">Önce yukarıdan bir ülke seçin.</p>
              )}
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
          
          <h1 className="text-4xl font-black mb-8 text-white border-b border-slate-700 pb-4">Oyun Tasarım Dokümanı (GDD) & Kurallar</h1>
          
          <div className="space-y-8 text-slate-300 leading-relaxed">
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2"><GlobeIcon /> 1. Oyunun Amacı</h2>
              <p>Oyuna başlarken dünya haritasından yöneteceğiniz <strong>kendi ülkenizi</strong> seçersiniz. Amacınız, 20 tur boyunca hem kendi ülkenizi hem de dünyayı dış tehditlere karşı korumak ve <strong>İstikrar</strong> seviyenizi sıfırın üstünde tutmaktır.</p>
            </section>

            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2"><AlertTriangle /> 2. Tehditler ve Krizler</h2>
              <p className="mb-4">Dünyanın rastgele bölgelerinde veya doğrudan kendi ülkenizde 5 farklı tehdit ortaya çıkabilir: <strong>Savaş, Terörizm, Suikast, İç Karışıklık, Ekonomi</strong>.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Her tehdidin bir şiddeti (1-5) ve çözülmesi için kalan bir süresi (Tur) vardır.</li>
                <li>Süre dolduğunda tehdit gerçekleşir ve İstikrarınıza zarar verir.</li>
                <li><strong>Kritik Kural:</strong> Eğer tehdit <em>kendi ülkenizde</em> gerçekleşirse, İstikrarınıza <strong>2 KAT</strong> daha fazla hasar verir! Dış tehditlerin ülkenize sıçramasını engellemelisiniz.</li>
              </ul>
            </section>

            <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2"><Shield /> 3. Birlikler ve Müdahale</h2>
              <p className="mb-4">Kaynaklarınızı kullanarak kriz bölgelerine birlik gönderebilirsiniz:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Ordu (Maliyet: 20 Bütçe, 15 Askeri):</strong> Bulunduğu ülkedeki <em>Savaş</em> ve <em>Terörizm</em> tehditlerinin şiddetini her tur azaltır.</li>
                <li><strong>Ajan (Maliyet: 15 Bütçe, 10 İstihbarat):</strong> Bulunduğu ülkedeki <em>Suikast</em> ve <em>İç Karışıklık</em> tehditlerinin şiddetini her tur azaltır.</li>
                <li><strong>Ekonomik Yatırım (Maliyet: 30 Bütçe):</strong> Seçili ülkedeki ekonomik krizi anında çözer ve +10 İstikrar kazandırır.</li>
              </ul>
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

  if (appState === 'select_country') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white relative">
        <div className="p-8 text-center bg-slate-800/80 border-b border-slate-700 shadow-lg z-10">
          <h2 className="text-4xl font-black text-indigo-400 mb-2">Ülkenizi Seçin</h2>
          <p className="text-slate-300 text-lg">Korumak ve yönetmek istediğiniz ülkeyi haritadan seçin.</p>
        </div>
        <div className="flex-1 relative flex flex-col overflow-hidden">
          {countriesData.length > 0 ? (
            <Globe 
              countries={countriesData}
              selectedCountryId={selectedCountry?.id || null}
              onSelectCountry={(country) => {
                setSelectedCountry(country);
              }}
              getCountryFill={(c) => c.id === selectedCountry?.id ? '#4f46e5' : '#1f2937'}
              getFlag={getFlag}
              threats={[]}
              units={[]}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 animate-pulse">
              Dünya haritası yükleniyor...
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {selectedCountry && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 max-w-md text-center shadow-2xl">
              <div className="text-6xl mb-4">{getFlag(selectedCountry.name)}</div>
              <h2 className="text-3xl font-bold mb-2 text-white">{selectedCountry.name}</h2>
              <p className="text-gray-300 mb-8">
                Bu ülkenin yönetimini devralmak istediğinize emin misiniz?
              </p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setSelectedCountry(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
                >
                  İptal
                </button>
                <button 
                  onClick={() => {
                    setPlayerCountry(selectedCountry);
                    setAppState('playing');
                    setGameState(prev => ({
                      ...prev,
                      logs: [`${selectedCountry.name} yönetimi devralındı. Ülkemizi dış tehditlere karşı korumalıyız!`]
                    }));
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <Shield size={20} /> Onayla ve Başla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
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
                setIsPaused(false);
                setAppState('menu');
                // Reset game state if needed, or keep it to resume later
              }}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-6 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Home size={20} /> Ana Menüye Dön
            </button>
          </div>
        </div>
      )}

      {/* Header / Top Bar */}
      <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
            GLOBAL DEFENSE
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

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Event Log */}
        <aside className="w-80 bg-gray-950 border-r border-gray-800 flex flex-col shadow-2xl z-10">
          <div className="flex-1 p-5 overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 sticky top-0 bg-gray-950 pb-2 z-10">Olay Günlüğü</h3>
            <div className="space-y-3 font-mono text-xs">
              {gameState.logs.map((log, i) => (
                <div key={i} className={`
                  ${log.includes('[Kritik]') ? 'text-red-400' : 
                    log.includes('[Uyarı]') ? 'text-yellow-400' : 
                    log.includes('[Birlik]') ? 'text-blue-400' :
                    log.includes('[Başarı]') ? 'text-green-400' :
                    log.includes('[Diplomasi]') ? 'text-purple-400' :
                    log.includes('[SAVAŞ]') ? 'text-orange-400' : 'text-gray-400'} 
                  border-l-2 
                  ${log.includes('[Kritik]') ? 'border-red-500' : 
                    log.includes('[Uyarı]') ? 'border-yellow-500' : 
                    log.includes('[Birlik]') ? 'border-blue-500' :
                    log.includes('[Başarı]') ? 'border-green-500' :
                    log.includes('[Diplomasi]') ? 'border-purple-500' :
                    log.includes('[SAVAŞ]') ? 'border-orange-500' : 'border-gray-700'} 
                  pl-3 py-1 bg-gray-900/50 rounded-r
                `}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Game Area (SVG Map) */}
        <main className="flex-1 relative overflow-hidden bg-slate-900 flex flex-col">
          
          {/* Map Mode Toggles */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <div className="flex gap-2 bg-gray-800/80 p-2 rounded-lg backdrop-blur-sm border border-gray-700">
              <button 
                onClick={() => setGameState(p => ({...p, mapMode: 'political'}))}
                className={`p-2 rounded ${gameState.mapMode === 'political' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                title="Politik Harita"
              ><MapIcon size={20} /></button>
              <button 
                onClick={() => setGameState(p => ({...p, mapMode: 'threat'}))}
                className={`p-2 rounded ${gameState.mapMode === 'threat' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                title="Tehdit Haritası"
              ><AlertTriangle size={20} /></button>
              <button 
                onClick={() => setGameState(p => ({...p, mapMode: 'military'}))}
                className={`p-2 rounded ${gameState.mapMode === 'military' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                title="Askeri Harita"
              ><Swords size={20} /></button>
              <button 
                onClick={() => setGameState(p => ({...p, mapMode: 'wars'}))}
                className={`p-2 rounded ${gameState.mapMode === 'wars' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                title="Savaş Haritası"
              ><Crosshair size={20} /></button>
              <button 
                onClick={() => setGameState(p => ({...p, mapMode: 'events'}))}
                className={`p-2 rounded ${gameState.mapMode === 'events' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                title="Olaylar Haritası"
              ><Activity size={20} /></button>
            </div>
            <div className="flex gap-2 bg-gray-800/80 p-2 rounded-lg backdrop-blur-sm border border-gray-700">
              <button 
                onClick={() => setShowThreats(!showThreats)}
                className={`p-2 rounded ${showThreats ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                title="Tehdit Göstergelerini Aç/Kapat"
              ><AlertTriangle size={20} /></button>
              <button 
                onClick={() => setShowUnits(!showUnits)}
                className={`p-2 rounded ${showUnits ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                title="Birlik Göstergelerini Aç/Kapat"
              ><Shield size={20} /></button>
            </div>
          </div>

          {(gameState.gameOver || gameState.victory) && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 max-w-md text-center shadow-2xl">
                <h2 className={`text-3xl font-bold mb-4 ${gameState.victory ? 'text-green-400' : 'text-red-500'}`}>
                  {gameState.victory ? 'Zafer!' : 'Oyun Bitti!'}
                </h2>
                <p className="text-gray-300 mb-8">
                  {gameState.victory 
                    ? 'Türkiye 20 tur boyunca tüm krizlere rağmen ayakta kaldı. Liderliğiniz tarihe geçti.' 
                    : 'Ülke istikrarını kaybetti ve çöktü. Tarih sizi affetmeyecek.'}
                </p>
                <button 
                  onClick={restartGame}
                  className="bg-white text-gray-900 hover:bg-gray-200 px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto"
                >
                  <RefreshCw size={20} /> Yeniden Başla
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 w-full h-full p-8 flex items-center justify-center">
            {countriesData.length > 0 ? (
              <Globe 
                countries={countriesData}
                selectedCountryId={selectedCountry?.id || null}
                playerCountryId={playerCountry?.id || null}
                onSelectCountry={setSelectedCountry}
                getCountryFill={getCountryFill}
                getFlag={getFlag}
                threats={gameState.threats}
                units={gameState.units}
                showThreats={showThreats}
                showUnits={showUnits}
              />
            ) : (
              <div className="text-gray-500 animate-pulse">Dünya haritası yükleniyor...</div>
            )}
          </div>
        </main>

        {/* Sidebar */}
        <aside className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col z-10 shadow-2xl">
          <div className="flex border-b border-gray-800">
            <button 
              onClick={() => setSidebarTab('region')}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${sidebarTab === 'region' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              Durum
            </button>
            <button 
              onClick={() => setSidebarTab('diplomacy')}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${sidebarTab === 'diplomacy' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              Eylemler
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto bg-gray-800/50">
            {selectedCountry ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                    <span className="text-3xl">{getFlag(selectedCountry.name)}</span>
                    {selectedCountry.name}
                  </h2>
                </div>
                
                {(() => {
                  const countryState = gameState.worldState[selectedCountry.id || selectedCountry.name];
                  const isOwnedByPlayer = countryState?.ownerId === playerCountry?.id;
                  const ownerState = gameState.worldState[countryState?.ownerId || ''];
                  const isAlly = countryState?.allies.includes(playerCountry?.id || '');
                  const isEnemy = countryState?.enemies.includes(playerCountry?.id || '');

                  if (sidebarTab === 'region') {
                    return (
                      <>
                        <div className="mb-6 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ülke Durumu</h3>
                            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                              Sahibi: {getFlag(ownerState?.name || '')} {ownerState?.name || 'Bilinmiyor'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div className="bg-gray-800 p-2 rounded border border-gray-700">
                              <span className="text-gray-400 block text-xs">Lider</span>
                              <span className="text-white font-semibold">{countryState?.leader || 'Bilinmiyor'}</span>
                            </div>
                            <div className="bg-gray-800 p-2 rounded border border-gray-700">
                              <span className="text-gray-400 block text-xs">Yönetim Biçimi</span>
                              <span className="text-white font-semibold">{countryState?.governmentType || 'Bilinmiyor'}</span>
                            </div>
                            <div className="bg-gray-800 p-2 rounded border border-gray-700">
                              <span className="text-gray-400 block text-xs">Başkent</span>
                              <span className="text-white font-semibold">{countryState?.capital || 'Bilinmiyor'}</span>
                            </div>
                            <div className="bg-gray-800 p-2 rounded border border-gray-700">
                              <span className="text-gray-400 block text-xs">Dil</span>
                              <span className="text-white font-semibold">{countryState?.language || 'Bilinmiyor'}</span>
                            </div>
                          </div>

                          <div className="bg-gray-800 p-3 rounded border border-gray-700 mb-4 flex items-center justify-between">
                            <div>
                              <span className="text-gray-400 block text-xs mb-1">Ekonomik Güç Çarpanı</span>
                              <div className="flex items-center gap-2">
                                <Coins size={16} className="text-yellow-400" />
                                <span className="text-white font-bold text-lg">{countryState?.economy || 0}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 block text-xs mb-1">Küresel Sıra</span>
                              <span className="text-yellow-400 font-bold">#{getCountryRank(countryState?.id || '', 'economy')}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
                              <div className="text-blue-400 text-xs font-bold flex items-center justify-center gap-1"><Zap size={12}/> Teknoloji</div>
                              <div className="text-white font-mono text-lg">{countryState?.technology || 0}</div>
                              <div className="text-gray-500 text-[10px] mt-1">Sıra: #{getCountryRank(countryState?.id || '', 'technology')}</div>
                            </div>
                            <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
                              <div className="text-green-400 text-xs font-bold flex items-center justify-center gap-1"><Wheat size={12}/> Tarım</div>
                              <div className="text-white font-mono text-lg">{countryState?.agriculture || 0}</div>
                              <div className="text-gray-500 text-[10px] mt-1">Sıra: #{getCountryRank(countryState?.id || '', 'agriculture')}</div>
                            </div>
                            <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
                              <div className="text-red-400 text-xs font-bold flex items-center justify-center gap-1"><Swords size={12}/> Ordu</div>
                              <div className="text-white font-mono text-lg">{Math.floor(countryState?.army || 0)}</div>
                              <div className="text-gray-500 text-[10px] mt-1">Sıra: #{getCountryRank(countryState?.id || '', 'army')}</div>
                            </div>
                          </div>

                        </div>
                      </>
                    );
                  }

                  if (sidebarTab === 'diplomacy') {
                    return (
                      <>
                        {/* Threats Actions */}
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3 text-red-400">
                            <AlertTriangle size={16} /> <span className="font-semibold text-sm">Aktif Tehditlere Müdahale</span>
                          </div>
                          {gameState.threats.filter(t => t.countryId === (selectedCountry.id || selectedCountry.name)).length === 0 ? (
                            <p className="text-gray-500 text-sm italic pl-6">Tehdit bulunmuyor.</p>
                          ) : (
                            <div className="space-y-2 pl-6">
                              {gameState.threats.filter(t => t.countryId === (selectedCountry.id || selectedCountry.name)).map(threat => {
                                let cost = 0;
                                let reqSpies = 0;
                                let actionName = 'Müdahale Et';
                                if (threat.type === 'Ekonomi') { cost = 100; actionName = 'Ekonomik Krizi Çöz'; }
                                else if (threat.type === 'Terörizm') { cost = 150; actionName = 'Terörizmi Bastır'; }
                                else if (threat.type === 'İç Karışıklık' || threat.type === 'İç Savaş') { cost = 200; reqSpies = 1; actionName = 'İsyanı Bastır'; }
                                else if (threat.type === 'Suikast') { cost = 50; reqSpies = 1; actionName = 'Suikasti Engelle'; }
                                else if (threat.type === 'Savaş') { cost = 300; actionName = 'Savaşı Durdur'; }

                                const canAfford = gameState.resources.budget >= cost;
                                const hasSpies = reqSpies === 0 || (countryState?.spies || 0) >= reqSpies;
                                const canAct = canAfford && hasSpies;

                                return (
                                  <div key={threat.id} className="flex flex-col gap-2 bg-red-950/30 p-3 rounded border border-red-900/50">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-red-200 font-bold">{threat.type} (Şiddet: {threat.severity})</span>
                                      <span className="text-xs font-mono bg-red-900 text-red-100 px-1.5 py-0.5 rounded">{threat.turnsLeft} Tur</span>
                                    </div>
                                    <button
                                      onClick={() => handleCounterThreat(threat.id, threat.type, selectedCountry.id || selectedCountry.name)}
                                      disabled={!canAct}
                                      className={`text-xs py-1.5 px-2 rounded font-bold flex items-center justify-center gap-1 transition-colors ${canAct ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                                      title={!canAfford ? 'Yetersiz Bütçe' : !hasSpies ? 'Yetersiz Ajan' : ''}
                                    >
                                      <Shield size={12} /> {actionName} ({cost} Bütçe{reqSpies > 0 ? `, ${reqSpies} Ajan` : ''})
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Eylemler</h3>
                          
                          {isOwnedByPlayer ? (
                            <div className="space-y-3">
                              <ActionButton 
                                title="Teknoloji Geliştir" 
                                cost="100 Bütçe" 
                                effect="Savaş gücünü %10 artırır."
                                icon={<Zap size={18} />}
                                onClick={() => upgradeCountry('technology')}
                                disabled={gameState.resources.budget < 100}
                              />
                              <ActionButton 
                                title="Tarım Geliştir" 
                                cost="50 Bütçe" 
                                effect="Tur başına +5 Bütçe ve ordu büyümesi sağlar."
                                icon={<Wheat size={18} />}
                                onClick={() => upgradeCountry('agriculture')}
                                disabled={gameState.resources.budget < 50}
                              />
                              <ActionButton 
                                title="Ordu Büyüt" 
                                cost="30 Bütçe" 
                                effect="+1000 Asker ekler."
                                icon={<Swords size={18} />}
                                onClick={() => upgradeCountry('army')}
                                disabled={gameState.resources.budget < 30}
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 mb-2">Diplomasi</h4>
                              {!isAlly && !isEnemy && (
                                <ActionButton 
                                  title="İttifak Kur" 
                                  cost="Ücretsiz" 
                                  effect="Saldırmazlık anlaşması imzalar."
                                  icon={<Handshake size={18} />}
                                  onClick={() => handleDiplomacy('alliance', selectedCountry.id || selectedCountry.name)}
                                  disabled={false}
                                />
                              )}
                              {!isEnemy && (
                                <ActionButton 
                                  title="Savaş İlan Et" 
                                  cost="Ücretsiz" 
                                  effect="Ordularınız çatışmaya başlar."
                                  icon={<Crosshair size={18} className="text-red-400" />}
                                  onClick={() => handleDiplomacy('war', selectedCountry.id || selectedCountry.name)}
                                  disabled={false}
                                />
                              )}

                              {isAlly && (
                                <div className="bg-gray-900/80 p-4 rounded-xl border border-blue-900/50 mb-4">
                                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Handshake size={14} /> Müttefik Desteği
                                  </h4>
                                  <div className="space-y-3">
                                    <ActionButton 
                                      title="Ekonomik Destek" 
                                      cost="100 Bütçe" 
                                      effect="Müttefikin tarımını geliştirir."
                                      icon={<Coins size={18} className="text-yellow-400" />}
                                      onClick={() => handleAllySupport('economy', selectedCountry.id || selectedCountry.name)}
                                      disabled={gameState.resources.budget < 100}
                                    />
                                    <ActionButton 
                                      title="Askeri Destek" 
                                      cost="150 Bütçe" 
                                      effect="Müttefike +2000 asker gönderir."
                                      icon={<Shield size={18} className="text-blue-400" />}
                                      onClick={() => handleAllySupport('military', selectedCountry.id || selectedCountry.name)}
                                      disabled={gameState.resources.budget < 150}
                                    />
                                    <ActionButton 
                                      title="Teknoloji Paylaşımı" 
                                      cost="300 Bütçe" 
                                      effect="Müttefikin teknolojisini geliştirir."
                                      icon={<Zap size={18} className="text-indigo-400" />}
                                      onClick={() => handleAllySupport('tech', selectedCountry.id || selectedCountry.name)}
                                      disabled={gameState.resources.budget < 300}
                                    />
                                  </div>
                                </div>
                              )}

                              {!isAlly && (
                                <div className="bg-gray-900/80 p-4 rounded-xl border border-purple-900/50 mb-4">
                                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Eye size={14} /> Gizli Operasyonlar
                                  </h4>
                                  <div className="space-y-3">
                                    <ActionButton 
                                      title="Ajan Yerleştir" 
                                      cost="50 Bütçe" 
                                      effect="Ülkeye bir ajan yerleştirir."
                                      icon={<Eye size={18} className="text-purple-400" />}
                                      onClick={() => handleCovertAction('spy', selectedCountry.id || selectedCountry.name)}
                                      disabled={gameState.resources.budget < 50}
                                    />
                                    <ActionButton 
                                      title="İstihbarat Topla" 
                                      cost="20 Bütçe" 
                                      effect="İstihbarat seviyesini artırır. (Ajan gerektirir)"
                                      icon={<Activity size={18} className="text-blue-400" />}
                                      onClick={() => handleCovertAction('intel', selectedCountry.id || selectedCountry.name)}
                                      disabled={gameState.resources.budget < 20 || (countryState?.spies || 0) < 1}
                                    />
                                    <ActionButton 
                                      title="Ekonomik Yaptırım" 
                                      cost="100 Bütçe" 
                                      effect="Ülkenin tarım gelirini düşürür."
                                      icon={<AlertTriangle size={18} className="text-orange-400" />}
                                      onClick={() => handleCovertAction('sanction', selectedCountry.id || selectedCountry.name)}
                                      disabled={gameState.resources.budget < 100}
                                    />
                                    <ActionButton 
                                      title="Muhalifleri Destekle" 
                                      cost="200 Bütçe" 
                                      effect="İç savaş riskini artırır. (Ajan gerektirir)"
                                      icon={<Users size={18} className="text-red-400" />}
                                      onClick={() => handleCovertAction('rebel', selectedCountry.id || selectedCountry.name)}
                                      disabled={gameState.resources.budget < 200 || (countryState?.spies || 0) < 1}
                                    />
                                    <ActionButton 
                                      title="Suikast Düzenle" 
                                      cost="500 Bütçe" 
                                      effect="Lideri değiştirir, istikrarı bozar. (2 Ajan gerektirir)"
                                      icon={<Crosshair size={18} className="text-red-600" />}
                                      onClick={() => handleCovertAction('assassinate', selectedCountry.id || selectedCountry.name)}
                                      disabled={gameState.resources.budget < 500 || (countryState?.spies || 0) < 2}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <MapIcon size={64} className="mb-6 opacity-20" />
                <p className="text-center text-lg font-medium">Emir vermek için<br/>haritadan bir ülke seçin.</p>
              </div>
            )}
          </div>

        </aside>
      </div>
    </div>
  );
}

function ResourceItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
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

function ActionButton({ title, cost, effect, icon, onClick, disabled }: { title: string, cost: string, effect: string, icon: React.ReactNode, onClick: () => void, disabled: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
        disabled 
          ? 'bg-gray-800/50 border-gray-700/50 opacity-50 cursor-not-allowed' 
          : 'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-400 shadow-lg hover:shadow-xl'
      }`}
    >
      <div className={`p-2 rounded-lg ${disabled ? 'bg-gray-900 text-gray-600' : 'bg-gray-900 text-indigo-400'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-bold text-white mb-1">{title}</div>
        <div className="text-xs text-gray-400 mb-2">{effect}</div>
        <div className="flex justify-between text-xs font-mono bg-gray-900/50 p-1.5 rounded">
          <span className="text-red-400">Maliyet: {cost}</span>
        </div>
      </div>
    </button>
  );
}


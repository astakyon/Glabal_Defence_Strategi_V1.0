import React from 'react';
import { Map as MapIcon, AlertTriangle, Swords, Crosshair, Activity, ListOrdered, Shield } from 'lucide-react';
import { GameState, Country, CountryState, CountryMetadata, MapMode } from '../types';
import Globe from '../Globe';

interface MainGameAreaProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  showRankings: boolean;
  setShowRankings: React.Dispatch<React.SetStateAction<boolean>>;
  showThreats: boolean;
  setShowThreats: React.Dispatch<React.SetStateAction<boolean>>;
  showUnits: boolean;
  setShowUnits: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCountry: Country | null;
  rankingsTab: 'economy' | 'army' | 'technology' | 'agriculture';
  setRankingsTab: React.Dispatch<React.SetStateAction<'economy' | 'army' | 'technology' | 'agriculture'>>;
  countriesData: any[];
  getCountryFill: (id: string) => string;
  getFlag: (name: string, metadata: CountryMetadata) => string;
  countryMetadata: Record<string, CountryMetadata>;
  onSelectCountry: (country: Country) => void;
}

export default function MainGameArea({
  gameState,
  setGameState,
  showRankings,
  setShowRankings,
  showThreats,
  setShowThreats,
  showUnits,
  setShowUnits,
  selectedCountry,
  rankingsTab,
  setRankingsTab,
  countriesData,
  getCountryFill,
  getFlag,
  countryMetadata,
  onSelectCountry
}: MainGameAreaProps) {
  return (
    <main className="flex-1 relative overflow-hidden bg-slate-900 flex flex-col">
      {/* Map Mode Toggles */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="flex gap-2 bg-gray-800/80 p-2 rounded-lg backdrop-blur-sm border border-gray-700">
          <button 
            onClick={() => setGameState(p => ({...p, mapMode: 'political'}))}
            className={`p-2 rounded ${gameState.mapMode === 'political' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Politik Harita: Ülkeleri sahiplerine göre renklendirir."
          ><MapIcon size={20} /></button>
          <button 
            onClick={() => setGameState(p => ({...p, mapMode: 'threat'}))}
            className={`p-2 rounded ${gameState.mapMode === 'threat' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Tehdit Haritası: Ülkeleri tehdit seviyelerine göre renklendirir."
          ><AlertTriangle size={20} /></button>
          <button 
            onClick={() => setGameState(p => ({...p, mapMode: 'military'}))}
            className={`p-2 rounded ${gameState.mapMode === 'military' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Askeri Harita: Ülkeleri askeri güçlerine göre renklendirir."
          ><Swords size={20} /></button>
          <button 
            onClick={() => setGameState(p => ({...p, mapMode: 'wars'}))}
            className={`p-2 rounded ${gameState.mapMode === 'wars' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Savaş Haritası: Ülkeleri savaş durumlarına göre renklendirir."
          ><Crosshair size={20} /></button>
          <button 
            onClick={() => setGameState(p => ({...p, mapMode: 'events'}))}
            className={`p-2 rounded ${gameState.mapMode === 'events' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Olaylar Haritası: Ülkeleri aktif olaylara göre renklendirir."
          ><Activity size={20} /></button>
          <button 
            onClick={() => setShowRankings(!showRankings)}
            className={`p-2 rounded ${showRankings ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Küresel Sıralamalar: Ülkeleri ekonomik güçlerine göre listeler."
          ><ListOrdered size={20} /></button>
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

      <div className="flex-1 relative">
        {showRankings && (
          <div className="absolute top-4 right-4 z-20 bg-gray-900/90 p-4 rounded-lg border border-gray-700 w-64 max-h-[80vh] overflow-y-auto">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <ListOrdered size={18} /> Sıralamalar
            </h3>
            <div className="flex gap-2 mb-4">
              {(['economy', 'army', 'technology', 'agriculture'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setRankingsTab(tab)}
                  className={`px-2 py-1 rounded text-xs capitalize ${rankingsTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {tab === 'economy' ? 'Ekonomi' : tab === 'army' ? 'Ordu' : tab === 'technology' ? 'Teknoloji' : 'Tarım'}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {Object.values(gameState.worldState)
                .sort((a: any, b: any) => (b[rankingsTab] || 0) - (a[rankingsTab] || 0))
                .map((country: any, index: number) => (
                  <div key={country.id} className="flex justify-between text-sm text-gray-300">
                    <span>{index + 1}. {country.name}</span>
                    <span className="font-mono">{Math.floor(country[rankingsTab] || 0)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
        {countriesData.length > 0 ? (
          <Globe 
            selectedCountryId={selectedCountry?.id || null}
            onSelectCountry={onSelectCountry}
            getCountryFill={getCountryFill}
            getFlag={(name, metadata) => getFlag(name, metadata as unknown as CountryMetadata)}
            countryMetadata={countryMetadata}
            threats={gameState.threats}
            units={gameState.units}
            worldState={gameState.worldState}
            mapMode={gameState.mapMode as MapMode}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 animate-pulse">
            Dünya haritası yükleniyor...
          </div>
        )}
      </div>
    </main>
  );
}

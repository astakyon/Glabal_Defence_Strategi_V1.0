import React from 'react';
import { User, BookOpen, Handshake, Zap, Wheat, Map as MapIcon, Eye, Swords, Crosshair, Activity, AlertTriangle, Users, Coins, Shield } from 'lucide-react';
import { CountryState } from '../types';
import ActionButton from './ActionButton';

interface ActionSidebarProps {
  sidebarTab: 'region' | 'actions';
  setSidebarTab: React.Dispatch<React.SetStateAction<'region' | 'actions'>>;
  actionsSubTab: 'main' | 'diplomacy' | 'covert' | 'threats';
  setActionsSubTab: React.Dispatch<React.SetStateAction<'main' | 'diplomacy' | 'covert' | 'threats'>>;
  selectedCountry: any;
  gameState: any;
  countryState: CountryState | null | undefined;
  getCountryRank: (id: string, type: string) => number;
  handleCounterThreat: (id: string, type: string, countryId: string) => void;
  upgradeCountry: (type: string) => void;
  handleDiplomacy: (type: string, id: string) => void;
  handleAllySupport: (type: string, id: string) => void;
  handleCovertAction: (type: string, id: string) => void;
  isOwnedByPlayer: boolean;
  isAlly: boolean;
  isEnemy: boolean;
}

export default function ActionSidebar({
  sidebarTab,
  setSidebarTab,
  actionsSubTab,
  setActionsSubTab,
  selectedCountry,
  gameState,
  countryState,
  getCountryRank,
  handleCounterThreat,
  upgradeCountry,
  handleDiplomacy,
  handleAllySupport,
  handleCovertAction,
  isOwnedByPlayer,
  isAlly,
  isEnemy
}: ActionSidebarProps) {
  return (
    <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col z-10 shadow-2xl flex-shrink-0">
      {/* Country Header */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-4 bg-gray-800/50">
        <div className="w-16 h-10 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400 border border-gray-600">Bayrak</div>
        <h2 className="text-2xl font-bold text-white">{countryState?.name || 'Ülke Seçilmedi'}</h2>
      </div>

      {selectedCountry && (
        <div className="p-4 border-b border-gray-700">
          <div className="bg-gray-800 p-3 rounded border border-gray-700 space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Aktif Durumlar</h4>
            
            {/* Added Status Checks */}
            {countryState?.enemies && countryState.enemies.length > 0 && (
              <div className="bg-red-900/20 p-2 rounded border border-red-800/50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-300">Savaşta: {countryState.enemies.map(id => gameState.worldState[id]?.name || id).join(', ')}</span>
                  <button onClick={() => handleDiplomacy('peace', countryState.id)} className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded">Barış İste (500 Bütçe)</button>
                </div>
              </div>
            )}
            {countryState?.allies && countryState.allies.length > 0 && (
              <div className="bg-blue-900/20 p-2 rounded border border-blue-800/50">
                <span className="text-sm text-blue-300">İttifaklar: {countryState.allies.map(id => gameState.worldState[id]?.name || id).join(', ')}</span>
              </div>
            )}
            {countryState?.isRebellion && (
              <div className="flex justify-between items-center bg-orange-900/20 p-2 rounded border border-orange-800/50">
                <span className="text-sm text-orange-300">İsyan Var</span>
                <button onClick={() => handleCovertAction('rebel_suppress', countryState.id)} className="text-xs bg-orange-700 hover:bg-orange-600 text-white px-2 py-1 rounded">İsyanı Bastır (200 Bütçe)</button>
              </div>
            )}
            {countryState?.sanctions && (
              <div className="flex justify-between items-center bg-yellow-900/20 p-2 rounded border border-yellow-800/50">
                <span className="text-sm text-yellow-300">Ekonomik Kriz</span>
                <button onClick={() => handleCovertAction('crisis_solve', countryState.id)} className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded">Krizi Çöz (100 Bütçe)</button>
              </div>
            )}

            {gameState.threats.filter((t: any) => t.countryId === (selectedCountry?.id || selectedCountry?.name)).length === 0 && !countryState?.enemies?.length && !countryState?.isRebellion && !countryState?.sanctions ? (
              <p className="text-green-500 text-sm italic">Ülke stabil durumda.</p>
            ) : (
              <div className="space-y-2">
                {gameState.threats.filter((t: any) => t.countryId === (selectedCountry?.id || selectedCountry?.name)).map((threat: any) => {
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
                        onClick={() => handleCounterThreat(threat.id, threat.type, selectedCountry?.id || selectedCountry?.name)}
                        disabled={!canAct}
                        className={`text-xs py-1.5 px-2 rounded font-bold flex items-center justify-center gap-1 transition-colors ${canAct ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                        title={!canAfford ? 'Yetersiz Bütçe' : !hasSpies ? 'Yetersiz Ajan' : ''}
                      >
                        {actionName} ({cost} Bütçe{reqSpies > 0 ? `, ${reqSpies} Ajan` : ''})
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-800">
        <button 
          onClick={() => setSidebarTab('region')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${sidebarTab === 'region' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
        >
          Durum
        </button>
        <button 
          onClick={() => setSidebarTab('actions')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${sidebarTab === 'actions' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
        >
          Eylemler & Diplomasi
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {sidebarTab === 'region' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
                <div className="text-blue-400 text-xs font-bold flex items-center justify-center gap-1">Teknoloji</div>
                <div className="text-white font-mono text-lg">{countryState?.technology || 0}</div>
                <div className="text-gray-500 text-[10px] mt-1">Sıra: #{getCountryRank(countryState?.id || '', 'technology')}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
                <div className="text-green-400 text-xs font-bold flex items-center justify-center gap-1">Tarım</div>
                <div className="text-white font-mono text-lg">{countryState?.agriculture || 0}</div>
                <div className="text-gray-500 text-[10px] mt-1">Sıra: #{getCountryRank(countryState?.id || '', 'agriculture')}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
                <div className="text-red-400 text-xs font-bold flex items-center justify-center gap-1">Ordu</div>
                <div className="text-white font-mono text-lg">{countryState?.army || 0}k</div>
                <div className="text-gray-500 text-[10px] mt-1">Sıra: #{getCountryRank(countryState?.id || '', 'army')}</div>
              </div>
            </div>
            <div className="bg-gray-800 p-3 rounded border border-gray-700 space-y-2">
              <div className="text-sm text-gray-400">Lider: <span className="text-white">{countryState?.leader || 'Bilinmiyor'}</span></div>
              <div className="text-sm text-gray-400">Yönetim: <span className="text-white">{countryState?.governmentType || 'Bilinmiyor'}</span></div>
              <div className="text-sm text-gray-400">Başkent: <span className="text-white">{countryState?.capital || 'Bilinmiyor'}</span></div>
              <div className="text-sm text-gray-400">Dil: <span className="text-white">{countryState?.language || 'Bilinmiyor'}</span></div>
              <div className="text-sm text-gray-400">Nüfus: <span className="text-white">{(countryState as any)?.population?.toLocaleString() || 'Bilinmiyor'}</span></div>
              <div className="text-sm text-gray-400">GSYİH: <span className="text-white">{(countryState as any)?.gdp?.toLocaleString() || 'Bilinmiyor'}</span></div>
            </div>
            
            {/* Active Threats Display moved to top */}
            {/* Removed from here */}
            {/* Added Status Checks */}
          </div>
        )}
        {sidebarTab === 'actions' && (
          <div className="space-y-4">
            <div className="flex gap-1 mb-4 border-b border-gray-700 pb-2 flex-wrap">
              {(['main', 'diplomacy', 'covert'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActionsSubTab(tab as any)}
                  className={`px-3 py-1 rounded text-xs capitalize ${actionsSubTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {tab === 'main' ? 'Temel' : tab === 'diplomacy' ? 'Diplomasi' : 'Gizli'}
                </button>
              ))}
            </div>

            {selectedCountry ? (
            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
              {actionsSubTab === 'main' && isOwnedByPlayer && (
                <div className="space-y-3">
                  <ActionButton title="Teknoloji Geliştir" cost="100 Bütçe" effect="Savaş gücünü %10 artırır." icon={<Zap size={18} />} onClick={() => upgradeCountry('technology')} disabled={gameState.resources.budget < 100} />
                  <ActionButton title="Tarım Geliştir" cost="50 Bütçe" effect="Tur başına +5 Bütçe ve ordu büyümesi sağlar." icon={<Wheat size={18} />} onClick={() => upgradeCountry('agriculture')} disabled={gameState.resources.budget < 50} />
                  <ActionButton title="Ordu Büyüt" cost="30 Bütçe" effect="+1000 Asker ekler." icon={<Swords size={18} />} onClick={() => upgradeCountry('army')} disabled={gameState.resources.budget < 30} />
                </div>
              )}
              
              {actionsSubTab === 'diplomacy' && (
                <div className="space-y-3">
                  {!isOwnedByPlayer && !isAlly && !isEnemy && (
                    <ActionButton title="İttifak Kur" cost="Ücretsiz" effect="Saldırmazlık anlaşması imzalar." icon={<Handshake size={18} />} onClick={() => handleDiplomacy('alliance', selectedCountry.numericId ?? selectedCountry.id ?? selectedCountry.name)} disabled={false} />
                  )}
                  {!isOwnedByPlayer && !isEnemy && (
                    <ActionButton title="Savaş İlan Et" cost="Ücretsiz" effect="Ordularınız çatışmaya başlar." icon={<Crosshair size={18} className="text-red-400" />} onClick={() => handleDiplomacy('war', selectedCountry.numericId ?? selectedCountry.id ?? selectedCountry.name)} disabled={false} />
                  )}
                  {isAlly && (
                    <div className="bg-gray-900/80 p-4 rounded-xl border border-blue-900/50">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Müttefik Desteği</h4>
                      <div className="space-y-3">
                        <ActionButton title="Ekonomik Destek" cost="100 Bütçe" effect="Müttefikin tarımını geliştirir." icon={<Coins size={18} className="text-yellow-400" />} onClick={() => handleAllySupport('economy', selectedCountry.id || selectedCountry.name)} disabled={gameState.resources.budget < 100} />
                        <ActionButton title="Askeri Destek" cost="150 Bütçe" effect="Müttefike +2000 asker gönderir." icon={<Shield size={18} className="text-blue-400" />} onClick={() => handleAllySupport('military', selectedCountry.id || selectedCountry.name)} disabled={gameState.resources.budget < 150} />
                        <ActionButton title="Teknoloji Paylaşımı" cost="300 Bütçe" effect="Müttefikin teknolojisini geliştirir." icon={<Zap size={18} className="text-indigo-400" />} onClick={() => handleAllySupport('tech', selectedCountry.id || selectedCountry.name)} disabled={gameState.resources.budget < 300} />
                        <ActionButton title="İttifakı Bitir" cost="Ücretsiz" effect="İttifakı sonlandırır." icon={<Handshake size={18} className="text-red-400" />} onClick={() => handleDiplomacy('break_alliance', selectedCountry.numericId ?? selectedCountry.id ?? selectedCountry.name)} disabled={false} />
                      </div>
                    </div>
                  )}
                  {isEnemy && (
                    <div className="bg-gray-900/80 p-4 rounded-xl border border-red-900/50">
                      <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Savaş Operasyonları</h4>
                      <div className="space-y-3">
                        <ActionButton title="Saldırı Düzenle" cost="200 Bütçe" effect="Düşmana askeri hasar verir." icon={<Swords size={18} className="text-red-400" />} onClick={() => handleDiplomacy('attack', selectedCountry.numericId ?? selectedCountry.id ?? selectedCountry.name)} disabled={gameState.resources.budget < 200} />
                        <ActionButton title="Barış İste" cost="500 Bütçe" effect="Savaşı sonlandırır." icon={<Handshake size={18} className="text-green-400" />} onClick={() => handleDiplomacy('peace', selectedCountry.numericId ?? selectedCountry.id ?? selectedCountry.name)} disabled={gameState.resources.budget < 500} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {actionsSubTab === 'covert' && !isOwnedByPlayer && !isAlly && (
                <div className="bg-gray-900/80 p-4 rounded-xl border border-purple-900/50">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Gizli Operasyonlar</h4>
                  <div className="space-y-3">
                    <ActionButton title="Ajan Yerleştir" cost="50 Bütçe" effect="Ülkeye bir ajan yerleştirir." icon={<Eye size={18} className="text-purple-400" />} onClick={() => handleCovertAction('spy', selectedCountry.id || selectedCountry.name)} disabled={gameState.resources.budget < 50} />
                    <ActionButton title="İstihbarat Topla" cost="20 Bütçe" effect="İstihbarat seviyesini artırır." icon={<Activity size={18} className="text-blue-400" />} onClick={() => handleCovertAction('intel', selectedCountry.id || selectedCountry.name)} disabled={gameState.resources.budget < 20 || (countryState?.spies || 0) < 1} />
                    <ActionButton title="Ekonomik Yaptırım" cost="100 Bütçe" effect="Ülkenin tarım gelirini düşürür." icon={<AlertTriangle size={18} className="text-orange-400" />} onClick={() => handleCovertAction('sanction', selectedCountry.id || selectedCountry.name)} disabled={gameState.resources.budget < 100} />
                    <ActionButton title="Muhalifleri Destekle" cost="200 Bütçe" effect="İç savaş riskini artırır." icon={<Users size={18} className="text-red-400" />} onClick={() => handleCovertAction('rebel', selectedCountry.id || selectedCountry.name)} disabled={gameState.resources.budget < 200 || (countryState?.spies || 0) < 1} />
                    <ActionButton title="Suikast Düzenle" cost="500 Bütçe" effect="Lideri değiştirir, istikrarı bozar." icon={<Crosshair size={18} className="text-red-600" />} onClick={() => handleCovertAction('assassinate', selectedCountry.id || selectedCountry.name)} disabled={gameState.resources.budget < 500 || (countryState?.spies || 0) < 2} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <MapIcon size={64} className="mb-6 opacity-20" />
              <p className="text-center text-lg font-medium">Emir vermek için<br/>haritadan bir ülke seçin.</p>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

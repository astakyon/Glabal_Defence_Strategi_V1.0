import React from 'react';

export default function EventLogSidebar({ logs }: { logs: string[] }) {
  return (
    <div className="w-80 bg-gray-950 border-r border-gray-800 flex flex-col shadow-2xl z-10 h-[calc(100vh-64px)] overflow-hidden flex-shrink-0">
      <div className="flex-1 p-5 overflow-y-auto">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 sticky top-0 bg-gray-950 pb-2 z-10">Olay Günlüğü</h3>
        <div className="space-y-3 font-mono text-xs">
          {logs.map((log, i) => (
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
    </div>
  );
}

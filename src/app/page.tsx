'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';

// Tasa de referencia para el cálculo de ahorro
const OFFICIAL_RATE_REF = 0.9542; 

const historyData = [
  { time: '16:00', Wise: 0.951, Revolut: 0.954, Migros: 0.948 },
  { time: '16:30', Wise: 0.952, Revolut: 0.953, Migros: 0.949 },
  { time: '17:00', Wise: 0.951, Revolut: 0.956, Migros: 0.949 },
  { time: '17:30', Wise: 0.954, Revolut: 0.954, Migros: 0.951 },
  { time: '18:00', Wise: 0.954, Revolut: 0.957, Migros: 0.952 },
];

export default function RadarEliteFinal() {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(1000);
  const [isCfhToEur, setIsCfhToEur] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      const { data } = await supabase.from('exchanges').select('*').order('last_rate', { ascending: false });
      if (data) {
        setExchanges(data);
        setLastScan(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1200000); // 20 min
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] text-blue-500 font-black tracking-[0.3em] animate-pulse">
      <div className="text-4xl mb-4 italic text-white">RADAR</div>
      <div className="text-[10px] uppercase">Sincronización en curso...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] pb-20 px-4 font-sans text-white">
      <div className="max-w-xl mx-auto pt-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase">
              RADAR <span className="text-blue-600">CHF/EUR</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 border-l-2 border-emerald-500 pl-3">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                SCAN LIVE : {lastScan || '--:--'}
              </span>
            </div>
          </div>
        </div>

        {/* GRAPHIQUE NÉON */}
        {/* GRAPHIQUE NÉON RÉPARÉ (RESPONSIVE) */}
        <div className="bg-[#0f172a] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl mb-8 border border-slate-800">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic text-center sm:text-left">
            Historique 2h (Live)
          </h3>
          
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-2 mb-6 text-[9px] font-black uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#ec4899]"></span><span>Revolut</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span><span>Wise</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span><span>Migros</span></div>
          </div>

          <div className="h-64 w-full"> 
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                
                {/* AXE X : Temps avec intervalle automatique pour éviter les collisions */}
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }}
                  interval="preserveStartEnd" // Évite que les labels se chevauchent
                  minTickGap={30} // Espace minimum entre deux heures
                  dy={15} 
                />

                {/* AXE Y : Taux avec précision adaptée */}
                <YAxis 
                  hide={false} 
                  domain={['dataMin - 0.001', 'dataMax + 0.001']} 
                  axisLine={false} 
                  tickLine={false} 
                  width={45} // Largeur fixe pour stabiliser le graphique
                  tick={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }}
                  tickFormatter={(value) => value.toFixed(3)} // Formatage propre
                />

                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '15px', 
                    border: 'none', 
                    backgroundColor: '#1e293b', 
                    color: '#fff', 
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }} 
                />

                <Line 
                  type="monotone" 
                  dataKey="Revolut" 
                  stroke="#ec4899" 
                  strokeWidth={3} 
                  dot={false} 
                  strokeOpacity={selectedBank && selectedBank !== 'Revolut' ? 0.2 : 1} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Wise" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={false} 
                  strokeOpacity={selectedBank && selectedBank !== 'Wise' ? 0.2 : 1} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Migros" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  dot={false} 
                  strokeOpacity={selectedBank && selectedBank !== 'Migros' ? 0.2 : 1} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CALCULADORA */}
        <div className="bg-[#0f172a] rounded-[2.5rem] p-10 mb-10 text-center border border-slate-800 shadow-2xl">
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="text-7xl font-black bg-transparent outline-none text-center w-full text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:scale-105 transition-transform"
          />
          <button 
            onClick={() => setIsCfhToEur(!isCfhToEur)}
            className="text-blue-600 hover:text-blue-400 font-black text-xl mt-4 tracking-widest uppercase italic transition-all active:scale-95 flex items-center justify-center w-full gap-2"
          >
            {isCfhToEur ? 'Francs Suisses' : 'Euros'} <span className="text-2xl">⇄</span>
          </button>
        </div>

        {/* LISTA TOP 5 */}
        <div className="space-y-6">
          {exchanges.slice(0, 5).map((ex, index) => {
            const isTop3 = index < 3;
            const netResult = isCfhToEur ? amount * ex.last_rate : amount / ex.last_rate;
            const currentSymbol = isCfhToEur ? '€' : 'CHF';
            const isSelected = selectedBank === ex.name;

            // SAVING TRACKER vs Banca Tradicional (Comisión estimada 1.5%)
            const classicBankRate = OFFICIAL_RATE_REF * 0.985;
            const classicResult = isCfhToEur ? amount * classicBankRate : amount / classicBankRate;
            const saving = Math.max(0, Math.abs(netResult - classicResult));

            return (
              <div key={ex.id} className={`rounded-[2.5rem] p-8 border transition-all ${isSelected ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-slate-800 bg-[#0f172a]'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => isTop3 && setSelectedBank(isSelected ? null : ex.name)}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isSelected ? 'bg-blue-600' : 'bg-slate-800 hover:scale-105'}`}
                    >
                      {/* Logo SVG con salvaguarda a Letra */}
                      <img 
                        src={`/logos/${ex.name}.svg`} 
                        alt=""
                        className="w-10 h-10 object-contain brightness-0 invert opacity-90"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const p = e.currentTarget.parentElement;
                          if (p && !p.querySelector('.fallback')) {
                            const s = document.createElement('span');
                            s.className = 'fallback text-2xl font-black italic text-white';
                            s.innerText = ex.name[0].toUpperCase();
                            p.appendChild(s);
                          }
                        }}
                      />
                    </button>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">
                      MARGE: {(((OFFICIAL_RATE_REF - ex.last_rate) / OFFICIAL_RATE_REF) * 100).toFixed(2)}%
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-4xl font-black tracking-tighter">
                      {netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currentSymbol}
                    </div>
                    <div className="mt-3 inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse">
                       <p className="text-[10px] text-emerald-400 font-black uppercase tracking-tighter">
                         ✨ AHORRO: +{saving.toFixed(2)}{currentSymbol}
                       </p>
                    </div>
                  </div>
                </div>

                <a 
                  href={['Migros', 'BCGE'].includes(ex.name) ? `https://www.google.com/maps/search/${ex.name}+Genève` : `https://${ex.name.toLowerCase()}.com`} 
                  target="_blank"
                  className="block w-full py-5 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-center active:scale-95 transition-transform hover:bg-blue-50"
                >
                  {['Migros', 'BCGE'].includes(ex.name) ? '📍 LOCALIZAR' : '🌐 OBTENER TASA'}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
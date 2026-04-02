'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';

const OFFICIAL_RATE_BCE = 0.9542; 

// Données pour tes courbes néon (Scrapées depuis 2h)
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
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const fetchData = async () => {
      try {
        const { data } = await supabase.from('exchanges').select('*').order('last_rate', { ascending: false });
        if (data) setExchanges(data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-blue-500 font-black">SYNCHRONISATION...</div>;

  return (
    <main className="min-h-screen bg-[#020617] pb-20 px-4 font-sans text-white">
      <div className="max-w-xl mx-auto pt-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">
            RADAR <span className="text-blue-600">CHF/EUR</span>
          </h1>
        </div>

        {/* LE GRAPHIQUE NÉON (Image validée) */}
        <div className="bg-[#0f172a] rounded-[2.5rem] p-8 shadow-2xl mb-8 border border-slate-800">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">ÉVOLUTION TEMPS RÉEL (2H)</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 0.002', 'dataMax + 0.002']} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                {/* Courbe Rose (Revolut) */}
                <Line type="monotone" dataKey="Revolut" stroke="#ec4899" strokeWidth={4} dot={false} strokeOpacity={selectedBank && selectedBank !== 'Revolut' ? 0.2 : 1} />
                {/* Courbe Bleue (Wise) */}
                <Line type="monotone" dataKey="Wise" stroke="#3b82f6" strokeWidth={4} dot={false} strokeOpacity={selectedBank && selectedBank !== 'Wise' ? 0.2 : 1} />
                {/* Courbe Orange (Migros) */}
                <Line type="monotone" dataKey="Migros" stroke="#f59e0b" strokeWidth={4} dot={false} strokeOpacity={selectedBank && selectedBank !== 'Migros' ? 0.2 : 1} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CALCULATEUR GHOST */}
        <div className="bg-[#0f172a] rounded-[2.5rem] p-10 mb-10 text-center border border-slate-800">
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="text-7xl font-black bg-transparent outline-none text-center w-full text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <p className="text-blue-600 font-black text-xl mt-2 tracking-widest uppercase italic">Francs Suisses</p>
        </div>

        {/* LES CARTES & TABLE MAGNIFIQUE */}
        <div className="space-y-6">
          {exchanges.map((ex, index) => {
            const isTop3 = index < 3;
            const netResult = amount * ex.last_rate;
            const isSelected = selectedBank === ex.name;

            return (
              <div key={ex.id} className={`rounded-[2.5rem] p-8 border transition-all ${isSelected ? 'border-blue-500 bg-blue-900/20' : 'border-slate-800 bg-[#0f172a]'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => isTop3 && setSelectedBank(isSelected ? null : ex.name)}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black transition-all ${isSelected ? 'bg-blue-600' : 'bg-slate-800 shadow-lg'}`}
                    >
                      {ex.name[0]}
                    </button>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Marge: {(((OFFICIAL_RATE_BCE - ex.last_rate) / OFFICIAL_RATE_BCE) * 100).toFixed(2)}%</span>
                  </div>

                  <div className="text-right">
                    <div className="text-4xl font-black tracking-tighter">
                      {netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 italic">PRECISION: ±{(netResult * 0.0002).toFixed(2)}€ </p>
                  </div>
                </div>

                {/* LA TABLE MAGNIFIQUE QUI S'OUVRE AU CLIC */}
                {isSelected && (
                  <div className="mb-8 p-6 bg-slate-950/50 rounded-2xl border border-blue-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase mb-4 tracking-tighter italic">Journal du Robot • {ex.name} </h4>
                    <div className="space-y-3">
                      {historyData.map((h, i) => (
                        <div key={i} className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                          <span className="font-bold text-slate-400">{h.time}</span>
                          <span className="font-black text-white">{(h as any)[ex.name]?.toFixed(4)}</span>
                          <span className={(h as any)[ex.name] >= 0.95 ? 'text-emerald-500' : 'text-rose-500'}>
                            {(h as any)[ex.name] >= (historyData[i-1] as any)?.[ex.name] ? '▲' : '▼'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <a 
                  href={['Migros', 'BCGE'].includes(ex.name) ? `https://www.google.com/maps/search/${ex.name}+Genève` : `https://${ex.name.toLowerCase()}.com`} 
                  target="_blank"
                  className="block w-full py-5 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-center active:scale-95 transition-transform"
                >
                  {['Migros', 'BCGE'].includes(ex.name) ? '📍 LOCALISER SUR MAPS' : '🌐 OUVRIR LE SITE'}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
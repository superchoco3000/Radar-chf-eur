'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- CONFIGURATION ALGORITHME ÉLITE ---
const GAS_PRICE_LITER = 2.05; 
const AVG_CONSUMPTION = 7 / 100; 
const COST_PER_KM = (GAS_PRICE_LITER * AVG_CONSUMPTION) + 0.10; 
const TRAVEL_EXPENSE_TOTAL = (38 * COST_PER_KM) + (30 * 0.75);

export default function RadarEliteFinal() {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]); 
  const [amount, setAmount] = useState<number>(1000);
  const [isCfhToEur, setIsCfhToEur] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<string>('');
  const [officialRateRef, setOfficialRateRef] = useState<number>(1.0820);

  const getDisplayRate = useCallback((rawRate: number) => {
    if (!rawRate || rawRate === 0) return 0;
    return isCfhToEur ? rawRate : (1 / rawRate);
  }, [isCfhToEur]);

  const sortedExchanges = useMemo(() => {
    return [...exchanges]
      .filter(ex => ex.name !== 'OFFICIEL')
      .sort((a, b) => isCfhToEur ? b.last_rate - a.last_rate : a.last_rate - b.last_rate);
  }, [exchanges, isCfhToEur]);

  const top3Names = useMemo(() => sortedExchanges.slice(0, 3).map(e => e.name), [sortedExchanges]);

  const marketTrend = useMemo(() => {
    if (historyData.length < 10 || !top3Names[0]) return { label: "Stable", color: "text-blue-400/60", icon: "→" };
    const bankForTrend = top3Names[0];
    const current = (historyData[historyData.length - 1] as any)[bankForTrend];
    const previous = (historyData[historyData.length - 10] as any)[bankForTrend]; 
    
    if (current > previous) return { label: "Hausse : Attendez", color: "text-emerald-400", icon: "↗" };
    if (current < previous) return { label: "Baisse : Changez !", color: "text-orange-400", icon: "↘" };
    return { label: "Marché Stable", color: "text-blue-400/60", icon: "→" };
  }, [historyData, top3Names]);

  const fetchData = useCallback(async () => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    try {
      const [exRes, histRes] = await Promise.all([
        supabase.from('exchanges').select('*'),
        supabase.from('exchange_rates').select(`rate_chf_eur, captured_at, exchanges(name)`).order('captured_at', { ascending: false }).limit(600)
      ]);

      if (exRes.data) {
        setExchanges(exRes.data);
        const officialRow = exRes.data.find(ex => ex.name === 'OFFICIEL');
        if (officialRow) setOfficialRateRef(officialRow.last_rate);
      }

      if (histRes.data) {
        const grouped = histRes.data.reduce((acc: any, row: any) => {
          const time = new Date(row.captured_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          if (!acc[time]) acc[time] = { time };
          const bankName = row.exchanges?.name;
          if (bankName) acc[time][bankName] = getDisplayRate(row.rate_chf_eur);
          return acc;
        }, {});

        let finalData = Object.values(grouped).sort((a: any, b: any) => a.time.localeCompare(b.time));

        if (finalData.length > 0) {
          const lastPoint = finalData[finalData.length - 1] as Record<string, any>; // Fix typage
          const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          if (lastPoint.time !== nowTime) {
            finalData.push({ ...lastPoint, time: nowTime });
          }
        }
        setHistoryData(finalData);
      }
      setLastScan(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [getDisplayRate]);
  

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-white italic font-black animate-pulse">RADAR SYNC...</div>;

  return (
    <main className="min-h-screen bg-[#020617] pb-20 px-4 font-sans text-white">
      <div className="max-w-xl mx-auto pt-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">RADAR <span className="text-blue-600">CHF/EUR</span></h1>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">Scan Live: {lastScan}</p>
          </div>
          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
            <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-widest text-center">Statut</span>
            <span className="text-xs font-black text-emerald-400 uppercase tracking-tighter">● Online</span>
          </div>
        </div>

        {/* TAUX STAR CENTRÉ + INDICE VOLATILITÉ */}
        <div className="flex flex-col items-center justify-center mb-10 pt-4 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500/50 mb-3 animate-pulse">
            Marché Interbancaire Direct (BCE)
          </span>
          <div className="flex items-baseline gap-4">
            <span className="text-7xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              {getDisplayRate(officialRateRef).toFixed(4)}
            </span>
            <span className="text-2xl font-black text-blue-600 italic">
              {isCfhToEur ? '€' : 'CHF'}
            </span>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 mt-6 ${marketTrend.color}`}>
            <span className="text-xs font-black animate-bounce">{marketTrend.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{marketTrend.label}</span>
          </div>
        </div>

        {/* GRAPHIQUE */}
        <div className="bg-[#0f172a] rounded-[2.5rem] p-6 mb-8 border border-slate-800 shadow-2xl">
          <div className="flex justify-between items-center mb-6 px-2">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Analyse des tendances</h3>
             <div className="flex gap-3">
                {["#10b981", "#3b82f6", "#f59e0b"].map((color, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{top3Names[i] || '...'}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="h-72 w-full pr-4"> 
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} fontWeight="bold" tickMargin={10} />
                <YAxis domain={['dataMin - 0.005', 'dataMax + 0.005']} stroke="#475569" fontSize={10} fontWeight="bold" tickFormatter={(v) => v.toFixed(3)} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: '#1e293b', fontSize: '11px' }} />
                {top3Names.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={["#10b981", "#3b82f6", "#f59e0b"][i]} strokeWidth={i === 0 ? 5 : 2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CONVERTISSEUR AMÉLIORÉ */}
        <div className="bg-[#0f172a] rounded-[3rem] p-10 mb-8 text-center border border-slate-800 shadow-2xl">
          <input 
            type="number" 
            value={amount === 0 ? "" : amount} 
            onChange={(e) => {
              const val = e.target.value;
              setAmount(val === "" ? 0 : Math.abs(Number(val)));
            }} 
            placeholder="0"
            className="text-8xl font-black bg-transparent outline-none text-center w-full mb-6 placeholder:text-slate-800 transition-all focus:scale-105" 
          />
          
          <button onClick={() => setIsCfhToEur(!isCfhToEur)} className="w-full relative group">
            <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative flex items-center justify-between bg-slate-900 border border-slate-700 p-2 rounded-2xl overflow-hidden">
              <div className={`flex-1 py-4 rounded-xl transition-all duration-500 ${isCfhToEur ? 'bg-blue-600 shadow-lg' : ''}`}>
                <span className={`text-xl font-black tracking-tighter ${isCfhToEur ? 'text-white' : 'text-slate-500'}`}>FRANCS SUISSES</span>
              </div>
              <div className="px-4 text-2xl animate-pulse text-white">⇄</div>
              <div className={`flex-1 py-4 rounded-xl transition-all duration-500 ${!isCfhToEur ? 'bg-emerald-600 shadow-lg' : ''}`}>
                <span className={`text-xl font-black tracking-tighter ${!isCfhToEur ? 'text-white' : 'text-slate-500'}`}>EUROS</span>
              </div>
            </div>
          </button>
        </div>

        {/* LISTE DES CARTES AVEC SPREAD ET TRANSPARENCE SOURCES */}
        <div className="space-y-6">
          {sortedExchanges.slice(0, 10).map((ex) => {
            const displayRate = getDisplayRate(ex.last_rate);
            const netResult = amount * displayRate;
            const currentSymbol = isCfhToEur ? '€' : 'CHF';
            
            // LISTE ÉLARGIE DES POINTS NÉVRALGIQUES PHYSIQUES
            const isPhysical = [
                'Migros', 'BCGE', 'Douane (OFDF)', 'Change Savoisien', 
                'BNC', 'BGE', 'BCV', 'Raiffeisen', 'Change du Léman', 'Change Anières'
            ].includes(ex.name);
            
            const diffVsOfficial = (getDisplayRate(officialRateRef) - displayRate) * amount;
            const realProfit = isPhysical ? (isCfhToEur ? diffVsOfficial - (TRAVEL_EXPENSE_TOTAL / ex.last_rate) : diffVsOfficial - TRAVEL_EXPENSE_TOTAL) : diffVsOfficial;
            
            const spread = Math.abs(((getDisplayRate(officialRateRef) - displayRate) / getDisplayRate(officialRateRef)) * 100);

            return (
              <div key={ex.id} className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-800 relative transition-all hover:border-blue-500 group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter">{ex.name}</h2>
                       {isPhysical && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">Frontière</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase">
                       Taux: <span className="text-white">{displayRate.toFixed(4)}</span>
                    </p>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mt-1">
                      Marge prélevée: <span className={spread < 0.6 ? 'text-emerald-500' : 'text-slate-500'}>{spread.toFixed(2)}%</span>
                    </p>
                    {/* TRANSPARENCE SOURCE */}
                    <p className="text-[8px] font-medium text-slate-700 uppercase mt-1 italic tracking-tight">
                      Données: {ex.source_name || 'Scan Direct'} 
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black tracking-tighter text-blue-400">{netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currentSymbol}</p>
                    
                    <div className={`mt-2 px-4 py-1.5 border rounded-full inline-flex items-center gap-2 transition-all duration-700 
                      ${realProfit !== 0 ? 'opacity-100 scale-100' : 'opacity-20 scale-95'} 
                      ${realProfit > 0 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40'}`}>
                       <span className={`text-[12px] transition-transform duration-500 ${realProfit > 0 ? 'rotate-0' : 'rotate-180'}`}>
                         {realProfit !== 0 ? '▲' : ''}
                       </span>
                       <p className={`text-[10px] font-black uppercase tracking-widest ${realProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                         {realProfit > 0 ? `✨ Gagne +${Math.abs(realProfit).toFixed(2)}${currentSymbol}` : `⚠️ Perte ${Math.abs(realProfit).toFixed(2)}${currentSymbol}`}
                       </p>
                    </div>
                  </div>
                </div>

                <a 
                  href={isPhysical ? `https://www.google.com/maps/search/${encodeURIComponent(ex.name + " Genève")}` : (ex.affiliate_url || ex.url)} 
                  target="_blank" 
                  className="relative block w-full group overflow-hidden rounded-2xl"
                >
                  <div className="absolute inset-0 bg-blue-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  <div className="relative py-5 bg-white text-[#020617] rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] text-center transition-all duration-300 group-hover:bg-blue-50 group-hover:scale-[1.01] active:scale-[0.98] shadow-2xl">
                    {isPhysical ? '📍 Itinéraire Frontière' : '⚡ Convertir & Économiser'}
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
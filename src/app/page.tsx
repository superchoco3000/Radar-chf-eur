'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion'; // Assure-toi d'avoir installé framer-motion

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
  const [switchRotation, setSwitchRotation] = useState(0);

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
        setHistoryData(finalData);
      }
      setLastScan(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [getDisplayRate]);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  const handleSwitch = () => {
    setIsCfhToEur(!isCfhToEur);
    setSwitchRotation(prev => prev + 180);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-white italic font-black animate-pulse">RADAR SYNC...</div>;

  return (
    <main className="min-h-screen bg-[#020617] pb-20 px-4 font-sans text-white">
      <div className="max-w-xl mx-auto pt-8">
        
        {/* HEADER ÉPURÉ */}
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">RADAR <span className="text-blue-600">CHF/EUR</span></h1>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">Scan Live: {lastScan}</p>
          </div>
          <div className="bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter animate-pulse">● Online</span>
          </div>
        </div>

        {/* --- PARTIE 1 : LE TAUX TOUT EN HAUT --- */}
        <div className="flex flex-col items-center justify-center mb-10 pt-4 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500/50 mb-3 animate-pulse">
            Cours du Marché Actuel
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
            <span className="text-xs font-black">{marketTrend.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{marketTrend.label}</span>
          </div>
        </div>

        {/* --- PARTIE 2 : LE GRAPHIQUE --- */}
        <div className="bg-[#0f172a] rounded-[2.5rem] p-6 mb-12 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-600 opacity-30"></div>
          
          <div className="flex justify-between items-center mb-6 px-2">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Analyse des tendances (3 Meilleurs)</h3>
             <div className="flex gap-3">
                {["#10b981", "#3b82f6", "#f59e0b"].map((color, i) => (
                  <div key={i} className="flex items-center gap-1.5 opacity-70">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{top3Names[i] || '...'}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="h-64 w-full pr-4"> 
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} fontWeight="bold" tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin - 0.001', 'dataMax + 0.001']} stroke="#475569" fontSize={10} fontWeight="bold" tickFormatter={(v) => v.toFixed(3)} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: '#1e293b', fontSize: '11px', color: '#fff', padding: '10px' }} />
                {top3Names.map((name, i) => (
                  <Line 
                    key={name} 
                    type="monotone" 
                    dataKey={name} 
                    stroke={["#10b981", "#3b82f6", "#f59e0b"][i]} 
                    strokeWidth={i === 0 ? 5 : 2} 
                    dot={false} 
                    connectNulls={true} // ✅ GARANTIT LA LIGNE CONTINUE
                    dropShadow={i === 0 ? "0 0 10px rgba(16,185,129,0.5)" : "none"}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- PARTIE 3 : LE CONVERTISSEUR (CLOU DU SPECTACLE SHINY) --- */}
        <div className="bg-[#0f172a] rounded-[3rem] p-8 mb-12 text-center border border-slate-800 shadow-[0_0_60px_-15px_rgba(59,130,246,0.2)] relative overflow-hidden">
          
          {/* INPUT DU HAUT */}
          <div className="relative mb-6">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Convertir</div>
            <div className="flex items-center justify-center gap-2">
                <input 
                    type="number" 
                    value={amount === 0 ? "" : amount} 
                    onChange={(e) => setAmount(e.target.value === "" ? 0 : Math.abs(Number(e.target.value)))} 
                    placeholder="0"
                    className="text-7xl font-black bg-transparent outline-none text-center w-full placeholder:text-slate-800 text-white tracking-tighter transition-all focus:scale-105" 
                />
                <span className="text-3xl font-black text-blue-600 italic -mt-6">{isCfhToEur ? 'CHF' : 'EUR'}</span>
            </div>
          </div>

          {/* LE BOUTON SWITCH "SHINY" (Pièce centrale) */}
          <div className="relative h-1 mb-6 flex justify-center items-center">
            <div className="absolute w-full h-px bg-slate-800"></div>
            <motion.button 
              onClick={handleSwitch} 
              className="relative w-20 h-20 rounded-full border-4 border-slate-800 z-10 p-1 flex items-center justify-center
                bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 
                shadow-[0_0_30px_rgba(59,130,246,0.3),_inset_0_2px_10px_rgba(255,255,255,0.1)]"
              animate={{ rotate: switchRotation }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Effet de pulsation lumineuse (le "Shiny") */}
              <motion.div 
                className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl opacity-0"
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Icône Switch Gold/Silver */}
              <span className="text-4xl font-bold bg-gradient-to-br from-amber-300 via-white to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
                ⇄
              </span>
            </motion.button>
          </div>

          {/* INPUT DU BAS */}
          <div className="relative">
             <div className="flex items-center justify-center gap-2">
                <input 
                    type="text" 
                    value={loading ? "..." : (amount * (isCfhToEur ? officialRateRef : (1 / officialRateRef))).toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).replace(',', '.')}
                    readOnly
                    className="text-7xl font-black bg-transparent outline-none text-center w-full text-white/50 tracking-tighter" 
                />
                <span className="text-3xl font-black text-blue-600/50 italic -mt-6">{!isCfhToEur ? 'CHF' : 'EUR'}</span>
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1.5">Résultat approximatif</div>
          </div>
        </div>

        {/* LISTE DES CARTES (Les soldats) */}
        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-center text-slate-600 mb-8 animate-pulse">
            Comparatif des meilleures offres
        </h2>
        <div className="space-y-6">
          {sortedExchanges.slice(0, 10).map((ex) => {
            const displayRate = getDisplayRate(ex.last_rate);
            const netResult = amount * displayRate;
            const currentSymbol = isCfhToEur ? '€' : 'CHF';
            
            const isPhysical = ['Migros', 'BCGE', 'Douane (OFDF)', 'Change Savoisien', 'BNC', 'BCV', 'Raiffeisen'].some(n => ex.name.includes(n));
            
            const diffVsOfficial = (getDisplayRate(officialRateRef) - displayRate) * amount;
            const realProfit = isPhysical ? (isCfhToEur ? diffVsOfficial - (TRAVEL_EXPENSE_TOTAL / ex.last_rate) : diffVsOfficial - TRAVEL_EXPENSE_TOTAL) : diffVsOfficial;
            const spread = Math.abs(((getDisplayRate(officialRateRef) - displayRate) / getDisplayRate(officialRateRef)) * 100);

            return (
              <div key={ex.id} className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-800 relative transition-all hover:border-blue-500 group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-blue-600/10 transition-colors"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2">
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{ex.name}</h2>
                       {isPhysical && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">Frontière</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase">
                       Taux: <span className="text-white font-black">{displayRate.toFixed(4)}</span>
                    </p>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mt-1">
                      Marge: <span className={spread < 0.6 ? 'text-emerald-500' : 'text-slate-500'}>{spread.toFixed(2)}%</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black tracking-tighter text-blue-400">{netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currentSymbol}</p>
                    
                    <div className={`mt-2 px-4 py-1.5 border rounded-full inline-flex items-center gap-2 
                      ${realProfit > 0 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
                       <span className="text-[10px] font-black uppercase tracking-widest">
                         {realProfit > 0 ? `✨ Gagne +${Math.abs(realProfit).toFixed(2)}` : `⚠️ Perte ${Math.abs(realProfit).toFixed(2)}`}{currentSymbol}
                       </span>
                    </div>
                  </div>
                </div>

                <a 
                  href={isPhysical ? `https://www.google.com/maps/search/${encodeURIComponent(ex.name + " Genève")}` : (ex.affiliate_url || ex.url)} 
                  target="_blank" 
                  className="relative block w-full group overflow-hidden rounded-2xl shadow-2xl z-10"
                >
                  <div className="absolute inset-0 bg-blue-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  <div className="relative py-5 bg-white text-[#020617] rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] text-center transition-all duration-300 group-hover:bg-blue-50 group-hover:scale-[1.01] active:scale-[0.98]">
                    {isPhysical ? '📍 Itinéraire Frontière' : '⚡ Convertir & Économiser'}
                  </div>
                </a>
              </div>
            );
          })}
        </div>
        
        {/* FOOTER ÉPURÉ */}
        <div className="text-center text-[10px] text-slate-700 font-black uppercase tracking-[0.3em] mt-16 pt-8 border-t border-slate-900">
            © {new Date().getFullYear()} Radar Élité CHF/EUR. Tous droits réservés.
        </div>
      </div>
    </main>
  );
}
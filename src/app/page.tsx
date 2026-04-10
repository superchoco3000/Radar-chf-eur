'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

// Initialisation unique du client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- CONFIGURATION ALGORITHME ÉLITE ---
const GAS_PRICE_LITER = 2.05; 
const AVG_CONSUMPTION = 7 / 100; 
const COST_PER_KM = (GAS_PRICE_LITER * AVG_CONSUMPTION) + 0.10; 
const TRAVEL_EXPENSE_TOTAL = (38 * COST_PER_KM) + (30 * 0.75);

export default function RadarEliteFinal() {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [rawHistory, setRawHistory] = useState<any[]>([]); 
  const [amount, setAmount] = useState<number>(1000);
  const [isCfhToEur, setIsCfhToEur] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<string>('');
  const [officialRateRef, setOfficialRateRef] = useState<number>(1.0820);
  const [switchRotation, setSwitchRotation] = useState(0);

  // Transformation du taux pour l'affichage (Inversion si nécessaire)
  const getDisplayRate = useCallback((rawRate: number) => {
    if (!rawRate || rawRate === 0) return 0;
    return isCfhToEur ? rawRate : (1 / rawRate);
  }, [isCfhToEur]);

  // Données formatées pour le graphique (recalculées localement lors du switch)
  const chartData = useMemo(() => {
    return rawHistory.map(point => {
      const newPoint = { ...point };
      Object.keys(point).forEach(key => {
        if (key !== 'time' && typeof point[key] === 'number') {
          newPoint[key] = isCfhToEur ? point[key] : (1 / point[key]);
        }
      });
      return newPoint;
    });
  }, [rawHistory, isCfhToEur]);

  const sortedExchanges = useMemo(() => {
    return [...exchanges]
      .filter(ex => ex.name !== 'OFFICIEL')
      .sort((a, b) => isCfhToEur ? b.last_rate - a.last_rate : a.last_rate - b.last_rate);
  }, [exchanges, isCfhToEur]);

  const top3Names = useMemo(() => sortedExchanges.slice(0, 3).map(e => e.name), [sortedExchanges]);

  const marketTrend = useMemo(() => {
    if (chartData.length < 5 || !top3Names[0]) return { label: "Stable", color: "text-blue-400/60", icon: "→" };
    const bankForTrend = top3Names[0];
    const current = chartData[chartData.length - 1][bankForTrend];
    const previous = chartData[0][bankForTrend]; 
    
    if (current > previous) return { label: isCfhToEur ? "Hausse : Attendez" : "Baisse : Changez !", color: "text-emerald-400", icon: "↗" };
    if (current < previous) return { label: isCfhToEur ? "Baisse : Changez !" : "Hausse : Attendez", color: "text-orange-400", icon: "↘" };
    return { label: "Marché Stable", color: "text-blue-400/60", icon: "→" };
  }, [chartData, top3Names, isCfhToEur]);

  const fetchData = useCallback(async () => {
    try {
      const [exRes, histRes] = await Promise.all([
        supabase.from('exchanges').select('*'),
        supabase.from('exchange_rates')
          .select(`rate_chf_eur, captured_at, exchanges(name)`)
          .order('captured_at', { ascending: false })
          .limit(300)
      ]);

      if (exRes.data) {
        setExchanges(exRes.data);
        const officialRow = exRes.data.find(ex => ex.name === 'OFFICIEL');
        if (officialRow) setOfficialRateRef(officialRow.last_rate);
      }

      if (histRes.data) {
        // Groupement par temps sans inversion (on stocke le brut CHF->EUR)
        const grouped = histRes.data.reduce((acc: any, row: any) => {
          const time = new Date(row.captured_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          if (!acc[time]) acc[time] = { time, timestamp: new Date(row.captured_at).getTime() };
          const bankName = row.exchanges?.name;
          if (bankName) acc[time][bankName] = row.rate_chf_eur;
          return acc;
        }, {});

        const sortedHistory = Object.values(grouped).sort((a: any, b: any) => a.timestamp - b.timestamp);
        setRawHistory(sortedHistory);
      }
      setLastScan(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) { 
      console.error("Erreur de synchronisation:", err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const i = setInterval(fetchData, 60000); // 1 minute suffit pour le radar
    return () => clearInterval(i); 
  }, [fetchData]);

  const handleSwitch = () => {
    setIsCfhToEur(!isCfhToEur);
    setSwitchRotation(prev => prev + 180);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-white italic font-black animate-pulse">RADAR SYNC...</div>;

  return (
    <main className="min-h-screen bg-[#020617] pb-20 px-4 font-sans text-white">
      <div className="max-w-xl mx-auto pt-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">RADAR <span className="text-blue-600">CHF/EUR</span></h1>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">Scan Live: {lastScan}</p>
          </div>
          <div className="bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter animate-pulse">● Online</span>
          </div>
        </div>

        {/* COURS DU MARCHÉ */}
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

        {/* GRAPHIQUE */}
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
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} fontWeight="bold" tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} fontWeight="bold" tickFormatter={(v) => v.toFixed(3)} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: '#1e293b', fontSize: '11px', color: '#fff', padding: '10px' }} />
                {top3Names.map((name, i) => (
                  <Line 
                    key={name} 
                    type="monotone" 
                    dataKey={name} 
                    stroke={["#10b981", "#3b82f6", "#f59e0b"][i]} 
                    strokeWidth={i === 0 ? 4 : 2} 
                    dot={false} 
                    connectNulls={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CONVERTISSEUR SHINY */}
        <div className="bg-[#0f172a] rounded-[3rem] p-8 mb-12 text-center border border-slate-800 shadow-[0_0_60px_-15px_rgba(59,130,246,0.2)] relative overflow-hidden">
          <div className="relative mb-6">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Convertir</div>
            <div className="flex items-center justify-center gap-2">
                <input 
                    type="number" 
                    value={amount === 0 ? "" : amount} 
                    onChange={(e) => setAmount(e.target.value === "" ? 0 : Math.abs(Number(e.target.value)))} 
                    placeholder="0"
                    className="text-7xl font-black bg-transparent outline-none text-center w-full placeholder:text-slate-800 text-white tracking-tighter" 
                />
                <span className="text-3xl font-black text-blue-600 italic -mt-6">{isCfhToEur ? 'CHF' : 'EUR'}</span>
            </div>
          </div>

          <div className="relative h-1 mb-6 flex justify-center items-center">
            <div className="absolute w-full h-px bg-slate-800"></div>
            <motion.button 
              onClick={handleSwitch} 
              className="relative w-20 h-20 rounded-full border-4 border-slate-800 z-10 p-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900"
              animate={{ rotate: switchRotation }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className="text-4xl font-bold bg-gradient-to-br from-amber-300 via-white to-amber-300 bg-clip-text text-transparent">⇄</span>
            </motion.button>
          </div>

          <div className="relative">
             <div className="flex items-center justify-center gap-2">
                <input 
                    type="text" 
                    value={loading ? "..." : (amount * getDisplayRate(officialRateRef)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    readOnly
                    className="text-7xl font-black bg-transparent outline-none text-center w-full text-white/50 tracking-tighter" 
                />
                <span className="text-3xl font-black text-blue-600/50 italic -mt-6">{!isCfhToEur ? 'CHF' : 'EUR'}</span>
            </div>
          </div>
        </div>

        {/* LISTE DES BUREAUX */}
        <div className="space-y-6">
          {sortedExchanges.slice(0, 12).map((ex) => {
            const displayRate = getDisplayRate(ex.last_rate);
            const netResult = amount * displayRate;
            const currentSymbol = isCfhToEur ? '€' : 'CHF';
            const isPhysical = ['Migros', 'BCGE', 'Douane', 'Savoisien', 'BNC', 'BCV', 'Raiffeisen', 'Léman', 'Ben\'s'].some(n => ex.name.includes(n));
            
            const diffVsOfficial = (displayRate - getDisplayRate(officialRateRef)) * amount;
            // On gagne si notre taux est meilleur que l'officiel (plus d'EUR pour nos CHF ou moins de CHF pour nos EUR)
            const realProfit = isPhysical ? (diffVsOfficial - TRAVEL_EXPENSE_TOTAL) : diffVsOfficial;

            return (
              <div key={ex.id} className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-800 relative transition-all hover:border-blue-500 group overflow-hidden">
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2">
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{ex.name}</h2>
                       {isPhysical && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black uppercase">Frontière</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase">
                       Taux: <span className="text-white font-black">{displayRate.toFixed(4)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black tracking-tighter text-blue-400">{netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currentSymbol}</p>
                    <div className={`mt-2 px-4 py-1.5 border rounded-full inline-flex items-center gap-2 ${realProfit > 0 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
                       <span className="text-[10px] font-black uppercase tracking-widest">
                         {realProfit > 0 ? `✨ Gagne +${Math.abs(realProfit).toFixed(2)}` : `⚠️ Perte ${Math.abs(realProfit).toFixed(2)}`}{currentSymbol}
                       </span>
                    </div>
                  </div>
                </div>

                <a 
                  href={isPhysical ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ex.name + " Genève")}` : (ex.affiliate_url || ex.url || "#")} 
                  target="_blank" 
                  className="relative block w-full group overflow-hidden rounded-2xl z-10"
                >
                  <div className="relative py-5 bg-white text-[#020617] rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] text-center transition-all group-hover:bg-blue-50 group-hover:scale-[1.01]">
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
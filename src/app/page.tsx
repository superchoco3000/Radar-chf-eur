'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, TrendingUp, ArrowRightLeft, MapPin, MousePointer2 } from 'lucide-react';

// --- INITIALISATION UNIQUE ---
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

  // --- LOGIQUE DE SYNCHRONISATION ---
  const fetchData = useCallback(async () => {
    try {
      const [exRes, histRes] = await Promise.all([
        supabase.from('exchanges').select('*'),
        supabase.from('exchange_rates')
          .select(`rate_chf_eur, captured_at, exchanges(name)`)
          .order('captured_at', { ascending: false })
          .limit(350)
      ]);

      if (exRes.data) {
        setExchanges(exRes.data);
        const officialRow = exRes.data.find(ex => ex.name === 'OFFICIEL');
        if (officialRow) setOfficialRateRef(officialRow.last_rate);
      }

      if (histRes.data) {
        const grouped = histRes.data.reduce((acc: any, row: any) => {
          const time = new Date(row.captured_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          if (!acc[time]) acc[time] = { time, timestamp: new Date(row.captured_at).getTime() };
          const bankName = row.exchanges?.name;
          if (bankName) acc[time][bankName] = row.rate_chf_eur;
          return acc;
        }, {});
        setRawHistory(Object.values(grouped).sort((a: any, b: any) => a.timestamp - b.timestamp));
      }
      setLastScan(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) { console.error("Erreur sync:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const i = setInterval(fetchData, 60000);
    return () => clearInterval(i); 
  }, [fetchData]);

  // --- TRANSFORMATIONS ---
  const getDisplayRate = useCallback((rawRate: number) => {
    if (!rawRate) return 0;
    return isCfhToEur ? rawRate : (1 / rawRate);
  }, [isCfhToEur]);

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
      .sort((a, b) => getDisplayRate(b.last_rate) - getDisplayRate(a.last_rate));
  }, [exchanges, isCfhToEur, getDisplayRate]);

  const bestRate = sortedExchanges[0]?.last_rate || 1;
  const convertedResult = amount * getDisplayRate(bestRate);
  const top3Names = useMemo(() => sortedExchanges.slice(0, 3).map(e => e.name), [sortedExchanges]);

  const toggleDirection = () => {
    setIsCfhToEur(!isCfhToEur);
    setSwitchRotation(prev => prev + 180);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-emerald-500 italic font-black animate-pulse uppercase tracking-widest">Initialisation de l'armée...</div>;

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 md:p-10 font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* --- HEADER ÉLITE (Nettoyé et Remplacé par Taux Unitaire) --- */}
      <div className="max-w-6xl mx-auto mb-16 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-500 font-black tracking-[0.4em] text-[10px] uppercase">
              <Zap size={14} fill="currentColor" /> Intelligence de Change Active
            </div>
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
              RADAR<span className="text-emerald-500">.</span>IO
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Dernier Scan : {lastScan}</p>
          </div>

          {/* Taux Unitaire Live qui remplace l'ancien convertisseur */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-2xl backdrop-blur-md shrink-0">
            <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-1 text-center">Taux Unitaire Live</p>
            <div className="text-xl md:text-2xl font-black italic text-emerald-400">
              1 {isCfhToEur ? 'CHF' : 'EUR'} = {getDisplayRate(bestRate).toFixed(4)}
            </div>
          </div>
        </div>

        {/* --- GRAPHIQUE ANALYTIQUE --- */}
        <div className="bg-[#0f172a] rounded-[3rem] p-8 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Performance des Leaders</h2>
            </div>
            <div className="flex gap-4">
              {["#10b981", "#3b82f6", "#6366f1"].map((color, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{top3Names[i] || '...'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[250px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} dy={10} minTickGap={30} />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
                {top3Names.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={["#10b981", "#3b82f6", "#6366f1"][i]} strokeWidth={4} dot={false} connectNulls={true} activeDot={{ r: 6, stroke: '#0f172a', strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- CONVERTISSEUR EXACT (AJOUTÉ SOUS LE GRAPH) --- */}
        <div className="max-w-6xl mx-auto my-12">
          <div className="relative flex flex-col md:flex-row bg-[#0f172a] border border-slate-800 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl overflow-hidden">
            
            {/* Input (Partie Gauche) */}
            <div className="flex-1 w-full md:w-1/2 p-8 md:p-16 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-center">
              <input 
                type="number" 
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="bg-transparent text-[clamp(3rem,7vw,7rem)] font-black w-full outline-none placeholder-slate-800 italic text-center md:text-left leading-none whitespace-nowrap"
                placeholder="0"
              />
              <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mt-4 text-center md:text-left">
                {isCfhToEur ? 'Francs Suisses à vendre' : 'Euros à vendre'}
              </p>
            </div>

            {/* SWITCH ABSOLU AVEC BORDURE "CUTOUT" */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <motion.button 
                onClick={toggleDirection}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{ rotate: switchRotation }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                // Le border-[#0f172a] crée l'effet de découpe visuelle
                className="bg-white text-black p-4 md:p-5 rounded-full hover:bg-emerald-400 transition-colors border-[8px] border-[#0f172a] shadow-lg"
              >
                <ArrowRightLeft size={28} strokeWidth={3} />
              </motion.button>
            </div>

            {/* Résultat (Partie Droite) */}
            <div className="flex-1 w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-[#0f172a]">
              <div className="text-[clamp(3rem,7vw,7rem)] font-black italic text-white leading-none w-full text-center md:text-right break-words whitespace-nowrap">
                {convertedResult.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mt-4 text-center md:text-right">
                {isCfhToEur ? 'Euros Reçus (Elite)' : 'Francs Reçus (Elite)'}
              </p>
            </div>
            
          </div>
        </div>

      </div>

      {/* --- LISTE DES BUREAU DE CHANGE (Ta logique exacte) --- */}
      <div className="max-w-3xl mx-auto space-y-8 mt-12">
        <AnimatePresence>
          {sortedExchanges.slice(0, 10).map((ex, index) => {
            const isBest = index === 0;
            const displayRate = getDisplayRate(ex.last_rate);
            const netResult = amount * displayRate;
            const currentSymbol = isCfhToEur ? '€' : 'CHF';
            const isPhysical = ['Migros', 'BCGE', 'Douane', 'Savoisien', 'BNC', 'BCV', 'Raiffeisen', 'Léman', 'Ben\'s'].some(n => ex.name.includes(n));
            
            const minutesAgo = Math.floor((new Date().getTime() - new Date(ex.update_at).getTime()) / 60000);
            const benchmarkRate = getDisplayRate(sortedExchanges[4]?.last_rate || ex.last_rate);
            const opportunityGain = (displayRate - benchmarkRate) * amount;

            const refRate = getDisplayRate(officialRateRef);
            const diffVsOfficial = (displayRate - refRate) * amount;
            const realProfit = isPhysical ? (diffVsOfficial - TRAVEL_EXPENSE_TOTAL) : diffVsOfficial;

            return (
              <motion.div 
                key={ex.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`relative bg-[#0f172a] rounded-[2.5rem] p-10 border ${isBest ? 'border-emerald-500 shadow-[0_0_50px_-15px_rgba(16,185,129,0.2)]' : 'border-slate-800'} transition-all hover:border-slate-600`}
              >
                {isBest && (
                  <div className="absolute -top-3 left-12 bg-emerald-500 text-black px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    🥇 Option Optimale
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter">{ex.name}</h3>
                      {isPhysical && <MapPin size={18} className="text-slate-500" />}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Clock size={12} /> {minutesAgo < 1 ? 'Actualisé LIVE' : `Délai: ${minutesAgo}m`}
                      </div>
                      <div className="text-lg font-black text-emerald-500 italic bg-emerald-500/5 px-4 py-1 rounded-full border border-emerald-500/20">
                        {displayRate.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <div className="text-6xl font-black tracking-tighter leading-none mb-3">
                      {netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      <span className="text-xl ml-3 text-slate-600 font-bold uppercase">{currentSymbol}</span>
                    </div>
                    <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${realProfit > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                      {realProfit > 0 ? '✨ Gain net :' : '⚠️ Impact :'} {realProfit.toFixed(2)} {currentSymbol}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-slate-800/50 pt-8">
                  <div className="flex gap-4">
                    <div className="bg-white/5 rounded-2xl p-4 flex-1 border border-white/5">
                      <p className="text-[8px] font-black text-slate-600 uppercase mb-1 tracking-widest text-center">Coût Trajet</p>
                      <p className="text-sm font-black text-white text-center">{isPhysical ? `${TRAVEL_EXPENSE_TOTAL.toFixed(2)}€` : '0.00€'}</p>
                    </div>
                    {isBest && opportunityGain > 0.1 && (
                      <div className="bg-emerald-500/5 rounded-2xl p-4 flex-1 border border-emerald-500/10 text-center flex flex-col justify-center animate-pulse">
                         <span className="text-[10px] font-black text-emerald-500 uppercase leading-none">+{opportunityGain.toFixed(2)}€</span>
                         <span className="text-[7px] font-black text-emerald-500/60 uppercase mt-1">Économisés</span>
                      </div>
                    )}
                  </div>
                  
                  <a 
                    href={isPhysical ? `https://www.google.com/maps/search/${encodeURIComponent(ex.name + " Genève")}` : (ex.affiliate_url || ex.url || "#")} 
                    target="_blank" 
                    className="flex items-center justify-center gap-3 bg-white text-black py-6 rounded-3xl font-black uppercase text-xs tracking-[0.3em] hover:bg-emerald-400 transition-all hover:gap-6 group"
                  >
                    {isPhysical ? '📍 Voir itinéraire' : '⚡ Conversion Directe'} <MousePointer2 size={16} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </main>
  );
}
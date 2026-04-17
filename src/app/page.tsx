'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, ArrowRightLeft, MousePointer2, ShieldCheck, Clock, ChevronDown, Lightbulb, Target, Users, Cloud, Wifi, WifiOff, ChevronUp } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- CONFIGURATION LOGISTIQUE (GENÈVE) ---
const GAS_PRICE_LITER = 2.05; 
const AVG_CONSUMPTION = 7 / 100; 
const COST_PER_KM = (GAS_PRICE_LITER * AVG_CONSUMPTION) + 0.10; 
const TRAVEL_EXPENSE_TOTAL = Math.ceil((38 * COST_PER_KM) + (30 * 0.75)) + 2; 

export const dynamic = 'force-dynamic';

export default function RadarEliteFinal() {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [rawHistory, setRawHistory] = useState<any[]>([]); 
  const [amount, setAmount] = useState<number>(1000);
  const [isCfhToEur, setIsCfhToEur] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<string>('');
  const [officialRateRef, setOfficialRateRef] = useState<number>(1.0820);
  const [switchRotation, setSwitchRotation] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Detect slow/data-saving connections
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const conn = (navigator as any).connection;
      if (conn) {
        const check = () => setDataSaver(conn.saveData === true || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
        check();
        conn.addEventListener('change', check);
        return () => conn.removeEventListener('change', check);
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [exRes, histRes] = await Promise.all([
        supabase.from('exchanges').select('*'),
        supabase.from('exchange_rates').select(`rate_chf_eur, captured_at, exchanges(name)`).order('captured_at', { ascending: false }).limit(350)
      ]);
      if (exRes.error) throw exRes.error;
      if (exRes.data) {
        setExchanges(exRes.data);
        setIsOffline(false);
        const off = exRes.data.find((ex: any) => ex.name === 'OFFICIEL');
        if (off) setOfficialRateRef(off.last_rate);
        localStorage.setItem('cached_rates', JSON.stringify(exRes.data));
        localStorage.setItem('cached_rates_ts', new Date().toISOString());
      }
      if (histRes.data) {
        const grouped = histRes.data.reduce((acc: any, row: any) => {
          const time = new Date(row.captured_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          if (!acc[time]) acc[time] = { time, timestamp: new Date(row.captured_at).getTime() };
          const bName = row.exchanges?.name;
          if (bName) acc[time][bName] = row.rate_chf_eur;
          return acc;
        }, {});
        setRawHistory(Object.values(grouped).sort((a: any, b: any) => a.timestamp - b.timestamp));
      }
      setLastScan(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('[RADAR] Réseau indisponible, chargement du cache local…', err);
      const saved = localStorage.getItem('cached_rates');
      if (saved) {
        setExchanges(JSON.parse(saved));
        setIsOffline(true);
        const ts = localStorage.getItem('cached_rates_ts');
        if (ts) setLastScan(new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, [fetchData]);

  const getDisplayRate = useCallback((rawRate: number) => isCfhToEur ? rawRate : (1 / rawRate), [isCfhToEur]);

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

  const validatedExchanges = useMemo(() => {
    return [...exchanges]
      .filter(ex => ex.name !== 'OFFICIEL' && Math.abs(ex.last_rate - officialRateRef) / officialRateRef < 0.05)
      .sort((a, b) => getDisplayRate(b.last_rate) - getDisplayRate(a.last_rate));
  }, [exchanges, isCfhToEur, officialRateRef, getDisplayRate]);

  const top3Names = useMemo(() => validatedExchanges.slice(0, 3).map(e => e.name), [validatedExchanges]);

  const formatSpecialConditions = (text: string) => {
    if (!text) return [];
    return text.split('|').map(s => s.trim());
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-emerald-500 font-black animate-pulse uppercase tracking-[0.5em]">Initialisation...</div>;

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpandedId(expandedId === id ? null : id);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 md:p-10 font-sans selection:bg-emerald-500 pb-20 overflow-x-hidden">
      
      <div className="max-w-6xl mx-auto mb-10 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-emerald-500 font-black tracking-[0.4em] text-[10px] uppercase">
                <Zap size={14} fill="currentColor" /> Scan Stratégique Actif
              </div>
              {/* Live / Cache indicator */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border backdrop-blur-sm transition-all duration-500 ${
                isOffline
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {isOffline ? <WifiOff size={10} /> : <Wifi size={10} />}
                {isOffline ? 'Cache' : 'Live'}
              </div>
              {dataSaver && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  📡 Éco-Data
                </div>
              )}
            </div>
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
              RADAR<span className="text-emerald-500">.</span>ELITE
            </h1>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Scan : {lastScan}</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-2xl backdrop-blur-md w-full md:w-auto text-center md:text-left">
            <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Marché Réel (Interbancaire)</p>
            <div className="text-xl md:text-2xl font-black italic text-emerald-400">
              1 {isCfhToEur ? 'CHF' : 'EUR'} = {getDisplayRate(officialRateRef).toFixed(4)}
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a] rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-800 pb-6 gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-500" size={18}/>
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Volatilité Comparée</h2>
            </div>
            <div className="flex flex-wrap gap-4">
              {["#10b981", "#3b82f6", "#6366f1"].map((color, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{top3Names[i] || '...'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[200px] md:h-[350px] w-full">
            {exchanges.length > 0 && !dataSaver && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} dy={10} minTickGap={40} />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} />
                  {top3Names.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={["#10b981", "#3b82f6", "#6366f1"][i]} strokeWidth={3} dot={false} connectNulls={true} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
            {dataSaver && (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                <WifiOff size={32} className="mb-2 opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-widest">Graphique masqué (Éco-Data)</p>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto my-8">
          <div className="relative flex flex-col items-center bg-[#0f172a] border border-slate-800 rounded-[2rem] md:rounded-[4rem] shadow-2xl overflow-hidden">
            <div className="w-full flex flex-col items-center p-6 md:p-10 border-b border-slate-800">
              <input 
                type="number" 
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="bg-transparent text-4xl md:text-8xl font-black w-full outline-none placeholder-slate-800 italic text-center leading-none"
                placeholder="0"
              />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Somme à convertir</p>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <motion.button 
                onClick={() => { setIsCfhToEur(!isCfhToEur); setSwitchRotation(r => r + 180); }}
                animate={{ rotate: switchRotation }}
                className="bg-white text-black p-4 md:p-6 rounded-full border-[8px] border-[#0f172a] shadow-xl active:scale-90 transition-transform"
                aria-label="Inverser les devises de conversion" title="Inverser les devises"
              >
                <ArrowRightLeft className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
              </motion.button>
            </div>
            <div className="w-full flex flex-col items-center p-6 md:p-10 bg-[#0f172a]">
              <div className="text-4xl md:text-8xl font-black italic text-white text-center leading-none truncate w-full">
                {(amount * getDisplayRate(validatedExchanges[0]?.last_rate || officialRateRef)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Estimation Réception Elite</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mb-6 px-2">
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-4">
          <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
          <p className="text-[10px] md:text-[11px] font-medium text-slate-300 leading-relaxed italic">
            <span className="text-emerald-500 font-black uppercase tracking-widest">Note de Transparence :</span> Les données affichées proviennent des flux publics officiels des établissements. Ce radar est un outil indépendant de comparaison algorithmique. Pour plus de détails sur nos sources et calculs, consultez notre <a href="/methodologie" rel="noopener noreferrer" className="text-white underline hover:text-emerald-400">Méthodologie complète</a>.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 px-2">
        <AnimatePresence>
          {validatedExchanges.slice(0, showAll ? undefined : 3).map((ex, index) => {
            const displayRate = getDisplayRate(ex.last_rate);
            const refRate = getDisplayRate(officialRateRef);
            const currentSymbol = isCfhToEur ? '€' : 'CHF';
            
            const fees = ex.fixed_fee || 0;
            const spreadMoney = Math.abs((displayRate - refRate) * amount);
            const minutesAgo = ex.update_at ? Math.floor((new Date().getTime() - new Date(ex.update_at).getTime()) / 60000) : NaN;
            const travelCosts = ex.type === 'physical' ? TRAVEL_EXPENSE_TOTAL : 0;
            const realProfit = ((displayRate - refRate) * amount) - travelCosts - fees;
            const isOutdated = !isNaN(minutesAgo) && minutesAgo > 65;

            const isExpanded = expandedId === ex.id;
            const isSunday = new Date().getDay() === 0;
            const isOfficialBody = ex.name.toUpperCase().includes('DOUANE') || ex.name.toUpperCase().includes('OFFICIEL');
            const tips = formatSpecialConditions(ex.special_conditions);

            return (
              <motion.div 
                key={ex.id} 
                layout 
                className={`bg-[#0f172a] rounded-[2rem] border transition-all duration-300 ${
                  isExpanded ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-2xl' : index === 0 ? 'border-emerald-500/50 shadow-xl' : 'border-slate-800'
                } ${isOutdated ? 'opacity-100 grayscale-[0.2] border-red-300/20' : ''}`}
              >
                
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => handleKeyDown(e, ex.id)}
                  aria-expanded={isExpanded}
                  className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-slate-800 font-black italic text-2xl md:text-3xl">0{index + 1}</span>
                    <div>
                      <h3 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter truncate max-w-[200px] md:max-w-none transition-colors group-hover:text-emerald-400">{ex.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${ex.type === 'physical' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                          {ex.type}
                        </span>
                        <div className="flex items-center gap-1.5 ml-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isOutdated 
                              ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse' 
                              : (isSunday && isOfficialBody ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]')
                          }`} />
                          <span className={`text-[8px] font-bold uppercase tracking-widest ${
                            isOutdated ? 'text-red-400' : (isSunday && isOfficialBody ? 'text-amber-500' : 'text-slate-400')
                          }`}>
                            {isOutdated 
                              ? '⚠️ ROBOT HORS-LIGNE' 
                              : (isSunday && isOfficialBody 
                                  ? "💤 Marché fermé (Taux du Samedi)" 
                                  : `Robot Sync : ${isNaN(minutesAgo) ? 'NAN' : minutesAgo}m ago`)
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Taux Direct</p>
                      <p className="text-2xl md:text-3xl font-black">{displayRate.toFixed(4)}</p>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-slate-600 transition-colors group-hover:text-emerald-500">
                      <ChevronDown size={28} strokeWidth={3} />
                    </motion.div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/50">
                  <div className="p-6 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-500"><ShieldCheck size={14}/><span className="text-[9px] font-black uppercase">Audit Transparence</span></div>
                    <p className="text-xs text-slate-300 italic">
                      "La banque se rémunère <span className="text-white font-bold">{spreadMoney.toFixed(2)} {currentSymbol}</span> sur cette transaction."
                    </p>
                  </div>

                  <div className="p-6 space-y-2 bg-slate-900/20">
                    <div className="flex items-center gap-2 text-blue-400"><Clock size={14}/><span className="text-[9px] font-black uppercase">Statut</span></div>
                    <p className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">
                      {isSunday && isOfficialBody 
                        ? "🚫 Marchés Fermés" 
                        : (ex.opening_hours || "Consultez les horaires officiels")
                      }
                    </p>
                    {isSunday && isOfficialBody ? (
                      <p className="text-[9px] text-amber-500 font-black italic uppercase tracking-tighter animate-pulse">
                        Reprise des cotations Lundi
                      </p>
                    ) : (
                      <p className="text-[9px] text-amber-500 font-black italic uppercase tracking-tighter">
                        Cliquez pour l'expertise infiltrée
                      </p>
                    )}
                  </div>

                  <div className="p-6 flex flex-col justify-center items-center text-center bg-[#020617]/40">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-2">Gain Réel Net</p>
                    <div className={`text-3xl font-black ${realProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {realProfit > 0 ? '+' : ''}{realProfit.toFixed(2)} {currentSymbol}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[#020617] border-t border-slate-800"
                    >
                      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/10 pb-2">
                            <Lightbulb size={18} />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Stratégie Élite</h4>
                          </div>
                          <div className="space-y-3">
                            {tips.length > 0 ? tips.slice(0, 2).map((tip, i) => (
                              <div key={i} className="flex gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <Target className="text-emerald-500 shrink-0" size={14} />
                                <p className="text-[11px] text-slate-300 leading-relaxed font-bold italic">"{tip}"</p>
                              </div>
                            )) : (
                              <p className="text-[10px] text-slate-300 italic uppercase">Aucune donnée stratégique pour ce guichet.</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-blue-400 border-b border-blue-500/10 pb-2">
                            <Users size={18} />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Contexte de Terrain</h4>
                          </div>
                          <div className="space-y-3">
                             {tips.length > 2 ? tips.slice(2).map((tip, i) => (
                              <div key={i} className="flex gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <Users className="text-blue-400 shrink-0" size={14} />
                                <p className="text-[11px] text-slate-300 leading-relaxed font-bold italic">"{tip}"</p>
                              </div>
                            )) : (
                               <div className="flex gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <Users className="text-blue-400 shrink-0" size={14} />
                                <p className="text-[11px] text-slate-300 leading-relaxed font-bold italic">"Pas d'alertes de volume spécifiques pour ce point de change."</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-900/20 border-t border-slate-800/50">
                        <a 
                          href={ex.type === 'physical' 
                            ? (ex.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ex.address)}` : "#") 
                            : (ex.website_url || "#")
                          }
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-3 py-6 rounded-2xl bg-white text-black font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                        >
                          {ex.type === 'physical' ? '📍 Itinéraire Guichet Stratégique' : '⚡ Accéder au site officiel'}
                          <MousePointer2 size={18} />
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-2 bg-slate-900/40 border-t border-slate-800/50 flex justify-center rounded-b-[2rem]">
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                    Source : Tarifs publics constatés via scan digital sur le site officiel de {ex.name}
                  </p>
                </div>

              </motion.div>
            );
          })}
        </AnimatePresence>

        {validatedExchanges.length > 3 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors uppercase tracking-[0.2em] font-black text-[10px]"
            >
              {showAll ? (
                <>Réduire la liste <ChevronUp size={16} /></>
              ) : (
                <>Voir les {validatedExchanges.length} bureaux comparés <ChevronDown size={16} /></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* FOOTER MINIMALISTE */}
      <footer className="max-w-5xl mx-auto mt-20 pb-10 px-2 border-t border-slate-800/50 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              © 2026 RADAR ELITE — Douvaine, France
            </p>
            <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold">
              Algorithme de comparaison indépendant pour frontaliers
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            <a 
              href="mailto:lucascasanove@yahoo.fr" 
              className="text-[10px] font-black text-emerald-500 hover:text-white transition-colors uppercase tracking-widest border border-emerald-500/20 px-4 py-2 rounded-lg"
            >
              Contact : lucascasanove@yahoo.fr
            </a>
            <p className="text-[8px] text-slate-600 uppercase font-black italic">
              Projet d'expertise informatique - BUT Lyon
            </p>
          </div>
        </div>
      </footer>

    </main>
  );
}
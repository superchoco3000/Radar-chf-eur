'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
// Ajout de ChevronDown pour l'indicateur d'ouverture et les icônes de section
import { Zap, TrendingUp, ArrowRightLeft, MousePointer2, ShieldCheck, Clock, ChevronDown, Lightbulb, Target, Users } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- CONFIGURATION LOGISTIQUE (GENÈVE) ---
const GAS_PRICE_LITER = 2.05; 
const AVG_CONSUMPTION = 7 / 100; 
const COST_PER_KM = (GAS_PRICE_LITER * AVG_CONSUMPTION) + 0.10; 
const TRAVEL_EXPENSE_TOTAL = Math.ceil((38 * COST_PER_KM) + (30 * 0.75)) + 2; 

export default function RadarEliteFinal() {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [rawHistory, setRawHistory] = useState<any[]>([]); 
  const [amount, setAmount] = useState<number>(1000);
  const [isCfhToEur, setIsCfhToEur] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<string>('');
  const [officialRateRef, setOfficialRateRef] = useState<number>(1.0820);
  const [switchRotation, setSwitchRotation] = useState(0);

  // État pour gérer quelle carte est ouverte
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [exRes, histRes] = await Promise.all([
        supabase.from('exchanges').select('*'),
        supabase.from('exchange_rates').select(`rate_chf_eur, captured_at, exchanges(name)`).order('captured_at', { ascending: false }).limit(350)
      ]);
      if (exRes.data) {
        setExchanges(exRes.data);
        const off = exRes.data.find(ex => ex.name === 'OFFICIEL');
        if (off) setOfficialRateRef(off.last_rate);
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
    } catch (err) { console.error(err); } finally { setLoading(false); }
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

  // Utilitaire pour découper les conditions spéciales selon le séparateur |
  const formatSpecialConditions = (text: string) => {
    if (!text) return [];
    return text.split('|').map(s => s.trim());
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-emerald-500 font-black animate-pulse uppercase tracking-[0.5em]">Initialisation...</div>;

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 md:p-10 font-sans selection:bg-emerald-500 pb-20 overflow-x-hidden">
      
      {/* HEADER (Logique inchangée) */}
      <div className="max-w-6xl mx-auto mb-10 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-500 font-black tracking-[0.4em] text-[10px] uppercase">
              <Zap size={14} fill="currentColor" /> Scan Stratégique Actif
            </div>
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
              RADAR<span className="text-emerald-500">.</span>IO
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Scan : {lastScan}</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-2xl backdrop-blur-md w-full md:w-auto text-center md:text-left">
            <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Marché Réel (Interbancaire)</p>
            <div className="text-xl md:text-2xl font-black italic text-emerald-400">
              1 {isCfhToEur ? 'CHF' : 'EUR'} = {getDisplayRate(officialRateRef).toFixed(4)}
            </div>
          </div>
        </div>

        {/* GRAPHIQUE (Logique inchangée) */}
        <div className="bg-[#0f172a] rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-800 pb-6 gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-500" size={18}/>
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Volatilité Comparée</h2>
            </div>
            <div className="flex flex-wrap gap-4">
              {["#10b981", "#3b82f6", "#6366f1"].map((color, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{top3Names[i] || '...'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[200px] md:h-[350px] w-full">
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
          </div>
        </div>

        {/* CONVERTISSEUR (Logique inchangée) */}
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
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Somme à convertir</p>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <motion.button 
                onClick={() => { setIsCfhToEur(!isCfhToEur); setSwitchRotation(r => r + 180); }}
                animate={{ rotate: switchRotation }}
                className="bg-white text-black p-4 md:p-6 rounded-full border-[8px] border-[#0f172a] shadow-xl active:scale-90 transition-transform"
              >
                <ArrowRightLeft className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
              </motion.button>
            </div>
            <div className="w-full flex flex-col items-center p-6 md:p-10 bg-[#0f172a]">
              <div className="text-4xl md:text-8xl font-black italic text-white text-center leading-none truncate w-full">
                {(amount * getDisplayRate(validatedExchanges[0]?.last_rate || officialRateRef)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Estimation Réception Elite</p>
            </div>
          </div>
        </div>
      </div>

      {/* LISTE DES CARTES (Logique conservée, Système d'accordéon ajouté) */}
      <div className="max-w-5xl mx-auto space-y-6 px-2">
        <AnimatePresence>
          {validatedExchanges.slice(0, 8).map((ex, index) => {
            const displayRate = getDisplayRate(ex.last_rate);
            const refRate = getDisplayRate(officialRateRef);
            const currentSymbol = isCfhToEur ? '€' : 'CHF';
            
            // --- TA LOGIQUE DE CALCUL STRICTE ---
            const fees = ex.fixed_fee || 0;
            const spreadMoney = Math.abs((displayRate - refRate) * amount);
            const minutesAgo = ex.update_at ? Math.floor((new Date().getTime() - new Date(ex.update_at).getTime()) / 60000) : NaN;
            const travelCosts = ex.type === 'physical' ? TRAVEL_EXPENSE_TOTAL : 0;
            const realProfit = ((displayRate - refRate) * amount) - travelCosts - fees;

            const isExpanded = expandedId === ex.id;
            const tips = formatSpecialConditions(ex.special_conditions);

            return (
              <motion.div 
                key={ex.id} 
                layout // Permet l'animation fluide des autres cartes au déploiement
                className={`bg-[#0f172a] rounded-[2rem] border transition-all duration-300 ${isExpanded ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-2xl' : index === 0 ? 'border-emerald-500/50 shadow-xl' : 'border-slate-800'} overflow-hidden`}
              >
                
                {/* Header Carte (Devient clickable pour l'accordéon) */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : ex.id)}
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
                          <div className={`w-1 h-1 rounded-full ${minutesAgo < 15 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                            Robot Sync : {isNaN(minutesAgo) ? 'NAN' : minutesAgo}m ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Taux Direct</p>
                      <p className="text-2xl md:text-3xl font-black">{displayRate.toFixed(4)}</p>
                    </div>
                    {/* Indicateur visuel d'accordéon */}
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-slate-600 transition-colors group-hover:text-emerald-500">
                      <ChevronDown size={28} strokeWidth={3} />
                    </motion.div>
                  </div>
                </div>

                {/* Grille Info (Toujours visible) */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/50">
                  <div className="p-6 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-500"><ShieldCheck size={14}/><span className="text-[9px] font-black uppercase">Audit Transparence</span></div>
                    <p className="text-xs text-slate-400 italic">
                      "La banque se rémunère <span className="text-white font-bold">{spreadMoney.toFixed(2)} {currentSymbol}</span> sur cette transaction."
                    </p>
                  </div>

                  <div className="p-6 space-y-2 bg-slate-900/20">
                    <div className="flex items-center gap-2 text-blue-400"><Clock size={14}/><span className="text-[9px] font-black uppercase">Statut</span></div>
                    <p className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">
                      {ex.opening_hours || "Consultez les horaires officiels"}
                    </p>
                    <p className="text-[9px] text-amber-500 font-black italic uppercase tracking-tighter animate-pulse">Cliquez pour l'expertise infiltrée</p>
                  </div>

                  <div className="p-6 flex flex-col justify-center items-center text-center bg-[#020617]/40">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Gain Réel Net</p>
                    <div className={`text-3xl font-black ${realProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {realProfit > 0 ? '+' : ''}{realProfit.toFixed(2)} {currentSymbol}
                    </div>
                  </div>
                </div>

                {/* CONTENU DÉPLIABLE (ACCORDÉON) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[#020617] border-t border-slate-800"
                    >
                      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section Astuces / Stratégie */}
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
                              <p className="text-[10px] text-slate-500 italic uppercase">Aucune donnée stratégique pour ce guichet.</p>
                            )}
                          </div>
                        </div>

                        {/* Section Localisation & Volume */}
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

                      {/* Action Button intégré en bas du tiroir */}
                      <div className="p-6 bg-slate-900/20 border-t border-slate-800/50">
                        <a 
                          href={ex.type === 'physical' ? (ex.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ex.address)}` : "#") : (ex.website_url || "#")} 
                          target="_blank"
                          className="w-full flex items-center justify-center gap-3 py-6 rounded-2xl bg-white text-black font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                        >
                          {ex.type === 'physical' ? '📍 Itinéraire Guichet Stratégique' : '⚡ Accéder au Taux Elite'}
                          <MousePointer2 size={18} />
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </main>
  );
}
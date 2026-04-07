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
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  // ✅ NOUVEAU : État pour le taux officiel dynamique (remplace la constante fixe)
  const [officialRateRef, setOfficialRateRef] = useState<number>(1.0820);

// Dans page.tsx, remplace par ceci :
  const getDisplayRate = useCallback((rawRate: number) => {
    if (!rawRate || rawRate === 0) return 0;
      // Si tes scrapers envoient TOUS du 1.08 (1 EUR = X CHF),
      // alors on affiche simplement rawRate en mode "Achat"
      // et on inverse seulement si l'utilisateur veut voir le mode "Salaire"
    return isCfhToEur ? rawRate : (1 / rawRate);
  }, [isCfhToEur]);
  const sortedExchanges = useMemo(() => {
    // On filtre pour ne pas afficher la ligne "OFFICIEL" dans la liste des cartes
    return [...exchanges]
      .filter(ex => ex.name !== 'OFFICIEL')
      .sort((a, b) => isCfhToEur ? b.last_rate - a.last_rate : a.last_rate - b.last_rate);
  }, [exchanges, isCfhToEur]);

  const top3Names = useMemo(() => sortedExchanges.slice(0, 3).map(e => e.name), [sortedExchanges]);

  const fetchData = useCallback(async () => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    try {
      const [exRes, histRes] = await Promise.all([
        supabase.from('exchanges').select('*'),
        supabase.from('exchange_rates').select(`rate_chf_eur, captured_at, exchanges(name)`).order('captured_at', { ascending: false }).limit(600)
      ]);

      if (exRes.data) {
        setExchanges(exRes.data);
        
        // ✅ MAJ FETCHDATA : On cherche la ligne OFFICIEL pour mettre à jour la référence du Radar
        const officialRow = exRes.data.find(ex => ex.name === 'OFFICIEL');
        if (officialRow) {
          setOfficialRateRef(officialRow.last_rate);
        }
      }

      if (histRes.data) {
        const grouped = histRes.data.reduce((acc: any, row: any) => {
          const time = new Date(row.captured_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          if (!acc[time]) acc[time] = { time };
          
          const bankName = row.exchanges?.name;
          if (bankName) {
            // On applique getDisplayRate ici pour que le graphique soit lié au bouton
            acc[time][bankName] = getDisplayRate(row.rate_chf_eur);
          }
          
          return acc;
        }, {});

        const finalData = Object.values(grouped).sort((a: any, b: any) => a.time.localeCompare(b.time));
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">RADAR <span className="text-blue-600">CHF/EUR</span></h1>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">Scan Live: {lastScan}</p>
          </div>
          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
            <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-widest">Taux Moyen</span>
            {/* ✅ Utilisation du taux dynamique récupéré via fetchData */}
            <span className="text-lg font-black text-blue-400">{getDisplayRate(officialRateRef).toFixed(4)}</span>
          </div>
        </div>

        {/* GRAPHIQUE AVEC AXES GRADUÉS */}
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
                <XAxis 
                  dataKey="time" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickMargin={10}
                />
                <YAxis 
                  domain={['dataMin - 0.005', 'dataMax + 0.005']} 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickFormatter={(v) => v.toFixed(3)}
                />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: '#1e293b', fontSize: '11px' }} />
                {top3Names.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={["#10b981", "#3b82f6", "#f59e0b"][i]} strokeWidth={i === 0 ? 5 : 2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GROS BOUTON CONVERSEUR STYLISÉ */}
        <div className="bg-[#0f172a] rounded-[3rem] p-10 mb-8 text-center border border-slate-800 shadow-2xl">
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="text-7xl font-black bg-transparent outline-none text-center w-full mb-6" />
          
          <button 
            onClick={() => setIsCfhToEur(!isCfhToEur)} 
            className="w-full relative group"
          >
            <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative flex items-center justify-between bg-slate-900 border border-slate-700 p-2 rounded-2xl overflow-hidden">
              <div className={`flex-1 py-4 rounded-xl transition-all duration-500 ${isCfhToEur ? 'bg-blue-600 shadow-lg' : ''}`}>
                <span className={`text-xl font-black tracking-tighter ${isCfhToEur ? 'text-white' : 'text-slate-500'}`}>FRANCS SUISSES</span>
              </div>
              <div className="px-4 text-2xl animate-pulse">⇄</div>
              <div className={`flex-1 py-4 rounded-xl transition-all duration-500 ${!isCfhToEur ? 'bg-emerald-600 shadow-lg' : ''}`}>
                <span className={`text-xl font-black tracking-tighter ${!isCfhToEur ? 'text-white' : 'text-slate-500'}`}>EUROS</span>
              </div>
            </div>
          </button>
          <p className="text-[10px] font-black text-slate-500 mt-6 tracking-[0.4em] uppercase italic">Cliquez pour inverser la vue</p>
        </div>

        {/* LISTE DES CARTES */}
        <div className="space-y-6">
          {sortedExchanges.slice(0, 6).map((ex) => {
            const displayRate = getDisplayRate(ex.last_rate);
            const netResult = amount * displayRate;
            const currentSymbol = isCfhToEur ? '€' : 'CHF';
            const isPhysical = ['Migros', 'BCGE', 'Douane (OFDF)', 'Change Savoisien'].includes(ex.name);
            
            // ✅ Utilisation du taux officiel dynamique pour le calcul de rentabilité
            const diffVsOfficial = (getDisplayRate(officialRateRef) - displayRate) * amount;
            const realProfit = isPhysical ? (isCfhToEur ? diffVsOfficial - (TRAVEL_EXPENSE_TOTAL / ex.last_rate) : diffVsOfficial - TRAVEL_EXPENSE_TOTAL) : diffVsOfficial;

            return (
              <div key={ex.id} className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-800 relative transition-all hover:border-blue-500 group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter">{ex.name}</h2>
                       {isPhysical && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black uppercase">Local</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase">
                       Taux: <span className="text-white">{displayRate.toFixed(4)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black tracking-tighter text-blue-400">{netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currentSymbol}</p>
                    <div className={`mt-2 px-4 py-1.5 border rounded-full inline-block ${realProfit > 0 ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                       <p className={`text-[10px] font-black uppercase ${realProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                         {realProfit > 0 ? `✨ Gagne +${Math.abs(realProfit).toFixed(2)}${currentSymbol}` : `⚠️ Perte ${Math.abs(realProfit).toFixed(2)}${currentSymbol}`}
                       </p>
                    </div>
                  </div>
                </div>
                <a href={isPhysical ? `https://www.google.com/maps/search/${encodeURIComponent(ex.name)}+Geneve` : ex.url} target="_blank" className="block w-full py-5 bg-white text-[#020617] rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] text-center shadow-xl group-hover:bg-blue-50 transition-colors">
                  {isPhysical ? 'ITINÉRAIRE DOUVAINE' : 'OUVRIR L\'APPLICATION'}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
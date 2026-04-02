'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function RadarPage() {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ON INITIALISE LE CLIENT ICI, À L'INTÉRIEUR DU HOOK
    // Comme ça, Vercel ne râle pas pendant la compilation (build)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Variables Supabase manquantes");
      setLoading(false);
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('exchanges')
          .select('*')
          .order('last_rate', { ascending: false });
        
        if (error) throw error;
        if (data) setExchanges(data);
      } catch (e) {
        console.error("Erreur de récupération:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Le reste de ton code (le return avec le tableau) reste identique

  if (loading) return <div className="p-10 text-center text-slate-400 font-mono">Chargement...</div>;

  const bestRate = exchanges[0]?.last_rate || 0;

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Épuré */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">🛰️ Radar CHF/EUR</h1>
          <p className="text-slate-500 italic mb-8">"L'armée de SaaS compare, vous économisez."</p>
          
          {/* Calculateur Discret */}
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-full px-6 py-2 shadow-sm">
            <span className="text-slate-400 text-sm font-medium mr-3">Montant :</span>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-24 text-xl font-bold text-slate-800 focus:outline-none bg-transparent"
            />
            <span className="text-slate-800 font-bold ml-1">CHF</span>
          </div>
        </div>

        {/* Tableau Original Respecté */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="py-4 px-6 font-semibold">Source</th>
                <th className="py-4 px-6 font-semibold text-right">Tu reçois</th>
                <th className="py-4 px-6 font-semibold text-right text-slate-400 text-xs uppercase tracking-wider">Économie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exchanges.map((exchange, index) => {
                const received = amount * exchange.last_rate;
                const loss = (amount * bestRate) - received;

                return (
                  <tr key={exchange.id} className={`hover:bg-slate-50 transition-colors ${index === 0 ? 'bg-green-50/50' : ''}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{exchange.name}</span>
                        {index === 0 && (
                          <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">BEST</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">1 CHF = {exchange.last_rate.toFixed(4)}</div>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-blue-600">
                      {received.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="py-4 px-6 text-right">
                      {index === 0 ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <span className="text-red-400 text-sm font-medium">-{loss.toFixed(2)}€</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-slate-400 text-[10px] uppercase tracking-widest">
          Mise à jour automatique • Flux Supabase Cloud
        </p>
      </div>
    </main>
  );
}
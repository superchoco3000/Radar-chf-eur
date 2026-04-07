import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateOfficialRate() {
  console.log("🌐 Récupération du taux officiel (Frankfurter API)...");

  try {
    // 1. Appel à l'API (Source : Banques Centrales)
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=CHF');
    const data = await response.json();

    if (data && data.rates && data.rates.CHF) {
      const officialEurToChf = parseFloat(data.rates.CHF.toFixed(4));
      
      console.log(`🎯 Taux Officiel détecté : 1 EUR = ${officialEurToChf} CHF`);

      // 2. Mise à jour dans Supabase
      // On cherche la ligne qui s'appelle 'OFFICIEL'
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: officialEurToChf, 
          update_at: new Date().toISOString() 
        })
        .eq('name', 'OFFICIEL'); // ⚠️ Assure-toi d'avoir une ligne nommée OFFICIEL dans ta table

      if (error) throw error;
      console.log("✅ Référence mise à jour dans la base de données !");
    }
  } catch (err: any) {
    console.error("❌ Erreur lors de la mise à jour officielle :", err.message);
  }
}

updateOfficialRate();
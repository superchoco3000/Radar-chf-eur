import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function runScraper() {
  console.log("🚀 Lancement du robot Mon-Taux (Version Graphique + Stable)...");

  try {
    // 1. On récupère la liste des bureaux de change enregistrés pour avoir leurs IDs
    const { data: dbExchanges } = await supabase
        .from('exchanges')
        .select('id, name');

    const { data } = await axios.get('https://mon-taux.com/taux-de-change-euro-chf-frontalier/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const $ = cheerio.load(data);
    const rows = $('table tr').get();

    for (const el of rows) {
      const rawName = $(el).find('td').first().text().trim();
      const rawRate = $(el).find('td:nth-child(2)').text().replace(',', '.').trim();
      const rate = parseFloat(rawRate);

      if (rawName && !isNaN(rate)) {
        // On cherche si ce bureau existe dans ta base de données par son nom
        const match = dbExchanges?.find(db => db.name === rawName);

        if (match) {
          console.log(`📡 Mise à jour pour : ${rawName} (${rate})`);
          
          // ✅ A. Mise à jour du gros chiffre (Table exchanges)
          const { error: updateError } = await supabase
            .from('exchanges')
            .update({ 
                last_rate: rate,
                update_at: new Date().toISOString()
                // source_name SUPPRIMÉ : Il faisait planter ton GitHub Actions
            })
            .eq('id', match.id);

          if (updateError) {
              console.error(`❌ Erreur update ${rawName}:`, updateError.message);
              continue;
          }

          // ✅ B. AJOUT POUR LE GRAPHIQUE (Table exchange_rates)
          const { error: histError } = await supabase
            .from('exchange_rates')
            .insert({ 
              exchange_id: match.id,
              rate_chf_eur: rate,
              captured_at: new Date().toISOString()
            });

          if (histError) console.error(`⚠️ Erreur historique ${rawName}:`, histError.message);
        }
      }
    }
    console.log("✅ Mission Mon-Taux terminée avec succès !");

  } catch (error) {
    console.error("💥 Erreur critique du robot Mon-Taux :", error);
  }
}

runScraper();
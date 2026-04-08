import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const SUPABASE_URL = 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runScraper() {
  console.log("🚀 Lancement du robot Mon-Taux...");

  try {
    const { data: dbExchanges } = await supabase.from('exchanges').select('name');
    const { data } = await axios.get('https://mon-taux.com/taux-de-change-euro-chf-frontalier/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const $ = cheerio.load(data);
    const results: any[] = [];

    const rows = $('table tr').get();
    for (const el of rows) {
      const rawName = $(el).find('td').first().text().trim();
      const rawRate = $(el).find('td:nth-child(2)').text().replace(',', '.').trim();
      const rate = parseFloat(rawRate);

      if (rawName && !isNaN(rate)) {
        const match = dbExchanges?.find(db => db.name === rawName);

        if (match) {
          await supabase
            .from('exchanges')
            .update({ 
                last_rate: rate, // VERIFIE BIEN CE NOM DANS TA BASE
                update_at: new Date().toISOString(),
                source_name: 'Mon-Taux.com'
            })
            .eq('name', match.name);
          
          results.push({ Bureau: match.name, Taux: rate, Statut: 'Mis à jour ✅' });
        }
      }
    }

    console.table(results);
    console.log("🎖️ Ton armée a mis à jour les taux avec succès.");

  } catch (err) {
    console.error("💥 Erreur de mission :", err);
  }
}

runScraper();
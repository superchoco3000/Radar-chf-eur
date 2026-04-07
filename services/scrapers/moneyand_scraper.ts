import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const MONEYAND_DB_ID = '645183b5-39cd-4d9e-b724-bf2f0b95e5d9'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeMoneyAnd() {
  console.log("🚀 Lancement du robot Money&Com...");
  const browser = await chromium.launch({ headless: true }); 
  const page = await browser.newPage();

  try {
    await page.goto('https://moneyand.com/', { waitUntil: 'domcontentloaded' });

    const eurOption = page.locator('#currency_0 option[value="EUR"]');
    const rawSellRate = await eurOption.getAttribute('data-sell');

    if (rawSellRate) {
      // Le site donne 1 EUR = X CHF (ex: 0.93)
      const rateOnPage = parseFloat(rawSellRate);      
      
      if (!isNaN(rateOnPage)) {
        // ✅ LOGIQUE RADAR : Inversion pour avoir 1 CHF = X EUR
        const finalRate = parseFloat((1 / rateOnPage).toFixed(4));
        
        console.log(`💰 Source Money&Com (1 EUR =) : ${rateOnPage} CHF`);
        console.log(`✅ Taux Radar : ${finalRate} EUR`);

        // 1. UPDATE : Pour la carte
        await supabase
          .from('exchanges')
          .update({ 
            last_rate: finalRate, 
            update_at: new Date().toISOString() 
          })
          .eq('id', MONEYAND_DB_ID);

        // ✅ 2. INSERT : Pour le GRAPHIQUE (Historique)
        const { error: histError } = await supabase
          .from('exchange_rates')
          .insert({ 
            exchange_id: MONEYAND_DB_ID, 
            rate_chf_eur: finalRate,
            captured_at: new Date().toISOString()
          });

        if (!histError) console.log("✅ Money&Com synchronisé (Carte + Graphique) !");
      }
    }

  } catch (err: any) {
    console.error("💥 Erreur Money&Com :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeMoneyAnd();
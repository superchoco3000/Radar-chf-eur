import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// On demande d'abord au système (GitHub), sinon on prend la valeur locale
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ID à créer dans Supabase pour Money&Com
const MONEYAND_DB_ID = '645183b5-39cd-4d9e-b724-bf2f0b95e5d9'; 

async function scrapeMoneyAnd() {
  console.log("🚀 Lancement du robot Money&Com...");
  const browser = await chromium.launch({ headless: true }); 
  const page = await browser.newPage();

  try {
    await page.goto('https://moneyand.com/', { waitUntil: 'domcontentloaded' });

    // 1. On cible l'option EUR dans le menu déroulant (vu sur ton F12)
    const eurOption = page.locator('#currency_0 option[value="EUR"]');
    
    // 2. On récupère la valeur de vente (le prix de 1€ en CHF)
    const rawSellRate = await eurOption.getAttribute('data-sell');

    if (rawSellRate) {
      const sellPriceInChf = parseFloat(rawSellRate);
      
      // 3. Conversion pour ton radar (1 CHF = X EUR)
      const finalRate = parseFloat((1 / sellPriceInChf).toFixed(4));
      
      console.log(`💰 1 EUR coûte ${sellPriceInChf} CHF au guichet.`);
      console.log(`🎯 Taux pour ton radar (1 CHF =) : ${finalRate}`);

      // 4. Mise à jour Supabase
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', MONEYAND_DB_ID);

      if (!error) console.log("✅ RÉUSSITE : Money&Com synchronisé.");
      else console.error("❌ Erreur Supabase :", error.message);
    } else {
      console.log("⚠️ Impossible de lire l'attribut data-sell.");
    }

  } catch (err: any) {
    console.error("💥 Erreur :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeMoneyAnd();
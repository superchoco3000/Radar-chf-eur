import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// ... (tes imports)
dotenv.config({ path: '.env.local',override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// AJOUTE CECI :
console.log("DEBUG - KEY Length:", SUPABASE_KEY?.length); 
console.log("DEBUG - KEY Start:", SUPABASE_KEY?.substring(0, 3));

// Log de diagnostic pour vérifier que les clés sont bien chargées
if (SUPABASE_KEY) {
    console.log(`🔑 Clé détectée (début) : ${SUPABASE_KEY.substring(0, 10)}...`);
} else {
    console.log("⚠️ Aucune clé trouvée dans l'environnement local.");
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Erreur : Clés Supabase introuvables ! Vérifiez votre fichier .env.local");
}

const WISE_DB_ID = '95f416a5-7eff-43cf-9908-79a7771478ca'; // Ton ID Wise
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeWise() {
  console.log("🚀 Lancement du robot Wise...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigation vers le comparateur CHF -> EUR
    await page.goto('https://wise.com/fr/currency-converter/chf-to-eur-rate', { 
      waitUntil: 'networkidle' 
    });

    console.log("🔍 Analyse du taux Wise...");

    // 1. Gestion des cookies
    const cookieBtn = page.locator('#twcc__accept-button');
    if (await cookieBtn.isVisible()) {
      await cookieBtn.click();
      console.log("✅ Cookies Wise acceptés");
    }

    // 2. Extraction du taux (ex: "1 CHF = 1.08480 EUR")
    const rateText = await page.locator('span:has-text("1 CHF =")').first().innerText();
    const match = rateText.match(/[\d,.]+/g);
    
    if (match && match[1]) {
      // ✅ Correction : On utilise le VRAI taux lu (ex: 1.0811)
      const finalRate = parseFloat(match[1].replace(',', '.'));

      if (!isNaN(finalRate)) {
        console.log(`📊 Taux Radar Wise : 1 CHF = ${finalRate} EUR`);

        // ✅ 3. UPDATE : Pour la carte (Table exchanges)
        const { error: updateErr } = await supabase
          .from('exchanges')
          .update({ 
            last_rate: finalRate, 
            update_at: new Date().toISOString() 
          })
          .eq('id', WISE_DB_ID);

        if (updateErr) console.error("❌ Erreur Update :", updateErr.message);

        // ✅ 4. INSERT : Pour le graphique (Table exchange_rates)
        const { error: histError } = await supabase
          .from('exchange_rates')
          .insert({ 
            exchange_id: WISE_DB_ID, 
            rate_chf_eur: finalRate,
            captured_at: new Date().toISOString()
          });

        if (!histError) console.log("✅ Wise synchronisé (Carte + Graphique) !");
        else console.error("❌ Erreur historique :", histError.message);
      }
    }

  } catch (err: any) {
    console.error("💥 Erreur Wise :", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Navigateur fermé.");
  }
}

scrapeWise();
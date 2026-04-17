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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BCGE_DB_ID = '69e0bc4f-d819-4f9d-8922-046db5f09e41'; 

async function scrapeBCGE() {
  console.log("🚀 Lancement du robot BCGE...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 0. Bloqueo de recursos pesados para optimizar RAM
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2}', route => route.abort());
    await page.goto('https://www.bcge.ch/fr/cours-billets-et-devises', { 
        waitUntil: 'networkidle',
        timeout: 30000 
    });

    console.log("🔍 Analyse du tableau des cours...");

    const eurRow = page.locator('tr').filter({ hasText: 'EUR' }).first();
    await eurRow.waitFor({ timeout: 15000 });

    const cells = eurRow.locator('td');
    // Colonne "Vente Billets" (5ème colonne, index 4)
    const rateRaw = await cells.nth(4).innerText(); 
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());

    if (!isNaN(rateOnPage) && rateOnPage !== 0) {      
      const finalRate = parseFloat((1 / rateOnPage).toFixed(4));      
      console.log(`📊 Brut BCGE : ${rateOnPage} | Radar : 1 EUR = ${finalRate} CHF`);

      // ✅ Mise à jour de la table principale
      const { error: updateError } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() // ✅ Correct
        })
        .eq('id', BCGE_DB_ID);

      if (updateError) throw updateError;

      // ✅ Insertion dans l'historique
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: BCGE_DB_ID,
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
        });

      if (histError) throw histError;
      console.log("✅ Données synchronisées avec succès !");
    }
  } catch (err: any) {
    console.error("💥 Erreur lors du scraping :", err.message);
  } finally {
    await browser.close();
    console.log("🏁 Robot déconnecté.");
  }
}

scrapeBCGE();
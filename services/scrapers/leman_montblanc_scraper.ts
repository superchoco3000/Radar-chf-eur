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
    console.log(`🔑 Clé détectée (début) : ${SUPABASE_KEY.substring(0, 3)}...`);
} else {
    console.log("⚠️ Aucune clé trouvée dans l'environnement local.");
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Erreur : Clés Supabase introuvables ! Vérifiez votre fichier .env.local");
}


const LEMAN_MB_ID = '937ce748-e56b-4242-afa8-f3da68149bf0'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeLemanMB() {
  console.log("🚀 Lancement du robot Léman Mont-Blanc...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Navigation
    await page.goto('https://changelemanmontblanc.fr/', { waitUntil: 'networkidle', timeout: 60000 });

    console.log("🔍 Extraction du taux EUR/CHF...");
    await page.waitForSelector('tbody#tabDevis tr', { timeout: 10000 });

    // Extraction de la première ligne (EUR) - Taux de vente dans la 3ème cellule (index 2)
    const rateRaw = await page.locator('tbody#tabDevis tr').first().locator('td').nth(2).innerText();
    
    // On nettoie le texte (remplace virgule par point)
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());
    
    // ✅ LOGIQUE RADAR : Inversion (1 / taux) pour avoir 1 CHF = X EUR
    const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

    if (!isNaN(finalRate) && finalRate !== 0) {
      console.log(`📊 Brut Léman MB : 1 EUR = ${rateOnPage} CHF | ✅ Radar : ${finalRate} EUR`);

      // 1. UPDATE : Pour la carte (Prix actuel)
      await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate,
          update_at: new Date().toISOString() 
        })
        .eq('id', LEMAN_MB_ID);

      // ✅ 2. INSERT : Pour le GRAPHIQUE (Historique)
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: LEMAN_MB_ID, 
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
        });

      if (!histError) console.log("✅ Léman Mont-Blanc synchronisé (Carte + Graphique) !");
      else console.error("❌ Erreur historique :", histError.message);
    }

  } catch (err: any) {
    console.error("💥 Erreur Léman Mont-Blanc :", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Robot Léman MB déconnecté.");
  }
}

scrapeLemanMB();
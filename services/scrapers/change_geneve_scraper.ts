import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// ... (tes imports)
dotenv.config({ path: '.env.local',override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// AJOUTE CECI :
console.log("DEBUG - KEY Length:", SUPABASE_KEY?.length); 
console.log("DEBUG - KEY Start:", SUPABASE_KEY?.substring(0, 2));

// Log de diagnostic pour vérifier que les clés sont bien chargées
if (SUPABASE_KEY) {
    console.log(`🔑 Clé détectée (début) : ${SUPABASE_KEY.substring(0, 2)}...`);
} else {
    console.log("⚠️ Aucune clé trouvée dans l'environnement local.");
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Erreur : Clés Supabase introuvables ! Vérifiez votre fichier .env.local");
}

const GENEVE_DB_ID = '4bb150f3-96f3-4f29-8c66-a4dd93cde25d'; // Ton ID vérifié
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeChangeGeneve() {
  console.log("🚀 Lancement du robot Change-Genève...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.change-geneve.com/', { waitUntil: 'networkidle' });

    console.log("⏳ Attente du chargement des taux (2s)...");
    
    // 1. On s'assure que la table est visible
    await page.locator('#exchange_rates').scrollIntoViewIfNeeded();
    // On attend un peu plus car ce site utilise souvent des scripts lents
    await page.waitForTimeout(2000);

    // 2. Extraction du taux EUR (Vente)
    const row = page.locator('table.table-auto tbody tr').first();
    const rateRaw = await row.locator('td').nth(2).innerText();
    
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());
    
    if (!isNaN(rateOnPage) && rateOnPage !== 0) {
      // 🎯 CALCUL RADAR : 1 / Taux pour avoir le prix d'un EUR en CHF
      const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

      console.log(`📊 Brut Genève : 1 EUR = ${rateOnPage} CHF | Radar : ${finalRate} EUR`);

      // ✅ 3. UPDATE : Pour la carte en bas
      const { error: updateErr } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', GENEVE_DB_ID);

      if (updateErr) console.error("❌ Erreur Update :", updateErr.message);

      // ✅ 4. INSERT : Pour le graphique
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: GENEVE_DB_ID, 
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
        });

      if (!histError) console.log("✅ Change-Genève synchronisé !");
      else console.error("❌ Erreur graphique :", histError.message);
    } else {
      console.error("⚠️ Taux lu invalide ou égal à zéro.");
    }

  } catch (err: any) {
    console.error("💥 Erreur :", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Navigateur fermé.");
  }
}

scrapeChangeGeneve();
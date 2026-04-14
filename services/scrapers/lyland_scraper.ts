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

const LYLAND_DB_ID = '34797c66-87fc-412b-a990-49971f87a6bc'; // Remplace par l'UUID de Lyland dans ta table
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeLyland() {
  console.log("🚀 Lancement du robot Lyland...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://lyland.ch/', { waitUntil: 'networkidle' });

    console.log("⏳ Attente du chargement des données...");

    // On cible le premier tableau pour éviter l'erreur de doublon d'ID
    const tableLocator = page.locator('#tableDevis').first();
    await tableLocator.scrollIntoViewIfNeeded();
    
    // Pause pour laisser le script de Lyland remplir les cases
    await page.waitForTimeout(1500);

    // Extraction : tr (1ère ligne) > td (3ème colonne pour la vente EUR)
    const rateRaw = await page.locator('tbody#tabDevis3 tr').first().locator('td').nth(2).innerText();
    
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());
    
    // Inversion Radar (1 / taux) pour avoir 1 CHF = X EUR
    const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

    if (!isNaN(finalRate)) {
      console.log(`📊 Radar Lyland : 1 CHF = ${finalRate} EUR`);

      // 1. UPDATE (Carte)
      await supabase.from('exchanges').update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
      }).eq('id', LYLAND_DB_ID);

      // ✅ 2. INSERT (Graphique - MANQUANT dans ta version)
      const { error: histError } = await supabase.from('exchange_rates').insert({ 
          exchange_id: LYLAND_DB_ID, 
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
      });

      if (!histError) console.log("✅ Lyland synchronisé partout !");
    }

  } catch (err: any) {
    console.error("💥 Erreur Lyland :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeLyland();
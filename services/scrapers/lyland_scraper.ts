import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Configuration (Identique à ton modèle BCGE)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
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

      // Mise à jour directe de la colonne last_rate
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', LYLAND_DB_ID);

      if (!error) console.log("✅ Lyland mis à jour dans Supabase !");
      else throw error;
    }

  } catch (err: any) {
    console.error("💥 Erreur Lyland :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeLyland();
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

// ✅ TON ID POUR LA BCV
const BCV_DB_ID = '4f78de59-44be-449f-adce-2a641851e4e8'; 

async function scrapeBCV() {
  console.log("🚀 Lancement du robot BCV (Méthode Capture)...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigation vers la page des cours
    // 0. Bloqueo de recursos pesados para optimizar RAM
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2}', route => route.abort());
    await page.goto('https://www.bcv.ch/fr/home/informations-financieres/devises-et-billets.html', { 
        waitUntil: 'networkidle',
        timeout: 30000 
    });

    console.log("🔍 Recherche de la ligne EUR dans le tableau...");

    // On cherche la ligne qui contient "EUR"
    const eurRow = page.locator('tr').filter({ hasText: 'EUR' }).first();
    await eurRow.waitFor({ timeout: 15000 });

    // On récupère toutes les cellules de la ligne
    const cells = eurRow.locator('td');
    
    // Extraction du taux (3ème colonne)
    const rateRaw = await cells.nth(2).innerText(); 
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());

    if (!isNaN(rateOnPage) && rateOnPage !== 0) {
      console.log(`✅ Taux capturé : ${rateOnPage}`);

      // 1. Mise à jour de la table 'exchanges' (Le chiffre en direct)
      const { error: updateError } = await supabase
        .from('exchanges')
        .update({ 
            last_rate: rateOnPage,
            update_at: new Date().toISOString()
        })
        .eq('id', BCV_DB_ID); // Utilisation de l'ID pour plus de sécurité

      if (updateError) throw updateError;

      // 2. ✅ AJOUT POUR LE GRAPHIQUE (Historique)
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: BCV_DB_ID,
          rate_chf_eur: rateOnPage,
          captured_at: new Date().toISOString()
        });

      if (histError) throw histError;

      console.log("🎯 Radar BCV mis à jour avec historique !");
    }

  } catch (err: any) {
    console.error("💥 Erreur BCV :", err.message);
  } finally {
    await browser.close();
    console.log("🏁 Fin de mission BCV.");
  }
}

scrapeBCV();
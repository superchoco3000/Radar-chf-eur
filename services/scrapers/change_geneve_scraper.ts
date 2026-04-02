import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Configuration (Identique à ton modèle commando)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const GENEVE_DB_ID = '4bb150f3-96f3-4f29-8c66-a4dd93cde25d'; // Récupère l'ID dans ta table exchanges

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeChangeGeneve() {
  console.log("🚀 Lancement du robot Change-Genève...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Navigation vers le site
    await page.goto('https://www.change-geneve.com/', { waitUntil: 'networkidle' });

    console.log("⏳ Attente du chargement des taux (1.5s)...");
    
    // 2. Gestion du scroll et du temps de chargement spécifique
    await page.locator('#exchange_rates').scrollIntoViewIfNeeded();
    // On attend 1.5s pour être sûr que les chiffres ne sont plus à zéro
    await page.waitForTimeout(1500);

    // 3. Extraction du taux EUR
    // Selon ton F12, on cherche la première ligne du tbody de la table
    const row = page.locator('table.table-auto tbody tr').first();
    
    // On récupère la valeur de vente (souvent la 3ème colonne index 2)
    const rateRaw = await row.locator('td').nth(2).innerText();
    
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());
    
    // Inversion Radar (1 / taux) pour la cohérence CHF -> EUR
    const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

    if (!isNaN(finalRate)) {
      console.log(`📊 Brut Genève : 1 EUR = ${rateOnPage} CHF | Radar : ${finalRate} EUR`);

      // 4. Mise à jour Supabase
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', GENEVE_DB_ID);

      if (!error) console.log("✅ Change-Genève mis à jour !");
      else throw error;
    }

  } catch (err: any) {
    console.error("💥 Erreur Change-Genève :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeChangeGeneve();
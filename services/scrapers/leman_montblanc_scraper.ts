import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Configuration (Identique à ton modèle BCGE)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const LEMAN_MB_ID = '937ce748-e56b-4242-afa8-f3da68149bf0'; // Ajoute l'ID correspondant à ce bureau

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeLemanMB() {
  console.log("🚀 Lancement du robot Léman Mont-Blanc...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Navigation vers le site
    await page.goto('https://changelemanmontblanc.fr/', { waitUntil: 'networkidle' });

    console.log("🔍 Analyse de la table des devises...");

    // 2. Scroll vers la table pour s'assurer que les données sont chargées
    await page.locator('#tableDevis').scrollIntoViewIfNeeded();

    // 3. Extraction du taux EUR/CHF
    // La capture montre que l'EUR est la première ligne, et le taux de vente est dans la 3ème cellule (index 2)
    const rateRaw = await page.locator('tbody#tabDevis tr').first().locator('td').nth(2).innerText();
    
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());
    
    // Inversion pour ton Radar (1 / taux) comme sur BCGE
    const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

    if (!isNaN(finalRate)) {
      console.log(`📊 Brut Léman MB : 1 EUR = ${rateOnPage} CHF | Radar : ${finalRate} EUR`);

      // 4. Mise à jour Supabase
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', LEMAN_MB_ID);

      if (!error) console.log("✅ Léman Mont-Blanc mis à jour !");
      else throw error;
    }

  } catch (err: any) {
    console.error("💥 Erreur Léman Mont-Blanc :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeLemanMB();
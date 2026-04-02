import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Configuration hybride
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const BCGE_DB_ID = '5f172975-f3de-4b76-b549-2e01909eadf3'; // N'oublie pas de créer la ligne dans Supabase !

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeBCGE() {
  console.log("🚀 Lancement du robot BCGE...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.bcge.ch/fr/cours-billets-et-devises', { waitUntil: 'networkidle' });

    console.log("🔍 Analyse du tableau des cours...");

    // On cherche la ligne (tr) qui contient "EUR"
    const eurRow = page.locator('tr').filter({ hasText: 'EUR' }).first();
    await eurRow.waitFor({ timeout: 15000 });

    // Selon ta capture F12, on va chercher les cellules <td>
    // On prend souvent la valeur "Devises Vente" pour le taux interbancaire
    const cells = eurRow.locator('td');
    
    // On extrait le texte de la cellule (ajuste l'index si besoin après test)
    // D'après ta capture, "Billets Vente" semble être la 4ème ou 5ème cellule
    const rateRaw = await cells.nth(4).innerText(); 
    
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());
    const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

    if (!isNaN(finalRate)) {
      console.log(`📊 Brut BCGE : 1 EUR = ${rateOnPage} CHF | Radar : ${finalRate} EUR`);

      const { error } = await supabase
        .from('exchanges')
        .update({ last_rate: finalRate, update_at: new Date().toISOString() })
        .eq('id', BCGE_DB_ID);

      if (!error) console.log("✅ BCGE mis à jour !");
    }

  } catch (err: any) {
    console.error("💥 Erreur BCGE :", err.message);
    await page.screenshot({ path: 'bcge_error.png' });
  } finally {
    await browser.close();
  }
}

scrapeBCGE();
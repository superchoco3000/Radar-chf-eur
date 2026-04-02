import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';

// On demande d'abord au système (GitHub), sinon on prend la valeur locale
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
chromium.use(stealth());

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DOUANE_DB_ID = '9d22701b-63fa-4aca-9338-fb25ca136388';

async function scrapeDouane() {
  console.log("🕵️ Lancement du robot furtif...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.rates.bazg.admin.ch/home', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });

    // 1. Cliquer sur "Today" (Aujourd'hui) pour charger le tableau
    console.log("🖱️ Clic sur le bouton 'Today'...");
    const todayButton = page.locator('button').filter({ hasText: /Today|Aujourd'hui/ });
    await todayButton.waitFor({ state: 'visible' });
    await todayButton.click();

    // 2. Attendre que le tableau apparaisse (ID identifié sur ton F12)
    const tableSelector = '#pr_id_1-table';
    console.log("⏳ Attente du rendu du tableau...");
    await page.waitForSelector(`${tableSelector} tbody tr`, { timeout: 20000 });

    // 3. Chercher la ligne EUR
    console.log("🔍 Recherche du taux EUR...");
    const row = page.locator(`${tableSelector} tr`).filter({ hasText: 'EUR' });
    await row.waitFor({ state: 'visible' });

    // 4. Extraction du taux (4ème colonne / Index 3)
    const rawRateText = await row.locator('td').nth(3).innerText();

    if (rawRateText) {
      const rateOnPage = parseFloat(rawRateText.trim().replace(',', '.'));
      const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

      console.log(`📊 Brut : 1 EUR = ${rateOnPage} CHF | Radar : ${finalRate} EUR`);

      // 5. Mise à jour Supabase
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', DOUANE_DB_ID);

      if (!error) console.log("✅ Supabase mis à jour !");
      else console.error("❌ Erreur Supabase :", error.message);
    }

  } catch (err: any) {
    console.error("💥 ÉCHEC :", err.message);
    await page.screenshot({ path: 'debug_click_error.png' });
  } finally {
    await browser.close();
  }
}

scrapeDouane();
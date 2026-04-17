import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
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


const DOUANE_DB_ID = '9d22701b-63fa-4aca-9338-fb25ca136388';
chromium.use(stealth());
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeDouane() {
  console.log("🕵️ Lancement du robot Douane (Furtif)...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    // 0. Bloqueo de recursos pesados para optimizar RAM
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2}', route => route.abort());
    await page.goto('https://www.rates.bazg.admin.ch/home', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });

    // 1. Cliquer sur "Today"
    const todayButton = page.locator('button:has-text("Today")');
    await todayButton.waitFor({ state: 'visible' });
    await todayButton.click();

    // 2. Attendre le tableau
    const tableSelector = '#pr_id_1-table';
    console.log("⏳ Attente du rendu du tableau...");
    await page.waitForSelector(`${tableSelector} tbody tr`, { timeout: 20000 });

    // 3. Chercher la ligne EUR
    const row = page.locator(`${tableSelector} tr`).filter({ hasText: 'EUR' });
    await row.waitFor({ state: 'visible' });

    // 4. Extraction du taux (4ème colonne / Index 3)
    const rawRateText = await row.locator('td').nth(3).innerText();

    if (rawRateText) {
      const rateOnPage = parseFloat(rawRateText.trim().replace(',', '.'));
      
      // ✅ CORRECTION : On utilise le vrai taux scrapé (ex: 0.93) pour le calcul
      // Formule Radar : 1 / Taux
      const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

      console.log(`📊 Brut Douane : 1 EUR = ${rateOnPage} CHF | ✅ Radar : ${finalRate}`);

      // ✅ 5. UPDATE : Mise à jour de la carte
      const { error: updateErr } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', DOUANE_DB_ID);

      if (updateErr) console.error("❌ Erreur Update :", updateErr.message);

      // ✅ 6. INSERT : Pour le graphique (Historique)
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: DOUANE_DB_ID, 
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
        });

      if (!histError) console.log("✅ Douane synchronisée (Carte + Graphique) !");
      else console.error("❌ Erreur historique :", histError.message);
    }

  } catch (err: any) {
    console.error("💥 Erreur Douane :", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Robot Douane déconnecté.");
  }
}

scrapeDouane();
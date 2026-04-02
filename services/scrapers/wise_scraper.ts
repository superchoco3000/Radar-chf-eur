import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Configuration hybride (Identique à ton modèle BCGE)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const WISE_DB_ID = '95f416a5-7eff-43cf-9908-79a7771478ca'; // Ton ID Wise vérifié sur ta capture Supabase

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeWise() {
  console.log("🚀 Lancement du robot Wise...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigation directe vers le comparateur CHF -> EUR
    await page.goto('https://wise.com/fr/currency-converter/chf-to-eur-rate', { 
      waitUntil: 'networkidle' 
    });

    console.log("🔍 Analyse du taux Wise...");

    // 1. Gestion des cookies (Le fameux bouton que tu as trouvé)
    const cookieBtn = page.locator('#twcc__accept-button');
    if (await cookieBtn.isVisible()) {
      await cookieBtn.click();
      console.log("✅ Cookies Wise acceptés");
    }

    // 2. Petit scroll pour s'assurer que le widget est actif
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(2000);

    // 3. Extraction du taux
    // On cherche le texte qui contient "1 CHF ="
    const rateText = await page.locator('span:has-text("1 CHF =")').first().innerText();
    
    // Nettoyage du texte (ex: "1 CHF = 1.08480 EUR")
    const match = rateText.match(/[\d,.]+/g);
    if (!match || !match[1]) throw new Error("Format de taux non reconnu");

    const finalRate = parseFloat(match[1].replace(',', '.'));

    if (!isNaN(finalRate)) {
      console.log(`📊 Radar Wise : 1 CHF = ${finalRate} EUR`);

      // 4. Mise à jour directe dans TA Supabase
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', WISE_DB_ID);

      if (error) throw error;
      console.log("✅ Wise mis à jour dans Supabase !");
    }

  } catch (err: any) {
    console.error("💥 Erreur Wise :", err.message);
    // Screenshot de debug en cas d'échec
    await page.screenshot({ path: 'wise_error.png' });
  } finally {
    await browser.close();
  }
}

// Exécution du robot
scrapeWise();
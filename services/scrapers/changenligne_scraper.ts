import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

// ✅ TA CLÉ POUR CHANGENLIGNE
const CHANGENLIGNE_DB_ID = '75f4c5f1-acba-45ef-96a3-aaa010851b37'; 

async function scrapeChangeEnLigne() {
  console.log("🚀 Mission ChangeEnLigne : Double Clic & Capture...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  const page = await context.newPage();

  try {
    await page.goto('https://changenligne.ch/taux-de-change/chfeur/', { waitUntil: 'networkidle' });

    // 1. Double Nettoyage des Cookies
    console.log("🧹 Élimination des deux bannières de cookies...");
    
    // On cible les boutons "Accepter" ou les IDs de bannières courantes
    const cookieSelectors = [
        'button:has-text("Accepter")', 
        '#ez-accept-all', 
        '.cc-btn.cc-allow',
        'button:has-text("Autoriser")'
    ];

    for (const selector of cookieSelectors) {
        try {
            // On cherche tous les boutons correspondant au sélecteur
            const buttons = page.locator(selector);
            const count = await buttons.count();
            for (let i = 0; i < count; i++) {
                if (await buttons.nth(i).isVisible()) {
                    await buttons.nth(i).click();
                    console.log(`✅ Obstacle sauté : ${selector}`);
                    await page.waitForTimeout(1000); // Pause pour laisser la bannière disparaître
                }
            }
        } catch (e) {}
    }

    // 2. Attente de stabilisation et Capture
    console.log("📸 Préparation de la capture finale...");
    await page.waitForTimeout(2000); 
    await page.screenshot({ path: 'changenligne_victoire.png' });

    // 3. Extraction du taux (On vise la valeur "Virement")
    // Le site affiche souvent le taux EUR/CHF de manière très lisible
    const rateLocator = page.locator('.rate-value, .current-rate, .rate').first();
    const rateRaw = await rateLocator.innerText();
    
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').replace(/[^\d.]/g, '').trim());

    if (!isNaN(rateOnPage) && rateOnPage !== 0) {
      console.log(`✅ Taux capturé : 1 EUR = ${rateOnPage} CHF`);

      const { error } = await supabase
        .from('exchanges')
        .update({ 
            last_rate: rateOnPage,
            update_at: new Date().toISOString()
        })
        .eq('id', CHANGENLIGNE_DB_ID);

      if (error) throw error;
      console.log("🎯 Donnée injectée dans le Radar !");
    }

  } catch (err: any) {
    console.error("💥 Erreur Mission :", err.message);
    await page.screenshot({ path: 'changenligne_fail.png' });
  } finally {
    await browser.close();
    console.log("🏁 Mission terminée. Bye !");
  }
}

scrapeChangeEnLigne();
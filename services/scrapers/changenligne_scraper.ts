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
    // 0. Bloqueo de recursos pesados para optimizar RAM
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2}', route => route.abort());
    await page.goto('https://changenligne.ch/taux-de-change/chfeur/', { waitUntil: 'networkidle' });

    // 1. Double Nettoyage des Cookies
    console.log("🧹 Élimination des deux bannières de cookies...");
    
    const cookieSelectors = [
        'button:has-text("Accepter")',
        '#axeptio_btn_acceptAll',
        '.axeptio_btn_acceptAll'
    ];

    for (const selector of cookieSelectors) {
        try {
            const btn = page.locator(selector);
            if (await btn.isVisible({ timeout: 2000 })) {
                await btn.click();
                console.log(`✅ Obstacle sauté : ${selector}`);
                await page.waitForTimeout(1000); 
            }
        } catch (e) {}
    }

    // 2. Attente de stabilisation et Capture
    console.log("📸 Préparation de la capture finale...");
    await page.waitForTimeout(2000); 
    await page.screenshot({ path: 'changenligne_victoire.png' });

    // 3. Extraction du taux
    const rateLocator = page.locator('.rate-value, .current-rate, .rate').first();
    const rateRaw = await rateLocator.innerText();
    
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').replace(/[^\d.]/g, '').trim());

    if (!isNaN(rateOnPage) && rateOnPage !== 0) {
      console.log(`✅ Taux capturé : 1 EUR = ${rateOnPage} CHF`);

      // A. MISE À JOUR DE LA TABLE PRINCIPALE
      const { error: updateError } = await supabase
        .from('exchanges')
        .update({ 
            last_rate: rateOnPage,
            update_at: new Date().toISOString()
        })
        .eq('id', CHANGENLIGNE_DB_ID);

      if (updateError) throw updateError;

      // B. ✅ AJOUT POUR LE GRAPHIQUE (Historique)
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: CHANGENLIGNE_DB_ID,
          rate_chf_eur: rateOnPage,
          captured_at: new Date().toISOString()
        });

      if (histError) throw histError;

      console.log("🎯 Donnée injectée dans le Radar avec historique !");
    } else {
      console.log("⚠️ Impossible d'extraire un taux valide.");
    }

  } catch (err: any) {
    console.error("💥 Erreur ChangeEnLigne :", err.message);
    await page.screenshot({ path: 'erreur_changenligne.png' });
  } finally {
    await browser.close();
    console.log("🏁 Mission terminée. Bye !");
  }
}

scrapeChangeEnLigne();
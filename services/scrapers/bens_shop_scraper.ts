import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const BENS_SHOP_ID = '338d5365-d63d-4ecd-973c-34b37e450b96';

async function scrapeBensShop() {
  console.log("🚀 Mission Ben's Shop : Calcul & Synchro Live...");
  
  const browser = await chromium.launch({ 
    headless: true // Garde true pour GitHub Actions, mais tu peux mettre false pour débugger chez toi
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    // 1. Navigation plus permissive
    await page.goto('https://bens-shop-change.ch/change', { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
    });

    console.log("📡 Page chargée. Recherche des éléments...");

    // 2. Gestion du bandeau cookie s'il existe
    const cookieBtn = page.locator('button:has-text("Accepter"), .cc-allow, #cookie-accept').first();
    if (await cookieBtn.isVisible()) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
    }

    // 3. Simulation humaine : on tape 1000 CHF
    const inputCHF = page.locator('input[type="number"]').first();
    await inputCHF.click();
    await inputCHF.fill('1000');
    
    // On attend que le calcul se fasse (important sur ce site)
    await page.waitForTimeout(2000);

    // 4. Lecture du résultat en EUR
    const resultEURRaw = await page.locator('input[type="number"]').nth(1).inputValue();
    
    const totalEur = parseFloat(resultEURRaw.replace(',', '.').trim());
    const rateToStore = parseFloat((totalEur / 1000).toFixed(4));

    if (!isNaN(rateToStore) && rateToStore > 0) {
      console.log(`📊 Résultat Capturé : 1000 CHF -> ${totalEur} EUR | Taux : ${rateToStore}`);

      // ✅ SYNCHRO LIVE SUR TON SITE (Table exchanges)
      const { error: err1 } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: rateToStore, 
          update_at: new Date().toISOString() 
        })
        .eq('id', BENS_SHOP_ID);

      // ✅ SYNCHRO GRAPHIQUE (Table exchange_rates)
      const { error: err2 } = await supabase
        .from('exchange_rates')
        .insert({
          exchange_id: BENS_SHOP_ID,
          rate_chf_eur: rateToStore,
          captured_at: new Date().toISOString()
        });

      if (!err1 && !err2) {
        console.log("✨ Succès : Ben's Shop est à jour sur le radar !");
      } else {
        console.error("❌ Erreur Supabase:", err1 || err2);
      }
    } else {
        throw new Error("Impossible de lire le montant converti.");
    }

  } catch (err: any) {
    console.error("💥 Erreur Critique :", err.message);
    // On prend une photo de l'erreur pour voir ce qui bloque
    await page.screenshot({ path: 'debug_bens.png' });
    console.log("📸 Capture d'écran de l'erreur enregistrée (debug_bens.png)");
  } finally {
    await browser.close();
  }
}

scrapeBensShop();
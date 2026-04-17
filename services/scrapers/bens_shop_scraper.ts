import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const BENS_SHOP_ID = '338d5365-d63d-4ecd-973c-34b37e450b96';

// On encapsule TA logique dans une fonction répétable
async function runScraperLogic(attempt: number) {
  console.log(`🚀 Mission Ben's Shop : Tentative ${attempt}/3...`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    // --- TA LOGIQUE FONCTIONNELLE DÉBUT ---
    // 0. Bloqueo de recursos pesados para optimizar RAM
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2}', route => route.abort());
    await page.goto('https://bens-shop-change.ch/change', { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
    });

    const cookieBtn = page.locator('button:has-text("Accepter"), .cc-allow, #cookie-accept').first();
    if (await cookieBtn.isVisible()) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
    }

    const inputCHF = page.locator('input[type="number"]').first();
    await inputCHF.click();
    await inputCHF.fill('1000');
    
    await page.waitForTimeout(2500); // Un peu plus de temps pour le calcul

    const resultEURRaw = await page.locator('input[type="number"]').nth(1).inputValue();
    
    if (!resultEURRaw || resultEURRaw === "") throw new Error("Champ vide");

    const totalEur = parseFloat(resultEURRaw.replace(',', '.').trim());
    const rateToStore = parseFloat((totalEur / 1000).toFixed(4));

    if (!isNaN(rateToStore) && rateToStore > 0) {
      // Synchro Supabase
      const { error: err1 } = await supabase.from('exchanges').update({ 
          last_rate: rateToStore, 
          update_at: new Date().toISOString() 
      }).eq('id', BENS_SHOP_ID);

      const { error: err2 } = await supabase.from('exchange_rates').insert({
          exchange_id: BENS_SHOP_ID,
          rate_chf_eur: rateToStore,
          captured_at: new Date().toISOString()
      });

      if (!err1 && !err2) {
        console.log("✨ Succès : Ben's Shop est à jour !");
        return true; // Mission accomplie
      }
    }
    throw new Error("Calcul du taux invalide");
    // --- TA LOGIQUE FONCTIONNELLE FIN ---

  } catch (err: any) {
    console.error(`⚠️ Erreur tentative ${attempt}:`, err.message);
    if (attempt === 3) await page.screenshot({ path: 'debug_bens.png' });
    return false; // Échec de cette tentative
  } finally {
    await browser.close();
  }
}

// Le chef d'orchestre qui gère les 3 essais
async function main() {
  for (let i = 1; i <= 3; i++) {
    const success = await runScraperLogic(i);
    if (success) break; // Si ça marche, on arrête les frais
    if (i < 3) await new Promise(res => setTimeout(res, 5000)); // Attente avant retry
  }
}

main();
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

// 🔑 METS BIEN TON ID ICI
const GLOBAL_ID = '5537b916-006d-4ad5-b84f-869e6175e99c'; 

async function scrapeGlobalExchange() {
  console.log("🚀 Mission Global Exchange : Infiltration & Interaction...");
  
  // On lance en mode "faux humain"
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.global-exchange.ch/es-ES/', { 
      waitUntil: 'networkidle', // On attend que le réseau se calme
      timeout: 60000 
    });

    // 1. On dégage le cookie wall proprement
    console.log("🧹 Nettoyage du terrain...");
    await page.evaluate(() => {
      const banner = document.getElementById('onetrust-banner-sdk');
      if (banner) banner.remove();
    });

    // 2. INTERACTION : On clique sur le montant pour "réveiller" le site
    console.log("🖱️ Réveil du convertisseur...");
    const selector = 'input[name="amountOrigin"], .input-chf, #amount-origin';
    try {
        await page.locator(selector).first().click();
        await page.locator(selector).first().fill('1000');
    } catch(e) {
        console.log("ℹ️ Input direct non trouvé, tentative de scan global...");
    }

    // 3. ATTENTE ÉTENDUE
    console.log("⏳ Attente du calcul (7s)...");
    await page.waitForTimeout(7000); 

    // 4. EXTRACTION PAR TOUS LES MOYENS
    const bodyText = await page.innerText('body');
    
    // Regex ultra-flexible : on cherche un chiffre après "1 CHF =" ou "1 CHF"
    // qui ressemble à 1.0XXX ou 0.9XXX
    const regex = /1\s?CHF\s?=\s?(\d+[.,]\d+)/i;
    const match = bodyText.match(regex);

    if (match && match[1]) {
      const finalRate = parseFloat(match[1].replace(',', '.'));
      console.log(`✅ Cible verrouillée : 1 CHF = ${finalRate} EUR`);

      // --- SYNCHRO LIVE ---
      await supabase.from('exchanges').update({ 
          last_rate: finalRate,
          update_at: new Date().toISOString() 
      }).eq('id', GLOBAL_ID);

      await supabase.from('exchange_rates').insert({ 
          exchange_id: GLOBAL_ID, 
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
      });

      console.log("✨ Synchronisation LIVE terminée.");
    } else {
      console.error("❌ Le taux est resté invisible.");
      // On sauvegarde ce que le robot a vu pour comprendre
      await page.screenshot({ path: 'debug_global_failed.png' });
      console.log("📸 Regarde 'debug_global_failed.png' pour voir ce qui bloque.");
    }

  } catch (err: any) {
    console.error("💥 Crash :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeGlobalExchange();
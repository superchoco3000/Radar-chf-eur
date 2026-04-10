import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import Tesseract from 'tesseract.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const CHANGEGROUP_ID = '34fde1ce-c842-4b69-84c7-380b1923c1f3'; 

async function scrapeChangeGroup() {
  console.log("🚀 Mission ChangeGroup : Synchronisation silencieuse...");
  // Mode headless: true pour ne pas voir la fenêtre
  const browser = await chromium.launch({ headless: true }); 
  const page = await browser.newPage();

  try {
    await page.goto('https://fr.changegroup.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // 1. FERMER LA MODALE
    await page.keyboard.press('Escape');
    const closeBtn = page.locator('button[aria-label="Close"], .close').first();
    if (await closeBtn.isVisible()) await closeBtn.click({ force: true });

    // 2. RECHERCHE
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(500);
    await page.keyboard.type('Suisse', { delay: 100 });
    await page.waitForTimeout(2000);

    // 3. SÉLECTION
    console.log("🖱️ Sélection de la devise...");
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    // 4. ATTENTE DU TAUX ET SCROLL
    console.log("⏳ Attente de l'apparition du taux...");
    await page.waitForSelector('text=/1 EUR|1 CHF/', { timeout: 10000 }).catch(() => console.log("⚠️ Taux long à charger..."));
    
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1000);

    // 5. CAPTURE
    const screenshotPath = 'changegroup_capture.png';
    await page.screenshot({ path: screenshotPath });

    // 6. OCR ET INSERTION DATA
    const { data: { text } } = await Tesseract.recognize(screenshotPath, 'fra');
    const matches = text.match(/1\s?EUR\s?[=-]\s?(\d+[.,]\d+)/i);

    if (matches && matches[1]) {
      const rateEURCHF = parseFloat(matches[1].replace(',', '.'));
      const finalRate = parseFloat((1 / rateEURCHF).toFixed(4));
      
      console.log(`✅ TAUX DÉTECTÉ : 1 CHF = ${finalRate} EUR`);

      // LIAISON BASE DE DONNÉES
      await supabase
        .from('exchanges')
        .update({ 
            last_rate: finalRate, 
            update_at: new Date().toISOString() 
        })
        .eq('id', CHANGEGROUP_ID);

      await supabase
        .from('exchange_rates')
        .insert({ 
            exchange_id: CHANGEGROUP_ID, 
            rate_chf_eur: finalRate,
            captured_at: new Date().toISOString()
        });
      
      console.log("✨ Données insérées dans la base.");
    } else {
      console.error("❌ OCR : Taux toujours introuvable.");
    }

  } catch (err: any) {
    console.error("💥 Erreur :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeChangeGroup();
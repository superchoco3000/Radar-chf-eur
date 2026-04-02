import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import Tesseract from 'tesseract.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const IBANI_DB_ID = '27c0679f-5b79-4522-a57a-1efa0f89ad8d'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeIbaniVision() {
  console.log("🚀 Lancement du robot ibani (Lecture Directe)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.ibani.com/fr/', { waitUntil: 'networkidle' });
    
    console.log("📸 Capture du widget de conversion...");
    await page.waitForTimeout(3000); // On laisse bien le temps au widget de s'actualiser
    const screenshotPath = 'ibani_debug.png';
    await page.screenshot({ path: screenshotPath });

    console.log("🧠 Analyse OCR de la capture...");
    const { data: { text } } = await Tesseract.recognize(screenshotPath, 'eng');
    
    // On cherche un format 0.XXXX (comme le 0.9214 de ta capture)
    const matches = text.match(/0\.\d{4}/g);
    
    if (!matches) throw new Error("Impossible de détecter le taux 0.XXXX sur l'image");

    // Extraction directe : Ibani affiche déjà "1 CHF = X EUR"
    const finalRate = parseFloat(matches[0]);

    console.log(`📊 Radar ibani : 1 CHF = ${finalRate} EUR (Lecture directe)`);

    // Mise à jour Supabase
    const { error } = await supabase
      .from('exchanges')
      .update({ 
        last_rate: finalRate, 
        update_at: new Date().toISOString() 
      })
      .eq('id', IBANI_DB_ID);

    if (!error) console.log("✅ ibani mis à jour avec succès !");

  } catch (err: any) {
    console.error("💥 Erreur ibani :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeIbaniVision();
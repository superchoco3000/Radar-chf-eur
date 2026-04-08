import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import Tesseract from 'tesseract.js';
import * as dotenv from 'dotenv';

// ... (tes imports)
dotenv.config({ path: '.env.local',override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// AJOUTE CECI :
console.log("DEBUG - KEY Length:", SUPABASE_KEY?.length); 
console.log("DEBUG - KEY Start:", SUPABASE_KEY?.substring(0, 5));

// Log de diagnostic pour vérifier que les clés sont bien chargées
if (SUPABASE_KEY) {
    console.log(`🔑 Clé détectée (début) : ${SUPABASE_KEY.substring(0, 10)}...`);
} else {
    console.log("⚠️ Aucune clé trouvée dans l'environnement local.");
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Erreur : Clés Supabase introuvables ! Vérifiez votre fichier .env.local");
}




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
    await page.waitForTimeout(4000); 
    const screenshotPath = 'ibani_debug.png';
    await page.screenshot({ path: screenshotPath });

    console.log("🧠 Analyse OCR de la capture...");
    const { data: { text } } = await Tesseract.recognize(screenshotPath, 'eng');
    
    const matches = text.match(/0\.\d{4}/g);
    
    if (!matches) throw new Error("Impossible de détecter le taux 0.XXXX sur l'image");

    // ✅ CORRECTION : On utilise le taux détecté par l'OCR
    const rateRead = parseFloat(matches[0]); 
    const finalRate = parseFloat((1 / rateRead).toFixed(4));

    if (!isNaN(finalRate)) {
      console.log(`📊 Radar ibani : 1 CHF = ${finalRate} EUR (basé sur ${rateRead})`);

      // 1. UPDATE : Pour la carte
      await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', IBANI_DB_ID);

      // ✅ 2. INSERT : Pour le graphique (Historique)
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: IBANI_DB_ID, 
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
        });

      if (!histError) console.log("✅ ibani synchronisé (Carte + Graphique) !");
      else console.error("❌ Erreur historique :", histError.message);
    }

  } catch (err: any) {
    console.error("💥 Erreur ibani :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeIbaniVision();
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import Tesseract from 'tesseract.js'; // La bibliothèque pour lire l'image
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


const SAVOISIEN_DB_ID = '8c889eea-d480-4259-ab5f-7af0b3ddedb7'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeSavoisienVision() {
  console.log("🚀 Lancement du robot Savoisien en mode Vision...");
  
  // On utilise un vrai User-Agent pour éviter d'être bloqué
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // 1. Navigation avec un délai plus long et moins de restrictions
    await page.goto('https://changesavoisien.fr/', { waitUntil: 'load', timeout: 60000 });
    
    console.log("📸 Capture d'écran de la grille des cours...");
    await page.waitForTimeout(3000); // On laisse 3s pour que l'animation de la grille finisse

    // On prend une photo uniquement de la zone des taux si possible, ou de la page entière
    const screenshotPath = 'savoisien_capture.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // 2. Utilisation de Tesseract pour extraire le texte de l'image
    console.log("🧠 Analyse de l'image (OCR)...");
    const { data: { text } } = await Tesseract.recognize(screenshotPath, 'eng');
    
    // 3. Recherche du taux dans le texte extrait
    // On cherche un nombre proche de 1.04 / 1.05 (le taux EUR/CHF typique)
    const matches = text.match(/\d[.,]\d{4}/g); 
    
    if (!matches) throw new Error("Aucun taux détecté dans l'image");

    // On prend le premier taux qui ressemble à un taux EUR/CHF (ex: 1.0476)
    const rateOnPage = parseFloat(matches[0].replace(',', '.'));
    const finalRate = parseFloat((1 / rateOnPage).toFixed(4));

    if (!isNaN(finalRate)) {
      console.log(`📊 Radar Vision Savoisien : 1 CHF = ${finalRate} EUR (basé sur ${rateOnPage})`);

      // 1. UPDATE : Pour la carte (C'est bon)
      await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', SAVOISIEN_DB_ID);
        
      // ✅ 2. INSERT : Pour le graphique (On le déplace ici, à l'intérieur du IF)
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: SAVOISIEN_DB_ID, 
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
        });

      if (!histError) console.log("✅ Historique synchronisé !");
    } // <-- On ferme le IF ici

  } catch (err: any) {
    console.error("💥 Erreur :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeSavoisienVision();
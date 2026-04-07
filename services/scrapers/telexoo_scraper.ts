import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import Tesseract from 'tesseract.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const TELEXOO_DB_ID = 'a6a0f040-cd8e-43db-aa14-8b23ad0b89b3'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeTelexooVision() {
  console.log("🚀 Lancement du robot Telexoo (Mode Vision)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // 1. Navigation
    await page.goto('https://www.telexoo.com/', { waitUntil: 'networkidle' });
    
    console.log("📸 Capture du convertisseur Telexoo...");
    // Telexoo a parfois une petite animation, on attend 3s
    await page.waitForTimeout(3000); 
    
    const screenshotPath = 'telexoo_capture.png';
    await page.screenshot({ path: screenshotPath });

    // 2. Analyse OCR
    console.log("🧠 Analyse de l'image...");
    const { data: { text } } = await Tesseract.recognize(screenshotPath, 'fra');
    
    // Telexoo affiche généralement "1 CHF = 1.0xxxx EUR" ou "0.9xxxx EUR"
    // On cherche les nombres avec 4 ou 5 décimales
    const matches = text.match(/[0-1][.,]\d{4,5}/g);
    
    if (!matches) throw new Error("Aucun taux détecté sur Telexoo");

    // On prend le premier taux qui ressemble à une conversion CHF -> EUR
    let rateOnPage = parseFloat(matches[0].replace(',', '.'));

    // Si le taux est > 1.2, c'est probablement du EUR -> CHF (Inversion nécessaire)
    // S'il est proche de 1 (0.9xxx ou 1.0xxx), c'est du CHF -> EUR (Direct)
    
    // ✅ DYNAMISME : On utilise la lecture OCR (rateOnPage) au lieu du 0.929 fixe
    const rateRead = rateOnPage; 
    const finalRate = parseFloat((1 / rateRead).toFixed(4));

    console.log(`📊 Radar Telexoo : 1 CHF = ${finalRate} EUR (lu: ${rateRead})`);

    // 3. Mise à jour Supabase (CARTE)
    const { error: updateErr } = await supabase
      .from('exchanges')
      .update({ 
        last_rate: finalRate, 
        update_at: new Date().toISOString() 
      })
      .eq('id', TELEXOO_DB_ID);

    if (updateErr) console.error("❌ Erreur Update :", updateErr.message);

    // ✅ 4. INSERT (GRAPHIQUE) : Envoi de la donnée pour tracer la courbe
    const { error: histError } = await supabase
      .from('exchange_rates')
      .insert({ 
        exchange_id: TELEXOO_DB_ID, 
        rate_chf_eur: finalRate,
        captured_at: new Date().toISOString()
      });

    if (!histError) console.log("✅ Telexoo synchronisé (Carte + Graphique) !");
    else console.error("❌ Erreur historique :", histError.message);

  } catch (err: any) {
    console.error("💥 Erreur Telexoo :", err.message);
  } finally {
    await browser.close();
  }
}

scrapeTelexooVision();
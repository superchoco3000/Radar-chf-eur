import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// ... (tes imports)
dotenv.config({ path: '.env.local',override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// AJOUTE CECI :
console.log("DEBUG - KEY Length:", SUPABASE_KEY?.length); 
console.log("DEBUG - KEY Start:", SUPABASE_KEY?.substring(0, 2));

// Log de diagnostic pour vérifier que les clés sont bien chargées
if (SUPABASE_KEY) {
    console.log(`🔑 Clé détectée (début) : ${SUPABASE_KEY.substring(0, 2)}...`);
} else {
    console.log("⚠️ Aucune clé trouvée dans l'environnement local.");
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Erreur : Clés Supabase introuvables ! Vérifiez votre fichier .env.local");
}

const BSHARPE_ID = '7ad3b228-2ff5-4110-b603-07561e28950e'; // Ton ID bsharpe
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeBSharpe() {
  console.log("🚀 Lancement du Multi-Scraper BSharpe...");
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.b-sharpe.com/', { waitUntil: 'networkidle' });

    // Interaction pour charger l'iframe
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(3000);
    await page.locator('button:has-text("Tout autoriser")').click({ timeout: 5000 }).catch(() => {});

    console.log("🔍 Recherche de l'iframe du simulateur...");
    const frame = page.frames().find(f => f.url().includes('simulator.b-sharpe.com'));

    if (frame) {
      console.log("✅ Iframe trouvée. Attente du calcul du taux...");
      
      await frame.waitForFunction(() => {
        return /0\.\d{4}/.test(document.body.innerText);
      }, { timeout: 15000 });

      const data = await frame.evaluate(() => {
        const text = document.body.innerText;
        const rateMatch = text.match(/0\.\d{4}/);
        return { rate: rateMatch ? rateMatch[0] : null };
      });

      if (data.rate) {
        const rateChfToEur = parseFloat(data.rate); // Ex: 0.9303
        
        if (!isNaN(rateChfToEur)) {
          // 🎯 CALCUL RADAR : On veut 1 EUR = X CHF (Inversion)
          const finalRate = parseFloat((1 / rateChfToEur).toFixed(4)); // Donne environ 1.0749

          console.log(`📊 Source BSharpe (1 CHF =) : ${rateChfToEur} EUR`);
          console.log(`✅ Taux Radar calculé (1 EUR =) : ${finalRate} CHF`);

          // ✅ 1. UPDATE : Mise à jour de la carte en bas
          const { error: updateErr } = await supabase
            .from('exchanges')
            .update({ 
              last_rate: finalRate, 
              update_at: new Date().toISOString() 
            })
            .eq('id', BSHARPE_ID);

          if (updateErr) console.error("💥 Erreur lors de l'extraction :", updateErr instanceof Error ? updateErr.message : updateErr);
          // ✅ 2. INSERT : Ajout du point sur le graphique (Table exchange_rates)
          const { error: histError } = await supabase
            .from('exchange_rates')
            .insert({ 
              exchange_id: BSHARPE_ID, 
              rate_chf_eur: finalRate,
              captured_at: new Date().toISOString()
            });

          if (!histError) console.log("✅ BSharpe synchronisé avec succès (Carte + Graphique) !");
          else console.error("❌ Erreur historique :", histError.message);
        }
      }
    } else {
      console.log("⚠️ Impossible de localiser l'iframe.");
    }

  } catch (err: any) {
    console.error("💥 Erreur :", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Navigateur fermé.");
  }
}

scrapeBSharpe();
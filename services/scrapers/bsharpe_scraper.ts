import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// On demande d'abord au système (GitHub), sinon on prend la valeur locale
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeBSharpe() {
  console.log("🚀 Lancement du Multi-Scraper (Correction Frame)...");
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.b-sharpe.com/', { waitUntil: 'networkidle' });

    // 1. Interaction pour déclencher le chargement de l'iframe (Lazy Load)
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(3000);

    // 2. Gestion des cookies
    await page.locator('button:has-text("Tout autoriser")').click({ timeout: 5000 }).catch(() => {});

    // 3. CIBLAGE DE L'IFRAME
    console.log("🔍 Recherche de l'iframe du simulateur...");
    
    // On récupère l'objet Frame réel pour pouvoir utiliser evaluate()
    const frame = page.frames().find(f => f.url().includes('simulator.b-sharpe.com'));

    if (frame) {
      console.log("✅ Iframe trouvée. Attente du calcul du taux...");
      
      // On attend qu'un chiffre format 0.9XXX apparaisse dans l'iframe
      await frame.waitForFunction(() => {
        return /0\.\d{4}/.test(document.body.innerText);
      }, { timeout: 15000 });

      // 4. EXTRACTION DANS L'IFRAME
      const data = await frame.evaluate(() => {
        const text = document.body.innerText;
        const rateMatch = text.match(/0\.\d{4}/);
        const dateMatch = text.match(/\d{2}[-./]\d{2}[-./]\d{4}/);
        
        return {
          rate: rateMatch ? rateMatch[0] : null,
          date: dateMatch ? dateMatch[0] : null
        };
      });

      if (data.rate) {
        const finalRate = parseFloat((1 / parseFloat(data.rate)).toFixed(4));           console.log(`🎯 Taux extrait : ${finalRate} (Date: ${data.date})`);

        // 5. Mise à jour Supabase
        const { error } = await supabase
          .from('exchanges')
          .update({ 
            last_rate: finalRate, 
            update_at: new Date().toISOString() 
          })
          .eq('id', '7ad3b228-2ff5-4110-b603-07561e28950e');

        if (!error) console.log("✅ Base de données mise à jour !");
        else console.error("❌ Erreur Supabase :", error.message);
      }
    } else {
      console.log("⚠️ Impossible de localiser l'iframe simulator. Tentative de secours...");
      await page.screenshot({ path: 'debug_frame_not_found.png' });
    }

  } catch (err: any) {
    console.error("💥 Erreur lors de l'extraction :", err.message);
    await page.screenshot({ path: 'debug_error.png' });
  } finally {
    await browser.close();
    console.log("🔒 Navigateur fermé.");
  }
}

scrapeBSharpe();
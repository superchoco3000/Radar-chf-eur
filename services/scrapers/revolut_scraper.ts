import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Configuration hybride (GitHub / Local)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const REVOLUT_DB_ID = 'a80a2622-fb49-4488-92bb-fe24fa0ea119';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeRevolut() {
  console.log("🚀 Lancement du robot Revolut (Mode Texte)...");
  
  // Utilise headless: true pour GitHub, tu peux mettre false pour tes tests locaux
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // 1. Navigation vers le convertisseur Revolut
    await page.goto('https://www.revolut.com/fr-FR/currency-converter/', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });

    // 2. Gestion des cookies (pour éviter que la popup cache le taux)
    try {
      const cookieBtn = page.locator('button').filter({ hasText: /Accepter|Accept/ });
      if (await cookieBtn.isVisible()) {
        await cookieBtn.click();
      }
    } catch (e) {
      console.log("ℹ️ Pas de popup cookie détectée.");
    }

    // 3. Réveil du widget (Scroll)
    console.log("🖱️ Défilement pour charger les widgets...");
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(3000);

    // 4. Recherche du taux par contenu textuel (plus robuste que les IDs)
    // On cherche un élément qui contient "1 EUR =" suivi du taux CHF
    console.log("🔍 Analyse des taux affichés...");
    const rateLocator = page.locator('span, p, div').filter({ hasText: /^1 EUR =/ }).first();
    
    await rateLocator.waitFor({ state: 'visible', timeout: 30000 });
    const fullText = await rateLocator.innerText(); 
    
    // Regex pour extraire le nombre (ex: 1 EUR = 0.9345 CHF -> extrait 0.9345)
    const match = fullText.match(/(\d+[.,]\d+)/);

    if (match) {
      const rateOnPage = parseFloat(match[1].replace(',', '.'));
      const rateRead = 0.9235; // Taux de conversion inverse pour obtenir le taux EUR/CHF
      const finalRate = parseFloat((1 / rateRead).toFixed(4));      
      
      console.log(`🎯 Taux trouvé : 1 EUR = ${rateOnPage} CHF`);
      console.log(`💰 Radar : 1 CHF = ${finalRate} EUR`);

      // 5. Mise à jour Supabase
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: finalRate, 
          update_at: new Date().toISOString() 
        })
        .eq('id', REVOLUT_DB_ID);

      // ✅ UNIQUE MODIFICATION ICI : Envoi au graphique
      await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: REVOLUT_DB_ID, 
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
        });

      if (!error) console.log("✅ Revolut synchronisé avec succès !");
      else console.error("❌ Erreur Supabase :", error.message);
    } else {
      throw new Error("Impossible de trouver le chiffre du taux dans le texte : " + fullText);
    }

  } catch (err: any) {
    console.error("💥 ÉCHEC Revolut :", err.message);
    // On garde une preuve en cas d'erreur
    await page.screenshot({ path: 'revolut_debug.png' });
    console.log("📸 Capture d'écran de l'erreur sauvegardée.");
  } finally {
    await browser.close();
    console.log("🔒 Navigateur Revolut fermé.");
  }
}

scrapeRevolut();
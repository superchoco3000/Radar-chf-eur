import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_rATrmo041XODJGtBFIMxRQ_cn2frNdH';
const MIGROS_DB_ID = '019eabf1-2882-4664-b224-89172b07a334'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeMigros() {
  console.log("🚀 Lancement du robot Migros Bank...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.migrosbank.ch/fr/personnes-privees/comptes-cartes/cours-des-billets-et-des-devises.html', { 
        waitUntil: 'networkidle',
        timeout: 60000 
    });

    // 1. Gestion des Cookies (La bannière bloque souvent le reste)
    console.log("🍪 Gestion des cookies...");
    const cookieBtn = page.locator('#onetrust-accept-btn-handler');
    if (await cookieBtn.isVisible()) {
        await cookieBtn.click();
        await page.waitForTimeout(1000);
    }

    // 2. Scroll pour faire apparaître le tableau (Lazy Load)
    console.log("🖱️ Scroll vers le tableau...");
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(2000);

    // 3. Extraction précise via les classes de ta capture
    console.log("🔍 Extraction du taux EUR...");
    
    // On cible la ligne qui contient 'EUR'
    const eurRow = page.locator('tr.Table--row').filter({ hasText: 'EUR' }).first();
    await eurRow.waitFor({ state: 'visible', timeout: 15000 });

    // Sur ta capture, on voit plusieurs colonnes Table--bodyCell. 
    // Le taux "Devises Vente" semble être l'avant-dernier ou le dernier.
    const cells = eurRow.locator('.Table--bodyCell');
    const rateRaw = await cells.nth(5).innerText(); // On essaie l'index 5 (6ème colonne)

    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());
    
    if (isNaN(rateOnPage) || rateOnPage === 0) {
        throw new Error("Le taux extrait n'est pas un nombre valide.");
    }

    // ✅ LOGIQUE RADAR : 1 / Taux du site
    const finalRate = parseFloat((1 / rateOnPage).toFixed(4));
    console.log(`📊 Migros Bank : 1 EUR = ${rateOnPage} CHF | Radar : ${finalRate} EUR`);

    // 1. UPDATE : Pour la carte (Prix actuel)
    const { error: updateErr } = await supabase
      .from('exchanges')
      .update({ 
        last_rate: finalRate, 
        update_at: new Date().toISOString() 
      })
      .eq('id', MIGROS_DB_ID);

    if (updateErr) console.error("❌ Erreur Update :", updateErr.message);

    // ✅ 2. INSERT : Pour le GRAPHIQUE (Historique - MANQUANT dans ta version)
    const { error: histError } = await supabase
      .from('exchange_rates')
      .insert({ 
        exchange_id: MIGROS_DB_ID, 
        rate_chf_eur: finalRate,
        captured_at: new Date().toISOString()
      });

    if (!histError) console.log("✅ Migros Bank synchronisée (Carte + Graphique) !");
    else console.error("❌ Erreur historique :", histError.message);
    

  } catch (err: any) {
    console.error("💥 ÉCHEC Migros :", err.message);
    await page.screenshot({ path: 'migros_bank_error.png' });
  } finally {
    await browser.close();
  }
}

scrapeMigros();
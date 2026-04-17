import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

// ✅ TON ID FIXE
const RAIFFEISEN_DB_ID = 'b0ade3b7-dd14-4034-876e-dd8a23574f96'; 

async function scrapeRaiffeisen() {
  console.log("🚀 Robot Raiffeisen : Séquence de navigation visuelle...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // ÉTAPE 1 : Page principale
    console.log("📸 Étape 1 : Analyse de la page principale...");
    // 0. Bloqueo de recursos pesados para optimizar RAM
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2}', route => route.abort());
    await page.goto('https://boerse.raiffeisen.ch/fr-ch/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '1_analyse_principale.png' });

    // ÉTAPE 2 : Trouver et cliquer sur "Devises"
    console.log("🖱️ Étape 2 : Clic sur le lien 'Devises'...");
    const linkDevises = page.getByRole('link', { name: 'Devises', exact: true });
    await linkDevises.waitFor({ state: 'visible' });
    await linkDevises.click();

    // ÉTAPE 3 : Arrivée sur la page Devises & Analyse
    console.log("📸 Étape 3 : Analyse de la page Devises...");
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // Pause de 1.5s demandée
    await page.screenshot({ path: '2_analyse_devises.png' });

    // ÉTAPE 4 : Trouver et cliquer sur "Calculateur de devises"
    console.log("🖱️ Étape 4 : Activation du Calculateur...");
    const btnCalculateur = page.getByText('Calculateur de devises').first();
    await btnCalculateur.waitFor({ state: 'visible' });
    await btnCalculateur.click();

    // ÉTAPE 5 : Capture finale et extraction
    console.log("📸 Étape 5 : Capture du résultat final...");
    await page.waitForTimeout(1500); // Pause de 1.5s pour le calcul
    await page.screenshot({ path: '3_capture_finale.png' });

    const rateInput = page.getByLabel('Montant cible');
    const rateRaw = await rateInput.inputValue();
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());

    if (!isNaN(rateOnPage) && rateOnPage !== 0) {
      const finalRate = parseFloat((1 / rateOnPage).toFixed(4));
      console.log(`✅ Taux extrait : 1 EUR = ${finalRate} CHF`);

      // 1. MISE À JOUR DE LA TABLE PRINCIPALE (Le chiffre en direct)
      const { error: updateError } = await supabase
        .from('exchanges')
        .update({ 
            last_rate: finalRate,
            update_at: new Date().toISOString()
        })
        .eq('id', RAIFFEISEN_DB_ID);

      if (updateError) throw updateError;

      // 2. ✅ AJOUT POUR LE GRAPHIQUE (Historique)
      const { error: histError } = await supabase
        .from('exchange_rates')
        .insert({ 
          exchange_id: RAIFFEISEN_DB_ID,
          rate_chf_eur: finalRate,
          captured_at: new Date().toISOString()
        });

      if (histError) throw histError;

      console.log("🎯 Radar Raiffeisen mis à jour avec historique !");
    }

  } catch (err: any) {
    console.error("💥 Erreur pendant la séquence :", err.message);
    await page.screenshot({ path: 'erreur_sequence.png' });
  } finally {
    await browser.close();
    console.log("🏁 Fin de mission.");
  }
}

scrapeRaiffeisen();
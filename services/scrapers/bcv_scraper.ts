import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

// L'ID de ta ligne BCV dans Supabase (à vérifier dans ton dashboard)
const BCV_DB_ID = '4f78de59-44be-449f-adce-2a641851e4e8'; 

async function scrapeBCV() {
  console.log("🚀 Lancement du robot BCV (Méthode Capture)...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigation vers la page des cours
    await page.goto('https://www.bcv.ch/fr/home/informations-financieres/devises-et-billets.html', { 
        waitUntil: 'networkidle',
        timeout: 30000 
    });

    console.log("🔍 Recherche de la ligne EUR dans le tableau...");

    // On cherche la ligne qui contient "EUR" et on attend qu'elle soit chargée
    const eurRow = page.locator('tr').filter({ hasText: 'EUR' }).first();
    await eurRow.waitFor({ timeout: 15000 });

    // On récupère toutes les cellules de la ligne
    const cells = eurRow.locator('td');
    
    // Pour la BCV, on va chercher le taux de vente devises (généralement la 3ème colonne)
    const rateRaw = await cells.nth(2).innerText(); 
    const rateOnPage = parseFloat(rateRaw.replace(',', '.').trim());

    if (!isNaN(rateOnPage) && rateOnPage !== 0) {
      console.log(`✅ Taux capturé : ${rateOnPage}`);

      // Mise à jour de la table 'exchanges'
      const { error: updateError } = await supabase
        .from('exchanges')
        .update({ 
            last_rate: rateOnPage,
            update_at: new Date().toISOString()
        })
        .ilike('name', '%BCV%');

      if (updateError) throw updateError;
      console.log("🎯 Données BCV synchronisées !");
    }
  } catch (err: any) {
    console.error("💥 Échec de la capture BCV :", err.message);
  } finally {
    await browser.close();
    console.log("🏁 Robot BCV déconnecté.");
  }
}

scrapeBCV();
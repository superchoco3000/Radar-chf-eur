import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// 1. CONFIGURATION DIRECTE (Pas d'imports externes !)
// Trouve ces infos dans ton dashboard Supabase > Settings > API
const SUPABASE_URL = 'https://iykyjwcgizoehzzcenlt.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_cY-4dTtWod9iStrJtehMfQ_0kJCgZt3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeBSharpe() {
  console.log("🚀 Lancement du robot B-Sharpe autonome...");
  const browser = await chromium.launch({ headless: false }); 
  const page = await browser.newPage();

  try {
    await page.goto('https://www.baloise.ch/', { waitUntil: 'domcontentloaded' });

    // Clic cookies
    const permitButton = page.getByRole('button', { name: 'Tout autoriser' });
    await permitButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await permitButton.click({ force: true }).catch(() => {});

    // Extraction du taux
    const content = await page.innerText('body');
    const match = content.match(/1\s*CHF\s*=\s*(\d+[.,]\d+)/);

    if (match) {
      const rate = parseFloat(match[1].replace(',', '.'));
      console.log(`🎯 Taux trouvé : ${rate}`);
      
      // MISE À JOUR SUPABASE
      console.log("📡 Envoi direct à Supabase...");
      const { error } = await supabase
        .from('exchanges')
        .update({ 
          last_rate: rate, 
          updated_at: new Date().toISOString() 
        })
        .eq('name', 'Baloise'); // Assure-toi que le nom est identique dans ta table

      if (error) {
        console.error("❌ Erreur Supabase :", error.message);
      } else {
        console.log("✅ RÉUSSITE TOTALE : Le taux est dans la base !");
      }
    }
  } catch (err) {
    console.error("💥 Erreur :", err);
  } finally {
    await browser.close();
  }
}

// On appelle la fonction et on gère la fin du processus
scrapeBSharpe()
  .then(() => {
    console.log("✅ Script terminé avec succès.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Le script a échoué lamentablement :", err);
    process.exit(1);
  });
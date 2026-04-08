import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true }); 

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const MEILLEURTAUX_DB_ID = 'bfbbfa1d-2f98-427d-9ffa-deee241730d6'; 

async function scrapeMeilleurTaux() {
  console.log("🚀 Mission MeilleurTaux : Retour au mode Navigateur (Plus fiable)...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // On bloque les images pour aller plus vite
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', route => route.abort());

    await page.goto('https://www.meilleurtauxdechange.ch/', { waitUntil: 'domcontentloaded' });

    console.log("🔍 Extraction des taux du tableau...");
    
    // On attend que les chiffres de taux apparaissent (format 0.XXXX)
    await page.waitForSelector('text=/0\\.\\d{4}/', { timeout: 10000 });

    // On récupère tout le texte de la page pour scanner les taux
    const content = await page.innerText('body');
    const lines = content.split('\n');
    
    let results: { name: string, rate: number }[] = [];
    let bestRate: number | null = null;

    for (const line of lines) {
        const match = line.match(/0\.\d{4}/);
        if (match) {
            const rate = parseFloat(match[0]);
            if (rate > 0.85 && rate < 1.05) {
                const name = line.split(match[0])[0].trim().substring(0, 30);
                results.push({ name: name || "Indicateur", rate });
                if (bestRate === null) bestRate = rate;
            }
        }
    }

    if (bestRate) {
      console.table(results.slice(0, 8));
      console.log(`🎯 Meilleur taux retenu : ${bestRate}`);

      const { error } = await supabase
        .from('exchanges')
        .update({ 
            last_rate: bestRate,
            update_at: new Date().toISOString()
        })
        .eq('id', MEILLEURTAUX_DB_ID);

      if (error) throw error;
      console.log("🎯 Radar mis à jour avec succès via Playwright !");
    } else {
      console.log("⚠️ Toujours rien... Vérification visuelle requise.");
      await page.screenshot({ path: 'meilleurtaux_debug.png' });
    }

  } catch (err: any) {
    console.error("💥 Erreur :", err.message);
    await page.screenshot({ path: 'meilleurtaux_error.png' });
  } finally {
    await browser.close();
    console.log("🏁 Mission terminée.");
  }
}

scrapeMeilleurTaux();
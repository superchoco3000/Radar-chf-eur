import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const scrapers = [
  'bcge_scraper.ts',
  'bcv_scraper.ts',
  'bsharpe_scraper.ts',
  'bens_shop_scraper.ts',
  'change_geneve_scraper.ts',
  'changenligne_scraper.ts',
  'changesavoisien_scraper.ts',
  'changegroup_scraper.ts',
  'douane_officielle_scraper.ts',
  'global_exchange_scraper.ts',
  'ibani_scraper.ts',
  'leman_montblanc_scraper.ts',
  'lyland_scraper.ts',
  'meilleurtaux_scraper.ts',
  'migros_scraper.ts',
  'mon_taux_scraper.ts',
  'moneyand_scraper.ts',
  'official_rate_scraper.ts',
  'raiffeisen_scraper.ts',
  'revolut_scraper.ts',
  'telexoo_scraper.ts',
  'wise_scraper.ts'
];

async function runArmy() {
  console.log(`🎖️ Revue des troupes : Lancement de l'armée de ${scrapers.length} scrapers...`);
    
  const BATCH_SIZE = 5;
  for (let i = 0; i < scrapers.length; i += BATCH_SIZE) {
    const batch = scrapers.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Lancement du batch ${Math.floor(i/BATCH_SIZE) + 1} : ${batch.join(', ')}`);
    
    const results = await Promise.allSettled(
      batch.map(s => execPromise(`npx tsx services/scrapers/${s}`, { timeout: 120000 }))
    );
    
    results.forEach((result, idx) => {
        const name = batch[idx];
        if (result.status === 'fulfilled') {
            console.log(`✅ ${name} : Terminé avec succès`);
        } else {
            console.error(`❌ ${name} : ÉCHEC - ${result.reason?.message || 'Erreur inconnue'}`);
        }
    });
  }

  console.log("\n🏁 Fin de la mission globale. Tous los batches han sido procesados.");
}

runArmy();
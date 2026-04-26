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
  console.log(`🎖️ Revue des troupes : Lancement de l'armée de ${scrapers.length} scrapers en mode séquentiel...`);
    
  for (const scraper of scrapers) {
    console.log(`\n🚀 Lancement de la mission : ${scraper}`);
    
    try {
      // Ejecutamos uno por uno y esperamos a que termine antes de seguir
      // Aumentamos el timeout a 3 minutos por si la máquina va lenta
      await execPromise(`npx tsx services/scrapers/${scraper}`, { timeout: 180000 });
      console.log(`✅ ${scraper} : Terminado con éxito`);
    } catch (error: any) {
      console.error(`❌ ${scraper} : FALLIDO - ${error.message}`);
    }

    // Un pequeño respiro de 3 segundos para que la máquina recupere aire
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log("\n🏁 Fin de la mission globale. Todos los robots han patrullado.");
}

runArmy();
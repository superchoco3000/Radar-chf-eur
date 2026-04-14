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
  'mon_taux_scraper.ts', // Vérifie bien que ce fichier s'appelle exactement comme ça
  'moneyand_scraper.ts',
  'raiffeisen_scraper.ts',
  'revolut_scraper.ts',
  'telexoo_scraper.ts',
  'wise_scraper.ts'
  
  
];

async function runArmy() {
  console.log("🎖️ Revue des troupes : Lancement de l'armée de 18 scrapers...");
  
  for (const scraper of scrapers) {
    try {
      console.log(`📡 Déploiement de : ${scraper}...`);
      // Utilisation du chemin relatif correct pour GitHub Actions
      const { stdout } = await execPromise(`npx tsx services/scrapers/${scraper}`);
      console.log(stdout);
    } catch (error: any) {
      console.error(`❌ Échec du soldat ${scraper}:`, error.message);
      // On ne stoppe pas la boucle pour qu'un seul robot en panne ne bloque pas les 17 autres
    }
  }
  console.log("🏁 Fin de la mission globale.");
}

runArmy();
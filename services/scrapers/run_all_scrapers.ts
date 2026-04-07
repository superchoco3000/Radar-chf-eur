import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const scrapers = [
  'wise_scraper.ts',
  'revolut_scraper.ts',
  'bcge_scraper.ts',
  'lyland_scraper.ts',
  'bsharpe_scraper.ts',
  'changesavoisien_scraper.ts',
  'ibani_scraper.ts',
  'telexoo_scraper.ts',
  'leman_montblanc_scraper.ts',
  'migros_scraper.ts',
  'moneyand_scraper.ts',
  'change_geneve_scraper.ts',
  'douane_officielle_scraper.ts',

  // Ajoute ici tous les fichiers présents dans ton dossier scrapers
];

async function runArmy() {
  console.log("🎖️ Revue des troupes : Lancement de l'armée de scrapers...");
  
  for (const scraper of scrapers) {
    try {
      console.log(`📡 Déploiement de : ${scraper}...`);
      const { stdout } = await execPromise(`npx tsx services/scrapers/${scraper}`);
      console.log(stdout);
    } catch (error) {
      console.error(`⚠️ Échec du soldat ${scraper}:`, error);
    }
  }
  
  console.log("✅ Opération terminée. Le Radar est à jour dans Supabase !");
}

runArmy();
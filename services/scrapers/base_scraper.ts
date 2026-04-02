import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Chargement des variables d'environnement
dotenv.config({ path: '.env.local' });

// Connexion à Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cette fonction servira à envoyer le taux en base de données
export async function updateRate(exchangeId: string, rate: number) {
  const { error } = await supabase
    .from('exchange_rates') //
    .insert([
      { 
        exchange_id: exchangeId, // L'ID du bureau
        rate_chf_eur: rate, 
        fee_included: true 
      }
    ]);

  if (error) {
    console.error(`Erreur lors de la mise à jour pour ${exchangeId}:`, error.message);
  } else {
    console.log(`✅ Taux mis à jour : ${rate} pour le bureau ${exchangeId}`);
  }
}
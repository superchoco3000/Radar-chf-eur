export default function Methodologie() {
  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 md:p-20 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter">
          Notre <span className="text-emerald-500">Méthodologie</span>
        </h1>

        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase text-emerald-500 tracking-widest">1. Origine des données</h2>
          <p className="text-slate-400 leading-relaxed italic">
            RadarElite.app utilise un moteur de scan propriétaire qui agrège les informations publiquement exposées par les établissements financiers et bureaux de change. Nous utilisons soit les API officielles, soit le traitement des données structurées présentes sur les pages de tarifs publics.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase text-emerald-500 tracking-widest">2. Algorithme "Taux Elite"</h2>
          <p className="text-slate-400 leading-relaxed italic">
            Notre calcul de "Gain Réel Net" ne se contente pas de comparer les taux. Il intègre :
          </p>
          <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
            <li>Le <b>Spread</b> (écart entre le taux interbancaire Reuters et le taux proposé).</li>
            <li>Les <b>Frais fixes</b> de transaction déclarés par l'établissement.</li>
            <li>Les <b>Coûts logistiques</b> (estimation des frais de déplacement pour les guichets physiques).</li>
          </ul>
        </section>

        <section className="space-y-4 border-l-4 border-amber-500 pl-6">
          <h2 className="text-xl font-black uppercase text-amber-500 tracking-widest">3. Clause de non-responsabilité</h2>
          <p className="text-slate-400 text-sm italic">
            Les taux de change fluctuent à la seconde. Les données affichées sur RadarElite sont fournies à titre indicatif et ne constituent pas un engagement contractuel. L'utilisateur est invité à vérifier le taux final directement auprès de l'établissement avant toute transaction. RadarElite ne peut être tenu responsable des écarts constatés lors du change effectif.
          </p>
        </section>

        <section className="space-y-4 pt-12 border-t border-slate-800">
          <h2 className="text-xl font-black uppercase text-slate-500 tracking-widest">Mentions Légales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[10px] text-slate-500 uppercase font-bold tracking-tight">
            <div className="space-y-2">
              <p className="text-slate-400">Éditeur du site</p>
              <p>Lucas Casanove<br />Contact : lucascasanove@yahoo.fr</p>
            </div>
            <div className="space-y-2">
              <p className="text-slate-400">Hébergement</p>
              <p>Vercel Inc.<br />340 S Lemon Ave #4133<br />Walnut, CA 91789, USA</p>
            </div>
            <div className="md:col-span-2 space-y-2">
              <p className="text-slate-400">Propriété Intellectuelle</p>
              <p className="leading-relaxed">
                L'algorithme de calcul "Gain Réel Net" et l'interface RADAR.IO sont la propriété exclusive de l'éditeur. 
                Toute reproduction, même partielle, sans autorisation est interdite.
              </p>
            </div>
            <div className="md:col-span-2 space-y-2 italic">
              <p className="text-slate-400 font-black">Données Personnelles & Cookies</p>
              <p>
                RADAR.IO n'utilise aucun cookie de traçage publicitaire. Les seules données stockées le sont localement sur votre appareil (LocalStorage) pour permettre le fonctionnement hors-ligne de l'outil. Aucune donnée personnelle n'est collectée ou revendue.
              </p>
            </div>
          </div>
        </section>
        
        <a href="/" className="inline-block bg-white text-black px-8 py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-colors">
          Retour au Radar
        </a>
      </div>

    </main>
  );
}
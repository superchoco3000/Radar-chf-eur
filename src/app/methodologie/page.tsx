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
        
        <a href="/" className="inline-block bg-white text-black px-8 py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-colors">
          Retour au Radar
        </a>
      </div>
    </main>
  );
}
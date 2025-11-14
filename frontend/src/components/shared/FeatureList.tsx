import "./FeatureList.css";

const features = [
  {
    title: "Vision complète",
    description:
      "Prenez en compte vos pensions, revenus immobiliers, charges et placements pour piloter votre trajectoire de capital.",
  },
  {
    title: "Simulation dynamique",
    description:
      "Projetez l’évolution de votre patrimoine en intégrant rendement attendu, inflation et décaissements progressifs.",
  },
  {
    title: "Suivi intelligent",
    description:
      "Comparez votre situation réelle à la trajectoire cible et ajustez vos apports mensuels en cas d’écart.",
  },
];

export function FeatureList() {
  return (
    <section className="features">
      {features.map((feature) => (
        <article key={feature.title} className="features__item">
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </article>
      ))}
    </section>
  );
}



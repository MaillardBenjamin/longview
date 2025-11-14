import { Link } from "react-router-dom";
import "./HeroSection.css";

export function HeroSection() {
  return (
    <section className="hero">
      <figure className="hero__image-frame">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
          alt="Longue vue braquée sur l'horizon pour symboliser l'anticipation financière"
          loading="lazy"
        />
        <figcaption className="hero__overlay">
          <div className="hero__overlay-text">
            <h1>
              Préparez votre retraite avec{" "}
              <span className="hero__highlight">
                Long<span>View</span>
              </span>
            </h1>
            <p>
              Une vision claire et personnalisée de votre avenir financier. Intégrez vos revenus, votre épargne et vos
              investissements pour planifier une retraite alignée sur vos ambitions de vie.
            </p>
            <div className="hero__actions">
              <Link to="/simulation" className="hero__cta">
                Lancer la simulation
              </Link>
              <Link to="/resultats" className="hero__secondary">
                Découvrir un exemple
              </Link>
            </div>
          </div>
          <div className="hero__overlay-cards">
            <div className="hero__card hero__card--overlay">
              <p className="hero__label">Projection capital</p>
              <p className="hero__value">615 000 €</p>
              <p className="hero__caption">à 67 ans, selon vos paramètres actuels</p>
            </div>
            <div className="hero__card hero__card--overlay hero__card--accent">
              <p className="hero__label">Épargne mensuelle recommandée</p>
              <p className="hero__value">1 150 €</p>
              <p className="hero__caption">pour atteindre votre objectif de revenu</p>
            </div>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}


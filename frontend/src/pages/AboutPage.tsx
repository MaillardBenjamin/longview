/**
 * Page "À propos" de l'application.
 * 
 * Présente l'origine du projet, la motivation de son développement,
 * et les informations sur la licence et le code source.
 */

import { Link } from "react-router-dom";
import "./AboutPage.css";

export function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-page__header">
        <h1>À propos de LongView</h1>
        <p className="about-page__subtitle">
          Un simulateur de retraite open source, conçu pour la communauté
        </p>
      </header>

      <div className="about-page__content">
        <section className="about-page__section">
          <h2>L'origine du projet</h2>
          <p>
            Lorsque j'ai commencé à planifier ma retraite, j'ai cherché des outils de simulation
            en ligne pour m'aider à comprendre l'évolution de mon capital et estimer l'épargne
            nécessaire. Malheureusement, après avoir testé de nombreux simulateurs disponibles
            sur internet, je me suis rendu compte qu'aucun ne répondait vraiment à mes besoins :
          </p>
          <ul>
            <li>
              <strong>Simulateurs trop simplistes</strong> : La plupart se contentent de calculs
              linéaires basiques sans tenir compte de la volatilité des marchés
            </li>
            <li>
              <strong>Manque de transparence</strong> : Les algorithmes utilisés sont souvent
              opaques, rendant impossible la vérification des résultats
            </li>
            <li>
              <strong>Limitations fonctionnelles</strong> : Peu de simulateurs permettent de
              modéliser des scénarios complexes (plusieurs comptes, phases d'épargne variables,
              profils de dépenses, etc.)
            </li>
            <li>
              <strong>Absence de simulation Monte Carlo</strong> : Très peu d'outils proposent
              des projections probabilistes pour évaluer les risques
            </li>
            <li>
              <strong>Pas d'optimisation</strong> : Aucun simulateur ne permettait de déterminer
              automatiquement l'épargne mensuelle minimale nécessaire pour atteindre un objectif
            </li>
          </ul>
        </section>

        <section className="about-page__section">
          <h2>La solution : LongView</h2>
          <p>
            Face à ce constat, j'ai décidé de développer mon propre simulateur de retraite,
            intégrant toutes les fonctionnalités que je jugeais essentielles :
          </p>
          <ul>
            <li>
              <strong>Simulation Monte Carlo</strong> : Projections probabilistes avec percentiles
              (pessimiste, médian, optimiste) pour évaluer les risques
            </li>
            <li>
              <strong>Modélisation avancée</strong> : Support de multiples comptes d'investissement,
              phases d'épargne variables, profils de dépenses personnalisés
            </li>
            <li>
              <strong>Optimisation automatique</strong> : Calcul de l'épargne mensuelle minimale
              nécessaire pour atteindre un capital cible à l'âge de décès
            </li>
            <li>
              <strong>Transparence totale</strong> : Code source ouvert et documenté pour permettre
              la vérification des algorithmes
            </li>
            <li>
              <strong>Gratuit et sans inscription obligatoire</strong> : Accessible à tous,
              sans barrière d'entrée
            </li>
          </ul>
        </section>

        <section className="about-page__section">
          <h2>Open source et communauté</h2>
          <p>
            Convaincu que la planification de la retraite devrait être accessible à tous et que
            la transparence est essentielle pour un outil financier, j'ai décidé de mettre
            <strong> LongView à disposition de la communauté</strong> sous licence{" "}
            <strong>MIT</strong>.
          </p>
          <p>
            Cette licence permet à chacun de :
          </p>
          <ul>
            <li>
              <strong>Utiliser librement</strong> l'application pour ses propres simulations
            </li>
            <li>
              <strong>Consulter le code source</strong> pour comprendre et vérifier les calculs
            </li>
            <li>
              <strong>Contribuer</strong> au projet en proposant des améliorations ou en
              corrigeant des bugs
            </li>
            <li>
              <strong>Adapter</strong> le code à ses besoins spécifiques
            </li>
            <li>
              <strong>Partager</strong> des améliorations avec la communauté
            </li>
          </ul>
        </section>

        <section className="about-page__section">
          <h2>Code source sur GitHub</h2>
          <p>
            Le code source complet de LongView est disponible sur GitHub, incluant :
          </p>
          <ul>
            <li>
              <strong>Backend</strong> : API FastAPI avec simulations Monte Carlo et optimisation
            </li>
            <li>
              <strong>Frontend</strong> : Interface React avec visualisations interactives
            </li>
            <li>
              <strong>Documentation</strong> : README complet, commentaires dans le code,
              schémas d'architecture
            </li>
            <li>
              <strong>Licence MIT</strong> : Fichier LICENSE inclus dans le dépôt
            </li>
          </ul>
          <div className="about-page__github-box">
            <p>
              <strong>🔗 Accéder au code source :</strong>
            </p>
            <p>
              Le dépôt GitHub sera disponible prochainement. En attendant, vous pouvez consulter
              le code source localement ou contribuer au développement.
            </p>
            <p className="about-page__note">
              <em>
                Note : Le lien GitHub sera ajouté dès que le dépôt sera rendu public.
              </em>
            </p>
          </div>
        </section>

        <section className="about-page__section">
          <h2>Contribution</h2>
          <p>
            LongView est un projet communautaire. Toute contribution est la bienvenue :
          </p>
          <ul>
            <li>
              <strong>Rapport de bugs</strong> : Signalez les problèmes que vous rencontrez
            </li>
            <li>
              <strong>Suggestions d'amélioration</strong> : Proposez de nouvelles fonctionnalités
            </li>
            <li>
              <strong>Contributions de code</strong> : Améliorez l'application directement
            </li>
            <li>
              <strong>Documentation</strong> : Aidez à améliorer la documentation
            </li>
            <li>
              <strong>Tests</strong> : Testez l'application et partagez vos retours
            </li>
          </ul>
        </section>

        <section className="about-page__section about-page__section--highlight">
          <h2>⚠️ Avertissement important</h2>
          <p>
            LongView est un <strong>outil de simulation</strong> et ne constitue{" "}
            <strong>pas un conseil financier</strong>. Les résultats sont indicatifs et basés sur
            des hypothèses de marché. Il est essentiel de :
          </p>
          <ul>
            <li>Vérifier par vous-même l'exactitude des calculs</li>
            <li>Consulter un conseiller financier professionnel avant toute décision importante</li>
            <li>Comprendre que les projections ne sont pas des garanties</li>
            <li>Adapter les hypothèses de marché à votre situation</li>
          </ul>
          <p>
            Pour plus d'informations, consultez nos{" "}
            <Link to="/cgu" className="about-page__link">
              Conditions Générales d'Utilisation
            </Link>
            .
          </p>
        </section>

        <section className="about-page__section">
          <h2>Contact</h2>
          <p>
            Pour toute question, suggestion ou contribution, vous pouvez me contacter :
          </p>
          <div className="about-page__info-box">
            <p>
              <strong>Email :</strong>{" "}
              <a href="mailto:contact@oenotrac.fr" className="about-page__link">
                contact@oenotrac.fr
              </a>
            </p>
            <p>
              <strong>Éditeur :</strong> oenotrac
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}


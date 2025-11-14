import "./CGUPage.css";

/**
 * Page d'affichage des Conditions Générales d'Utilisation.
 * 
 * Affiche les CGU complètes avec toutes les clauses de décharge de responsabilité
 * et les avertissements concernant l'utilisation du simulateur.
 */
export function CGUPage() {
  return (
    <div className="cgu-page">
      <header className="cgu-page__header">
        <h1>Conditions Générales d'Utilisation</h1>
        <p className="cgu-page__last-update">Dernière mise à jour : Novembre 2024</p>
      </header>

      <div className="cgu-page__content">
        <section className="cgu-page__section">
          <h2>1. Objet et acceptation</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après "CGU") régissent l'utilisation
            de l'application web <strong>LongView</strong> (ci-après "l'Application" ou "le Service").
          </p>
          <div className="cgu-page__info-box">
            <p>
              <strong>Éditeur :</strong> Benjamin MAILLARD, entrepreneur individuel
              <br />
              <strong>Adresse :</strong> 74 rue Romain Rolland, 93260 Les Lilas, France
              <br />
              <strong>SIREN :</strong> 989 832 795
              <br />
              <strong>TVA intracommunautaire :</strong> FR52 989 832 795
            </p>
          </div>
          <p>
            En accédant et en utilisant l'Application, vous reconnaissez avoir lu, compris et accepté
            sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser
            immédiatement toute utilisation de l'Application.
          </p>
        </section>

        <section className="cgu-page__section">
          <h2>2. Nature du service</h2>
          <p>
            LongView est une application de <strong>simulation financière</strong> destinée à la
            planification de la retraite. L'Application utilise des algorithmes de simulation Monte
            Carlo pour projeter l'évolution potentielle de votre capital et estimer l'épargne
            mensuelle nécessaire pour atteindre vos objectifs de retraite.
          </p>
          <div className="cgu-page__warning">
            <strong>IMPORTANT :</strong> L'Application est un <strong>outil d'aide à la décision</strong>{" "}
            et ne constitue en aucun cas :
            <ul>
              <li>Un conseil en investissement</li>
              <li>Une recommandation financière personnalisée</li>
              <li>Une garantie de performance</li>
              <li>Une promesse de résultat</li>
            </ul>
          </div>
        </section>

        <section className="cgu-page__section">
          <h2>3. Avertissements et limitations</h2>
          
          <h3>3.1. Caractère indicatif des résultats</h3>
          <p>
            Les projections fournies par l'Application sont <strong>purement indicatives</strong> et
            basées sur :
          </p>
          <ul>
            <li>Des hypothèses de marché que vous pouvez configurer</li>
            <li>Des modèles mathématiques et statistiques</li>
            <li>Des données que vous renseignez vous-même</li>
          </ul>
          <p>
            Ces projections ne reflètent pas nécessairement la réalité future et peuvent différer
            significativement des résultats réels en raison de :
          </p>
          <ul>
            <li>L'évolution imprévisible des marchés financiers</li>
            <li>Les changements de législation fiscale</li>
            <li>Les variations de l'inflation</li>
            <li>Les événements économiques imprévus</li>
            <li>Les erreurs dans les données saisies</li>
          </ul>

          <h3>3.2. Absence de garantie</h3>
          <p>
            L'Application est fournie <strong>"en l'état"</strong> sans aucune garantie, expresse ou
            implicite, concernant :
          </p>
          <ul>
            <li>L'exactitude des calculs</li>
            <li>La pertinence des projections</li>
            <li>La fiabilité des algorithmes</li>
            <li>La disponibilité du service</li>
            <li>L'absence d'erreurs ou de bugs</li>
          </ul>

          <h3>3.3. Risques financiers</h3>
          <p>
            Toute décision d'investissement comporte des <strong>risques de perte en capital</strong>.
            Les performances passées ne préjugent pas des performances futures. Les investissements
            peuvent perdre de la valeur et vous pouvez perdre tout ou partie de votre capital investi.
          </p>
        </section>

        <section className="cgu-page__section">
          <h2>4. Décharge de responsabilité</h2>
          
          <h3>4.1. Responsabilité limitée</h3>
          <p>
            L'éditeur de l'Application (ci-après "l'Éditeur") décline toute responsabilité concernant :
          </p>
          <ul>
            <li>
              <strong>Les décisions financières</strong> prises sur la base des résultats de
              l'Application
            </li>
            <li>
              <strong>Les pertes financières</strong> résultant de l'utilisation de l'Application
            </li>
            <li>
              <strong>Les dommages directs ou indirects</strong> liés à l'utilisation ou à
              l'impossibilité d'utiliser l'Application
            </li>
            <li>
              <strong>Les erreurs, omissions ou inexactitudes</strong> dans les données ou les calculs
            </li>
            <li>
              <strong>Les interruptions de service</strong> ou les dysfonctionnements techniques
            </li>
            <li>
              <strong>Les conséquences</strong> de l'utilisation des informations fournies par
              l'Application
            </li>
          </ul>

          <h3>4.2. Limitation de responsabilité</h3>
          <p>
            Dans la mesure permise par la loi applicable, la responsabilité de l'Éditeur est limitée
            au montant que vous avez éventuellement payé pour l'utilisation de l'Application, ou à
            défaut, à zéro euro.
          </p>
          <p>
            L'Éditeur ne pourra en aucun cas être tenu responsable de :
          </p>
          <ul>
            <li>Perte de profits, de revenus, de données ou d'opportunités</li>
            <li>Dommages consécutifs, accessoires ou indirects</li>
            <li>Préjudices moraux ou commerciaux</li>
          </ul>
        </section>

        <section className="cgu-page__section">
          <h2>5. Obligations de l'utilisateur</h2>
          
          <h3>5.1. Vérification indépendante</h3>
          <p>Vous reconnaissez et acceptez que :</p>
          <ul>
            <li>
              Les résultats de l'Application doivent être <strong>vérifiés par vos soins</strong>
            </li>
            <li>
              Vous devez <strong>consulter un conseiller financier professionnel</strong> avant toute
              décision d'investissement importante
            </li>
            <li>
              Vous êtes seul responsable de la <strong>vérification de l'exactitude</strong> des
              données que vous saisissez
            </li>
            <li>
              Vous devez <strong>actualiser régulièrement</strong> vos informations dans l'Application
            </li>
            <li>
              Vous devez <strong>comprendre les risques</strong> associés à vos investissements
            </li>
          </ul>

          <h3>5.2. Utilisation conforme</h3>
          <p>Vous vous engagez à :</p>
          <ul>
            <li>Utiliser l'Application de manière <strong>loyale et conforme</strong> à sa destination</li>
            <li>Fournir des informations <strong>exactes et à jour</strong></li>
            <li>Ne pas utiliser l'Application à des fins <strong>frauduleuses ou illégales</strong></li>
            <li>Respecter les <strong>droits de propriété intellectuelle</strong> de l'Éditeur</li>
            <li>Ne pas tenter de <strong>contourner les mesures de sécurité</strong> de l'Application</li>
          </ul>
        </section>

        <section className="cgu-page__section">
          <h2>6. Données personnelles</h2>
          <p>
            L'utilisation de l'Application implique le traitement de données personnelles. Pour plus
            d'informations, consultez notre{" "}
            <a href="/privacy" className="cgu-page__link">
              Politique de Confidentialité
            </a>
            .
          </p>
        </section>

        <section className="cgu-page__section">
          <h2>7. Propriété intellectuelle</h2>
          <p>
            L'Application, son code source, ses algorithmes, son design et son contenu sont la
            propriété exclusive de l'Éditeur et sont protégés par les lois sur la propriété
            intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification ou adaptation sans autorisation préalable
            est strictement interdite.
          </p>
        </section>

        <section className="cgu-page__section">
          <h2>8. Disponibilité du service</h2>
          <p>
            L'Éditeur s'efforce d'assurer une disponibilité continue de l'Application, mais ne peut
            garantir un accès ininterrompu au service, l'absence d'erreurs ou la compatibilité avec
            tous les navigateurs ou appareils.
          </p>
          <p>L'Éditeur se réserve le droit de :</p>
          <ul>
            <li>Interrompre temporairement l'Application pour maintenance</li>
            <li>Modifier ou supprimer des fonctionnalités</li>
            <li>Suspendre l'accès en cas d'utilisation abusive</li>
          </ul>
        </section>

        <section className="cgu-page__section">
          <h2>9. Modifications des CGU</h2>
          <p>
            L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les
            modifications entrent en vigueur dès leur publication sur l'Application.
          </p>
          <p>
            Il est de votre responsabilité de consulter régulièrement les CGU pour prendre connaissance
            des éventuelles modifications.
          </p>
        </section>

        <section className="cgu-page__section">
          <h2>10. Médiation de la consommation</h2>
          <p>
            Conformément aux articles L. 611-1 et R. 612-1 et suivants du Code de la consommation
            concernant le règlement amiable des litiges, si vous êtes un consommateur, vous avez le
            droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution
            amiable du litige qui nous oppose.
          </p>
          <p>
            Pour toute réclamation, vous pouvez contacter le médiateur de la consommation compétent
            via la{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="cgu-page__link"
            >
              plateforme européenne de règlement en ligne des litiges
            </a>
            .
          </p>
        </section>

        <section className="cgu-page__section">
          <h2>11. Résiliation</h2>
          <p>
            L'Éditeur se réserve le droit de suspendre ou de résilier votre accès à l'Application à
            tout moment, sans préavis, en cas de :
          </p>
          <ul>
            <li>Violation des présentes CGU</li>
            <li>Utilisation frauduleuse ou abusive</li>
            <li>Demande des autorités compétentes</li>
          </ul>
        </section>

        <section className="cgu-page__section">
          <h2>12. Droit applicable et juridiction</h2>
          <p>Les présentes CGU sont régies par le droit français.</p>
          <p>
            En cas de litige, et après tentative de résolution amiable (y compris médiation de la
            consommation si applicable), les parties conviennent de la compétence exclusive des
            tribunaux français.
          </p>
        </section>

        <section className="cgu-page__section">
          <h2>13. Contact</h2>
          <p>
            Pour toute question concernant les présentes CGU, vous pouvez nous contacter :
          </p>
          <div className="cgu-page__info-box">
            <p>
              <strong>Email :</strong>{" "}
              <a href="mailto:contact@oenotrac.fr" className="cgu-page__link">
                contact@oenotrac.fr
              </a>
            </p>
            <p>
              <strong>Adresse :</strong> 74 rue Romain Rolland, 93260 Les Lilas, France
            </p>
          </div>
        </section>

        <section className="cgu-page__section cgu-page__section--highlight">
          <h2>⚠️ Avertissement important</h2>
          <p>
            En utilisant LongView, vous reconnaissez avoir lu et compris que cet outil ne constitue{" "}
            <strong>pas un conseil financier</strong> et que vous devez consulter un professionnel
            qualifié avant de prendre toute décision d'investissement. L'Éditeur décline toute
            responsabilité concernant les décisions prises sur la base des résultats de l'Application.
          </p>
        </section>
      </div>
    </div>
  );
}


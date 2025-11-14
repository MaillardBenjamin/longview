import "./PrivacyPage.css";

/**
 * Page d'affichage de la Politique de Confidentialité.
 * 
 * Conforme au RGPD et à la loi Informatique et Libertés.
 */
export function PrivacyPage() {
  return (
    <div className="privacy-page">
      <header className="privacy-page__header">
        <h1>Politique de Confidentialité</h1>
        <p className="privacy-page__last-update">Dernière mise à jour : Novembre 2024</p>
      </header>

      <div className="privacy-page__content">
        <section className="privacy-page__section">
          <h2>1. Introduction</h2>
          <p>
            La présente Politique de Confidentialité décrit la manière dont <strong>LongView</strong>{" "}
            (ci-après "nous", "notre" ou "l'Application") collecte, utilise, stocke et protège vos
            données personnelles lorsque vous utilisez notre application web de simulation financière.
          </p>
          <p>
            En utilisant l'Application, vous acceptez les pratiques décrites dans cette politique.
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>2. Données collectées</h2>
          
          <h3>2.1. Données que vous nous fournissez</h3>
          <p>Lors de l'utilisation de l'Application, nous pouvons collecter :</p>
          <ul>
            <li>
              <strong>Données d'identification</strong> : nom, prénom, adresse email (si vous créez un
              compte)
            </li>
            <li>
              <strong>Données de profil</strong> : âge, situation familiale, revenus
            </li>
            <li>
              <strong>Données financières</strong> : montants d'épargne, comptes d'investissement,
              objectifs de retraite
            </li>
            <li>
              <strong>Données de simulation</strong> : paramètres de simulation, résultats de projections
            </li>
          </ul>

          <h3>2.2. Données collectées automatiquement</h3>
          <p>Nous collectons également automatiquement :</p>
          <ul>
            <li>
              <strong>Données techniques</strong> : adresse IP, type de navigateur, système d'exploitation
            </li>
            <li>
              <strong>Données d'utilisation</strong> : pages visitées, durée de session, fonctionnalités
              utilisées
            </li>
            <li>
              <strong>Cookies et technologies similaires</strong> : pour améliorer votre expérience
            </li>
          </ul>
        </section>

        <section className="privacy-page__section">
          <h2>3. Utilisation des données</h2>
          <p>Nous utilisons vos données personnelles pour :</p>
          <ul>
            <li>
              <strong>Fournir le service</strong> : exécuter les simulations et générer les projections
            </li>
            <li>
              <strong>Améliorer l'Application</strong> : analyser l'utilisation pour améliorer les
              fonctionnalités
            </li>
            <li>
              <strong>Communication</strong> : vous contacter concernant votre compte ou le service (si
              nécessaire)
            </li>
            <li>
              <strong>Sécurité</strong> : détecter et prévenir les fraudes ou abus
            </li>
            <li>
              <strong>Obligations légales</strong> : respecter nos obligations légales et réglementaires
            </li>
          </ul>
        </section>

        <section className="privacy-page__section">
          <h2>4. Base légale du traitement</h2>
          <p>Le traitement de vos données personnelles est basé sur :</p>
          <ul>
            <li>
              <strong>Votre consentement</strong> : lorsque vous créez un compte ou utilisez l'Application
            </li>
            <li>
              <strong>L'exécution d'un contrat</strong> : pour fournir le service demandé
            </li>
            <li>
              <strong>L'intérêt légitime</strong> : pour améliorer l'Application et assurer sa sécurité
            </li>
            <li>
              <strong>Les obligations légales</strong> : pour respecter la législation applicable
            </li>
          </ul>
        </section>

        <section className="privacy-page__section">
          <h2>5. Partage des données</h2>
          <p>
            Nous ne vendons, ne louons ni ne partageons vos données personnelles avec des tiers, sauf
            dans les cas suivants :
          </p>
          <ul>
            <li>
              <strong>Prestataires de services</strong> : pour héberger l'Application ou fournir des
              services techniques (sous contrat de confidentialité strict)
            </li>
            <li>
              <strong>Obligations légales</strong> : si requis par la loi ou une autorité compétente
            </li>
            <li>
              <strong>Protection de nos droits</strong> : pour protéger nos droits, propriété ou sécurité
            </li>
          </ul>
        </section>

        <section className="privacy-page__section">
          <h2>6. Conservation des données</h2>
          <p>Nous conservons vos données personnelles :</p>
          <ul>
            <li>
              <strong>Pendant la durée d'utilisation</strong> de votre compte
            </li>
            <li>
              <strong>Conformément aux obligations légales</strong> de conservation
            </li>
            <li>
              <strong>Jusqu'à votre demande de suppression</strong> (sous réserve des obligations légales)
            </li>
          </ul>
          <p>Vous pouvez demander la suppression de vos données à tout moment en nous contactant.</p>
        </section>

        <section className="privacy-page__section">
          <h2>7. Sécurité des données</h2>
          <p>
            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées
            pour protéger vos données contre :
          </p>
          <ul>
            <li>L'accès non autorisé</li>
            <li>La perte ou la destruction accidentelle</li>
            <li>La divulgation non autorisée</li>
            <li>La modification non autorisée</li>
          </ul>
          <p>
            Cependant, aucune méthode de transmission ou de stockage n'est totalement sécurisée. Nous ne
            pouvons garantir une sécurité absolue.
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>8. Vos droits</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des
            droits suivants :
          </p>
          <ul>
            <li>
              <strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles
            </li>
            <li>
              <strong>Droit de rectification</strong> : corriger vos données inexactes ou incomplètes
            </li>
            <li>
              <strong>Droit à l'effacement</strong> : demander la suppression de vos données
            </li>
            <li>
              <strong>Droit à la limitation</strong> : limiter le traitement de vos données
            </li>
            <li>
              <strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré
            </li>
            <li>
              <strong>Droit d'opposition</strong> : vous opposer au traitement de vos données
            </li>
            <li>
              <strong>Droit de retirer votre consentement</strong> : à tout moment
            </li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à l'adresse indiquée dans la section Contact.
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>9. Cookies</h2>
          <p>L'Application utilise des cookies pour :</p>
          <ul>
            <li>Mémoriser vos préférences</li>
            <li>Améliorer votre expérience utilisateur</li>
            <li>Analyser l'utilisation de l'Application</li>
          </ul>
          <p>
            Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela peut affecter
            certaines fonctionnalités de l'Application.
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>10. Transferts internationaux</h2>
          <p>
            Vos données sont stockées et traitées dans l'Union Européenne. En cas de transfert hors de
            l'UE, nous nous assurons que des garanties appropriées sont en place.
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>11. Données des mineurs</h2>
          <p>
            L'Application n'est pas destinée aux personnes de moins de 18 ans. Nous ne collectons pas
            sciemment de données personnelles de mineurs.
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>12. Modifications de la politique</h2>
          <p>
            Nous pouvons modifier cette Politique de Confidentialité à tout moment. Les modifications
            entrent en vigueur dès leur publication sur l'Application.
          </p>
        </section>

        <section className="privacy-page__section">
          <h2>13. Contact</h2>
          <p>
            Pour toute question concernant cette Politique de Confidentialité ou vos données
            personnelles, contactez-nous :
          </p>
          <div className="privacy-page__info-box">
            <p>
              <strong>Éditeur :</strong> Benjamin MAILLARD, entrepreneur individuel
            </p>
            <p>
              <strong>Adresse :</strong> 74 rue Romain Rolland, 93260 Les Lilas, France
            </p>
            <p>
              <strong>SIREN :</strong> 989 832 795
            </p>
            <p>
              <strong>Email :</strong>{" "}
              <a href="mailto:contact@oenotrac.fr" className="privacy-page__link">
                contact@oenotrac.fr
              </a>
            </p>
          </div>
          <p>
            Vous avez également le droit de déposer une plainte auprès de la Commission Nationale de
            l'Informatique et des Libertés (CNIL) si vous estimez que vos droits ne sont pas respectés.
          </p>
          <div className="privacy-page__info-box">
            <p>
              <strong>CNIL</strong>
              <br />
              3 Place de Fontenoy - TSA 80715
              <br />
              75334 PARIS CEDEX 07
              <br />
              Téléphone : 01 53 73 22 22
              <br />
              Site web :{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="privacy-page__link"
              >
                www.cnil.fr
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}


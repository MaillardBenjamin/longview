import "./MentionsLegalesPage.css";

/**
 * Page d'affichage des mentions légales obligatoires.
 * 
 * Conforme aux obligations légales françaises pour les sites web.
 */
export function MentionsLegalesPage() {
  return (
    <div className="mentions-legales-page">
      <header className="mentions-legales-page__header">
        <h1>Mentions Légales</h1>
        <p className="mentions-legales-page__last-update">Dernière mise à jour : Novembre 2024</p>
      </header>

      <div className="mentions-legales-page__content">
        <section className="mentions-legales-page__section">
          <h2>1. Éditeur du site</h2>
          <p>
            Le site <strong>LongView</strong> est édité par :
          </p>
          <div className="mentions-legales-page__info-box">
            <p>
              <strong>oenotrac</strong>
              <br />
              Entrepreneur individuel
              <br />
              Domicilié au 74 rue Romain Rolland
              <br />
              93260 Les Lilas, France
            </p>
            <p>
              <strong>Immatriculation :</strong>
              <br />
              Registre du Commerce et des Sociétés de Bobigny
              <br />
              Numéro SIREN : <strong>989 832 795</strong>
            </p>
            <p>
              <strong>Numéro de TVA intracommunautaire :</strong>
              <br />
              FR52 989 832 795
            </p>
            <p>
              <strong>Directeur de publication :</strong>
              <br />
              oenotrac
            </p>
          </div>
        </section>

        <section className="mentions-legales-page__section">
          <h2>2. Hébergeur</h2>
          <p>Le site est hébergé par :</p>
          <div className="mentions-legales-page__info-box">
            <p>
              <strong>Clever Cloud SAS</strong>
              <br />
              3 rue de l'Allier
              <br />
              44000 Nantes, France
            </p>
            <p>
              <strong>Téléphone :</strong> +33 (0)2 85 52 07 69
            </p>
            <p>
              <strong>Site web :</strong>{" "}
              <a
                href="https://www.clever-cloud.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mentions-legales-page__link"
              >
                https://www.clever-cloud.com
              </a>
            </p>
          </div>
        </section>

        <section className="mentions-legales-page__section">
          <h2>3. Contact</h2>
          <p>Pour toute question ou réclamation, vous pouvez nous contacter :</p>
          <div className="mentions-legales-page__info-box">
            <p>
              <strong>Email :</strong>{" "}
              <a
                href="mailto:contact@oenotrac.fr"
                className="mentions-legales-page__link"
              >
                contact@oenotrac.fr
              </a>
            </p>
          </div>
        </section>

        <section className="mentions-legales-page__section">
          <h2>4. Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu de ce site (textes, images, vidéos, logos, icônes, graphismes,
            etc.) est la propriété exclusive de oenotrac ou de ses partenaires et est
            protégé par les lois françaises et internationales relatives à la propriété
            intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification, publication, adaptation de tout ou
            partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est
            interdite sans autorisation écrite préalable de oenotrac.
          </p>
        </section>

        <section className="mentions-legales-page__section">
          <h2>5. Protection des données personnelles</h2>
          <p>
            Conformément à la loi "Informatique et Libertés" du 6 janvier 1978 modifiée et au
            Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit
            d'accès, de rectification, de suppression et d'opposition aux données personnelles
            vous concernant.
          </p>
          <p>
            Pour plus d'informations, consultez notre{" "}
            <a href="/privacy" className="mentions-legales-page__link">
              Politique de Confidentialité
            </a>
            .
          </p>
        </section>

        <section className="mentions-legales-page__section">
          <h2>6. Cookies</h2>
          <p>
            Le site utilise des cookies et technologies similaires pour améliorer l'expérience
            utilisateur et mémoriser vos préférences. Pour plus d'informations détaillées sur les
            cookies utilisés et la gestion de vos préférences, consultez notre{" "}
            <a href="/cookies" className="mentions-legales-page__link">
              Politique de Cookies
            </a>
            .
          </p>
        </section>

        <section className="mentions-legales-page__section">
          <h2>7. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige et
            à défaut d'accord amiable, le litige sera porté devant les tribunaux français
            conformément aux règles de compétence en vigueur.
          </p>
        </section>
      </div>
    </div>
  );
}


import "./CookiesPage.css";

/**
 * Page d'information détaillée sur les cookies utilisés par l'application.
 * 
 * Conforme aux obligations légales françaises et européennes concernant
 * l'information des utilisateurs sur l'utilisation des cookies.
 */
export function CookiesPage() {
  return (
    <div className="cookies-page">
      <header className="cookies-page__header">
        <h1>Politique de Cookies</h1>
        <p className="cookies-page__last-update">Dernière mise à jour : Novembre 2024</p>
      </header>

      <div className="cookies-page__content">
        <section className="cookies-page__section">
          <h2>1. Qu'est-ce qu'un cookie ?</h2>
          <p>
            Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette,
            smartphone) lors de la visite d'un site web. Il permet au site de reconnaître votre
            navigateur et de mémoriser certaines informations vous concernant.
          </p>
        </section>

        <section className="cookies-page__section">
          <h2>2. Types de cookies utilisés</h2>
          
          <h3>2.1. Cookies strictement nécessaires</h3>
          <p>
            Ces cookies sont indispensables au fonctionnement du site et ne peuvent pas être désactivés.
            Ils sont généralement définis en réponse à des actions que vous effectuez et qui équivalent
            à une demande de services, comme la définition de vos préférences de confidentialité,
            la connexion ou le remplissage de formulaires.
          </p>
          <div className="cookies-page__table">
            <table>
              <thead>
                <tr>
                  <th>Nom du cookie</th>
                  <th>Finalité</th>
                  <th>Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>lv_token</code></td>
                  <td>Mémorisation du token d'authentification pour maintenir votre session</td>
                  <td>Jusqu'à la déconnexion</td>
                </tr>
                <tr>
                  <td><code>lv_cookie_consent</code></td>
                  <td>Mémorisation de votre choix concernant les cookies</td>
                  <td>13 mois</td>
                </tr>
                <tr>
                  <td><code>lv_onboarding_form</code></td>
                  <td>Sauvegarde temporaire de votre formulaire de simulation</td>
                  <td>Session</td>
                </tr>
                <tr>
                  <td><code>lv_last_simulation_result</code></td>
                  <td>Mémorisation des résultats de simulation pour navigation</td>
                  <td>Session</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2.2. Cookies de préférences</h3>
          <p>
            Ces cookies permettent au site de mémoriser vos choix (langue, région, etc.) pour vous
            offrir une expérience personnalisée.
          </p>
          <p>
            <strong>Actuellement, nous n'utilisons pas de cookies de préférences.</strong>
          </p>

          <h3>2.3. Cookies analytiques</h3>
          <p>
            Ces cookies nous permettent de comprendre comment les visiteurs utilisent notre site en
            collectant et rapportant des informations de manière anonyme.
          </p>
          <p>
            <strong>Actuellement, nous n'utilisons pas de cookies analytiques tiers.</strong>
          </p>

          <h3>2.4. Cookies de marketing</h3>
          <p>
            Ces cookies sont utilisés pour suivre les visiteurs sur différents sites web dans le but
            d'afficher des publicités pertinentes.
          </p>
          <p>
            <strong>Nous n'utilisons pas de cookies de marketing.</strong>
          </p>
        </section>

        <section className="cookies-page__section">
          <h2>3. Stockage local (localStorage / sessionStorage)</h2>
          <p>
            En plus des cookies, notre application utilise le stockage local du navigateur
            (localStorage et sessionStorage) pour :
          </p>
          <ul>
            <li>
              <strong>Authentification</strong> : stockage du token d'authentification (localStorage)
            </li>
            <li>
              <strong>Données de session</strong> : sauvegarde temporaire des données de simulation
              (sessionStorage)
            </li>
            <li>
              <strong>Préférences</strong> : mémorisation de vos choix d'interface (localStorage)
            </li>
          </ul>
          <p>
            Ces données sont stockées uniquement sur votre appareil et ne sont pas transmises à des
            tiers.
          </p>
        </section>

        <section className="cookies-page__section">
          <h2>4. Gestion de vos préférences</h2>
          <p>
            Vous pouvez à tout moment modifier ou retirer votre consentement concernant les cookies
            en :
          </p>
          <ul>
            <li>
              Supprimant les cookies de votre navigateur via les paramètres de celui-ci
            </li>
            <li>
              Supprimant les données de localStorage et sessionStorage via les outils de développement
              de votre navigateur
            </li>
            <li>
              Nous contactant à{" "}
              <a href="mailto:contact@oenotrac.fr" className="cookies-page__link">
                contact@oenotrac.fr
              </a>
            </li>
          </ul>
          <div className="cookies-page__warning">
            <p>
              <strong>Note importante :</strong> La suppression des cookies strictement nécessaires
              (notamment le token d'authentification) peut affecter le fonctionnement de certaines
              fonctionnalités du site, notamment la connexion à votre compte.
            </p>
          </div>
        </section>

        <section className="cookies-page__section">
          <h2>5. Paramétrage de votre navigateur</h2>
          <p>
            Vous pouvez configurer votre navigateur pour refuser les cookies. Voici les liens vers
            les pages d'aide des principaux navigateurs :
          </p>
          <ul>
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
                className="cookies-page__link"
              >
                Google Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/fr/kb/activer-desactiver-cookies-preferences"
                target="_blank"
                rel="noopener noreferrer"
                className="cookies-page__link"
              >
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
                className="cookies-page__link"
              >
                Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
                className="cookies-page__link"
              >
                Microsoft Edge
              </a>
            </li>
          </ul>
        </section>

        <section className="cookies-page__section">
          <h2>6. Contact</h2>
          <p>
            Pour toute question concernant notre utilisation des cookies, vous pouvez nous contacter
            à :
          </p>
          <div className="cookies-page__info-box">
            <p>
              <strong>Email :</strong>{" "}
              <a href="mailto:contact@oenotrac.fr" className="cookies-page__link">
                contact@oenotrac.fr
              </a>
            </p>
            <p>
              <strong>Adresse :</strong> 74 rue Romain Rolland, 93260 Les Lilas, France
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}


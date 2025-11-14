import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CookieBanner.css";

/**
 * Bannière de consentement aux cookies conforme à la législation française.
 * 
 * Affiche une bannière pour obtenir le consentement de l'utilisateur avant
 * l'utilisation de cookies non essentiels. Le consentement est stocké dans
 * localStorage pour éviter de redemander à chaque visite.
 */
export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si le consentement a déjà été donné
    const consent = localStorage.getItem("lv_cookie_consent");
    if (!consent) {
      // Afficher la bannière après un court délai pour une meilleure UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("lv_cookie_consent", "accepted");
    localStorage.setItem("lv_cookie_consent_date", new Date().toISOString());
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem("lv_cookie_consent", "rejected");
    localStorage.setItem("lv_cookie_consent_date", new Date().toISOString());
    // Supprimer les cookies non essentiels si rejetés
    // Note: localStorage est utilisé pour l'authentification, donc on le garde
    // mais on pourrait désactiver d'autres fonctionnalités si nécessaire
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-banner-title">
      <div className="cookie-banner__content">
        <div className="cookie-banner__text">
          <h3 id="cookie-banner-title">Gestion des cookies</h3>
          <p>
            Ce site utilise des cookies et technologies similaires pour améliorer votre expérience,
            analyser l'utilisation du site et mémoriser vos préférences. En continuant à naviguer,
            vous acceptez notre utilisation des cookies.{" "}
            <Link to="/cookies" className="cookie-banner__link">
              En savoir plus
            </Link>
          </p>
        </div>
        <div className="cookie-banner__actions">
          <button
            type="button"
            onClick={handleReject}
            className="cookie-banner__button cookie-banner__button--reject"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="cookie-banner__button cookie-banner__button--accept"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}


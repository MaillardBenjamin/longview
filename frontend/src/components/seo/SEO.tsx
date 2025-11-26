/**
 * Composant SEO réutilisable pour gérer les meta tags, Open Graph et Schema.org.
 * 
 * Utilise react-helmet-async pour injecter dynamiquement les métadonnées
 * dans le <head> de la page.
 */

import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  siteName?: string;
  structuredData?: object;
}

const DEFAULT_TITLE = "LongView - Simulateur de retraite avec projections Monte Carlo";
const DEFAULT_DESCRIPTION = "Planifiez votre retraite sereinement avec LongView. Simulateur de retraite avec projections Monte Carlo, optimisation de l'épargne et analyse détaillée de votre portefeuille.";
const DEFAULT_IMAGE = "/og-image.png"; // À créer si nécessaire
const DEFAULT_URL = typeof window !== "undefined" ? window.location.origin : "https://longview.app";
const DEFAULT_SITE_NAME = "LongView";

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  siteName = DEFAULT_SITE_NAME,
  structuredData,
}: SEOProps) {
  const fullTitle = title ? `${title} - ${DEFAULT_SITE_NAME}` : DEFAULT_TITLE;
  const fullUrl = url || (typeof window !== "undefined" ? window.location.href : DEFAULT_URL);
  const fullImage = image.startsWith("http") ? image : `${DEFAULT_URL}${image}`;

  return (
    <Helmet>
      {/* Meta tags de base */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="LongView" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Structured Data (Schema.org) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

/**
 * Helper pour créer des données structurées Schema.org pour une organisation
 */
export function createOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LongView",
    url: DEFAULT_URL,
    logo: `${DEFAULT_URL}/logo.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      // Ajouter les réseaux sociaux si disponibles
    ],
  };
}

/**
 * Helper pour créer des données structurées Schema.org pour une page Web
 */
export function createWebPageSchema(title: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: description,
    url: url,
    inLanguage: "fr-FR",
    isPartOf: {
      "@type": "WebSite",
      name: DEFAULT_SITE_NAME,
      url: DEFAULT_URL,
    },
  };
}

/**
 * Helper pour créer des données structurées Schema.org pour un article/blog
 */
export function createArticleSchema(
  title: string,
  description: string,
  url: string,
  image?: string,
  datePublished?: string,
  dateModified?: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    url: url,
    image: image ? (image.startsWith("http") ? image : `${DEFAULT_URL}${image}`) : `${DEFAULT_URL}${DEFAULT_IMAGE}`,
    datePublished: datePublished || new Date().toISOString(),
    dateModified: dateModified || new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: DEFAULT_SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: DEFAULT_SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${DEFAULT_URL}/logo.png`,
      },
    },
  };
}

/**
 * Helper pour créer des données structurées Schema.org pour un service financier
 */
export function createFinancialServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: "LongView - Simulateur de retraite",
    description: DEFAULT_DESCRIPTION,
    url: DEFAULT_URL,
    provider: {
      "@type": "Organization",
      name: DEFAULT_SITE_NAME,
    },
    serviceType: "Retirement Planning",
    areaServed: {
      "@type": "Country",
      name: "France",
    },
  };
}


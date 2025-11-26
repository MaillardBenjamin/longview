import { FeatureList } from "@/components/shared/FeatureList";
import { HeroSection } from "@/components/shared/HeroSection";
import { SEO, createOrganizationSchema, createWebPageSchema } from "@/components/seo/SEO";

export function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      createOrganizationSchema(),
      createWebPageSchema(
        "LongView - Simulateur de retraite",
        "Planifiez votre retraite sereinement avec LongView. Simulateur de retraite avec projections Monte Carlo, optimisation de l'épargne et analyse détaillée de votre portefeuille.",
        typeof window !== "undefined" ? window.location.origin : "https://longview.app",
      ),
    ],
  };

  return (
    <div>
      <SEO
        title="Accueil"
        description="Planifiez votre retraite sereinement avec LongView. Simulateur de retraite avec projections Monte Carlo, optimisation de l'épargne et analyse détaillée de votre portefeuille."
        keywords="simulateur retraite, planification retraite, Monte Carlo, épargne retraite, projection financière, calcul retraite"
        structuredData={structuredData}
      />
      <HeroSection />
      <FeatureList />
    </div>
  );
}



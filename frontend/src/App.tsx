/**
 * Composant racine de l'application.
 * 
 * Définit les routes de l'application et enveloppe le contenu
 * dans le layout principal et la bannière de cookies.
 */

import { PrimaryLayout } from "@/components/layout/PrimaryLayout";
import { CookieBanner } from "@/components/shared/CookieBanner";
import { HomePage } from "@/pages/HomePage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { SimulationResultPage } from "@/pages/SimulationResultPage";
import { CGUPage } from "@/pages/CGUPage";
import { MentionsLegalesPage } from "@/pages/MentionsLegalesPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { CookiesPage } from "@/pages/CookiesPage";
import { AboutPage } from "@/pages/AboutPage";
import { Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

export default function App() {
  return (
    <PrimaryLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulation" element={<OnboardingPage />} />
        <Route path="/resultats" element={<SimulationResultPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/cgu" element={<CGUPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieBanner />
    </PrimaryLayout>
  );
}

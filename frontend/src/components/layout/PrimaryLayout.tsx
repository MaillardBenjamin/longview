import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/shared/Logo";
import "./PrimaryLayout.css";

const navLinks = [
  { to: "/", label: "Présentation" },
  { to: "/simulation", label: "Simulation" },
  { to: "/resultats", label: "Résultats" },
];

export function PrimaryLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__brand">
          <Logo />
        </div>
        <nav className="layout__nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "layout__nav-link active" : "layout__nav-link")}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="layout__auth">
          {user ? (
            <>
              <span className="layout__user">{user.fullName ?? user.email}</span>
              <button className="layout__button" onClick={logout}>
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/simulation" className="layout__button">
              Créer mon compte
            </Link>
          )}
        </div>
      </header>
      <main className="layout__main">{children}</main>
      <footer className="layout__footer">
        <p>© {new Date().getFullYear()} LongView. Anticipez votre retraite sereinement.</p>
        <nav className="layout__footer-nav">
          <Link to="/a-propos" className="layout__footer-link">
            À propos
          </Link>
          <span className="layout__footer-separator">•</span>
          <Link to="/mentions-legales" className="layout__footer-link">
            Mentions Légales
          </Link>
          <span className="layout__footer-separator">•</span>
          <Link to="/cgu" className="layout__footer-link">
            Conditions Générales d'Utilisation
          </Link>
          <span className="layout__footer-separator">•</span>
          <Link to="/privacy" className="layout__footer-link">
            Politique de Confidentialité
          </Link>
          <span className="layout__footer-separator">•</span>
          <Link to="/cookies" className="layout__footer-link">
            Cookies
          </Link>
        </nav>
      </footer>
    </div>
  );
}


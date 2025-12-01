import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IconButton, Tooltip, useTheme } from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/shared/Logo";
import { fetchProject } from "@/services/projects";
import { useThemeModeContext } from "@/providers/ThemeModeProvider";
import "./PrimaryLayout.css";

const navLinks = [
  { to: "/", label: "Présentation" },
  { to: "/simulation", label: "Simulation" },
  { to: "/resultats", label: "Résultats" },
];

export function PrimaryLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleMode } = useThemeModeContext();
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  const [currentSimulationName, setCurrentSimulationName] = useState<string | null>(null);

  // Récupérer le projet courant depuis sessionStorage
  const currentProjectId = typeof window !== "undefined" 
    ? sessionStorage.getItem("lv_current_project_id")
    : null;

  // Récupérer le projet si un ID est disponible
  const { data: currentProject } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: () => fetchProject(Number(currentProjectId!)),
    enabled: !!currentProjectId && !!user,
  });

  // Mettre à jour le nom du projet
  useEffect(() => {
    if (currentProject && user) {
      setCurrentProjectName(currentProject.name);
    } else {
      setCurrentProjectName(null);
    }
  }, [currentProject, user]);

  // Nettoyer les informations du projet/simulation quand l'utilisateur se déconnecte
  useEffect(() => {
    if (!user) {
      setCurrentProjectName(null);
      setCurrentSimulationName(null);
    }
  }, [user]);

  // Récupérer le nom de la simulation depuis sessionStorage
  useEffect(() => {
    if (!user) {
      setCurrentSimulationName(null);
      return;
    }

    const updateSimulationName = () => {
      if (typeof window !== "undefined" && user) {
        const saved = sessionStorage.getItem("lv_simulation_form_data");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            console.log("PrimaryLayout - Simulation name from sessionStorage:", parsed.name);
            if (parsed.name && parsed.name !== "Projet LongView") {
              setCurrentSimulationName(parsed.name);
            } else {
              setCurrentSimulationName(null);
            }
          } catch (error) {
            console.error("PrimaryLayout - Error parsing simulation data:", error);
            setCurrentSimulationName(null);
          }
        } else {
          setCurrentSimulationName(null);
        }
      } else {
        setCurrentSimulationName(null);
      }
    };

    updateSimulationName();
    
    // Écouter les changements via CustomEvent (même onglet)
    const handleFormDataChange = () => {
      if (user) {
        updateSimulationName();
      }
    };
    
    // Écouter les changements dans sessionStorage (autres onglets)
    const handleStorageChange = () => {
      if (user) {
        updateSimulationName();
      }
    };
    
    window.addEventListener("simulationFormDataChanged", handleFormDataChange);
    window.addEventListener("storage", handleStorageChange);
    // Vérifier périodiquement (backup)
    const interval = setInterval(() => {
      if (user) {
        updateSimulationName();
      }
    }, 2000);
    
    return () => {
      window.removeEventListener("simulationFormDataChanged", handleFormDataChange);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [user, location.pathname]); // Se déclencher aussi quand la route change

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className={`layout layout--${mode}`}>
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
        {(currentProjectName || currentSimulationName) && (
          <div className="layout__context">
            {currentProjectName && (
              <span className="layout__context-item">
                <span className="layout__context-label">Projet:</span>
                <span className="layout__context-value">{currentProjectName}</span>
              </span>
            )}
            {currentSimulationName && (
              <span className="layout__context-item">
                <span className="layout__context-label">Simulation:</span>
                <span className="layout__context-value">{currentSimulationName}</span>
              </span>
            )}
          </div>
        )}
        <div className="layout__auth">
          <Tooltip title={mode === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}>
            <IconButton
              onClick={toggleMode}
              sx={{
                color: mode === "dark" ? "#f8fafc" : "#0f172a",
                marginRight: user ? "1rem" : "0.5rem",
                "&:hover": {
                  backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                },
              }}
              aria-label="Basculer le mode sombre/clair"
            >
              {mode === "dark" ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
          {user ? (
            <>
              <Link to="/projects" className="layout__nav-link" style={{ marginRight: "1rem" }}>
                Mes projets
              </Link>
              <div
                ref={menuRef}
                style={{ position: "relative", display: "inline-block" }}
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <span
                  className="layout__user"
                  style={{
                    cursor: "pointer",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.palette.action.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {user.fullName ?? user.email}
                </span>
                {menuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "0.5rem",
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: "8px",
                      boxShadow: theme.shadows[4],
                      minWidth: "200px",
                      zIndex: 1000,
                      overflow: "hidden",
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Link
                      to="/profile"
                      style={{
                        display: "block",
                        padding: "0.75rem 1rem",
                        textDecoration: "none",
                        color: theme.palette.text.primary,
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.palette.action.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.palette.background.paper;
                      }}
                      onClick={() => setMenuOpen(false)}
                    >
                      Mon profil
                    </Link>
                    <div
                      style={{
                        height: "1px",
                        backgroundColor: theme.palette.divider,
                        margin: "0.25rem 0",
                      }}
                    />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        navigate("/");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        backgroundColor: "transparent",
                        color: "#d32f2f",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background-color 0.2s",
                        fontFamily: "inherit",
                        fontSize: "inherit",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.palette.mode === "dark" 
                          ? "rgba(211, 47, 47, 0.2)" 
                          : "#ffebee";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="layout__button" style={{ marginRight: "0.5rem" }}>
                Connexion
              </Link>
              <Link to="/register" className="layout__button">
                Créer un compte
              </Link>
            </>
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


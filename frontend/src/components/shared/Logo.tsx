import { Link } from "react-router-dom";
import "./Logo.css";

interface LogoProps {
  showText?: boolean;
  size?: "small" | "medium" | "large";
}

export function Logo({ showText = true, size = "medium" }: LogoProps) {
  return (
    <Link to="/" className={`logo logo--${size}`}>
      <svg
        className="logo__icon"
        viewBox="0 0 80 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoBlueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#38bdf8", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#0ea5e9", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Télescope stylisé - design simple et reconnaissable en bleu */}
        {/* Tube principal (horizontal) */}
        <rect x="10" y="18" width="50" height="4" rx="2" fill="url(#logoBlueGradient)"/>
        
        {/* Oculaire (petit cercle à gauche) */}
        <circle cx="12" cy="20" r="3" fill="url(#logoBlueGradient)"/>
        <circle cx="12" cy="20" r="1.5" fill="white" opacity="0.4"/>
        
        {/* Objectif (grand cercle à droite) */}
        <circle cx="58" cy="20" r="6" fill="url(#logoBlueGradient)"/>
        <circle cx="58" cy="20" r="4" fill="white" opacity="0.3"/>
        <circle cx="58" cy="20" r="2" fill="white" opacity="0.2"/>
        
        {/* Support/trépied (base) */}
        <path d="M 36 22 L 40 26 L 44 22 Z" fill="url(#logoBlueGradient)" opacity="0.7"/>
        <line x1="40" y1="26" x2="40" y2="28" stroke="url(#logoBlueGradient)" strokeWidth="1" opacity="0.5"/>
      </svg>
      {showText && <span className="logo__text">LongView</span>}
    </Link>
  );
}

